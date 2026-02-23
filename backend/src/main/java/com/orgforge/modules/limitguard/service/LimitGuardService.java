package com.orgforge.modules.limitguard.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.modules.limitguard.dto.LimitDataDTO;
import com.orgforge.modules.limitguard.model.LimitAlert;
import com.orgforge.modules.limitguard.model.LimitSnapshot;
import com.orgforge.modules.limitguard.repository.LimitAlertRepository;
import com.orgforge.modules.limitguard.repository.LimitSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LimitGuardService {

    private final RestApiClient restApi;
    private final LimitSnapshotRepository snapshotRepo;
    private final LimitAlertRepository alertRepo;
    private final OrgConnectionRepository orgRepo;

    @Cacheable(value = "limits", key = "#orgId")
    public List<LimitDataDTO> getLimits(String orgId) {
        OrgConnection org = orgRepo.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        String limitsUrl = org.getInstanceUrl()
                + "/services/data/v" + org.getApiVersion() + "/limits/";

        Map<?, ?> rawLimits = restApi.get(org, limitsUrl);
        if (rawLimits == null || rawLimits.isEmpty()) {
            return Collections.emptyList();
        }

        List<LimitDataDTO> results = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<?, ?> entry : rawLimits.entrySet()) {
            String limitName = String.valueOf(entry.getKey());
            Object value = entry.getValue();

            if (!(value instanceof Map<?, ?> limitMap)) continue;

            Object maxObj = limitMap.get("Max");
            Object remainingObj = limitMap.get("Remaining");

            if (maxObj == null || remainingObj == null) continue;

            long max;
            long remaining;
            try {
                max = ((Number) maxObj).longValue();
                remaining = ((Number) remainingObj).longValue();
            } catch (ClassCastException e) {
                log.warn("Could not parse limit values for {}: {}", limitName, e.getMessage());
                continue;
            }

            if (max <= 0) continue;

            long used = max - remaining;
            double pct = ((double) used / max) * 100.0;
            double pctRounded = Math.round(pct * 100.0) / 100.0;
            String limitType = classifyLimitType(limitName);
            String status = LimitDataDTO.resolveStatus(pctRounded);

            // Forecast exhaustion using last 5 snapshots
            LocalDateTime forecastedExhaustionAt = forecastExhaustion(orgId, limitName, pctRounded, now);

            // Save snapshot
            LimitSnapshot snapshot = LimitSnapshot.builder()
                    .orgId(orgId)
                    .limitName(limitName)
                    .limitType(limitType)
                    .used(used)
                    .total(max)
                    .percentage(BigDecimal.valueOf(pctRounded).setScale(2, RoundingMode.HALF_UP))
                    .forecastedExhaustionAt(forecastedExhaustionAt)
                    .snapshotAt(now)
                    .build();
            snapshotRepo.save(snapshot);

            results.add(new LimitDataDTO(
                    limitName,
                    limitType,
                    used,
                    max,
                    pctRounded,
                    status,
                    forecastedExhaustionAt
            ));
        }

        results.sort(Comparator.comparingDouble(LimitDataDTO::percentage).reversed());
        return results;
    }

    @CacheEvict(value = "limits", key = "#orgId")
    public void saveAlertConfig(String orgId, String limitName, double thresholdPct, String notifyEmail) {
        LimitAlert alert = alertRepo.findByOrgIdAndLimitName(orgId, limitName)
                .orElse(LimitAlert.builder()
                        .orgId(orgId)
                        .limitName(limitName)
                        .createdAt(LocalDateTime.now())
                        .build());

        alert.setThresholdPct(BigDecimal.valueOf(thresholdPct).setScale(2, RoundingMode.HALF_UP));
        alert.setNotifyEmail(notifyEmail);
        alert.setActive(true);
        alertRepo.save(alert);
    }

    public List<LimitAlert> getAlerts(String orgId) {
        return alertRepo.findByOrgIdAndIsActiveTrue(orgId);
    }

    public List<LimitSnapshot> getHistory(String orgId, String limitName, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return snapshotRepo.findByOrgIdAndSnapshotAtAfterOrderBySnapshotAtDesc(orgId, since)
                .stream()
                .filter(s -> s.getLimitName().equals(limitName))
                .collect(Collectors.toList());
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private LocalDateTime forecastExhaustion(String orgId, String limitName, double currentPct, LocalDateTime now) {
        if (currentPct <= 0) return null;
        if (currentPct >= 100) return now;

        List<LimitSnapshot> history = snapshotRepo.findTop5ByOrgIdAndLimitNameOrderBySnapshotAtDesc(orgId, limitName);
        if (history.size() < 2) return null;

        // Simple linear regression: x = epochSeconds, y = percentage
        int n = history.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (LimitSnapshot s : history) {
            double x = s.getSnapshotAt().toEpochSecond(java.time.ZoneOffset.UTC);
            double y = s.getPercentage().doubleValue();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        double denominator = (n * sumX2 - sumX * sumX);
        if (Math.abs(denominator) < 1e-9) return null;

        double slope = (n * sumXY - sumX * sumY) / denominator;
        if (slope <= 0) return null; // usage is stable or decreasing

        double intercept = (sumY - slope * sumX) / n;
        double nowEpoch = now.toEpochSecond(java.time.ZoneOffset.UTC);

        // Solve for x when y = 100
        double exhaustionEpoch = (100.0 - intercept) / slope;
        if (exhaustionEpoch <= nowEpoch) return null;

        long secondsUntilExhaustion = (long) (exhaustionEpoch - nowEpoch);
        // Cap at 1 year to avoid absurd forecasts
        if (secondsUntilExhaustion > 365L * 24 * 3600) return null;

        return now.plusSeconds(secondsUntilExhaustion);
    }

    private String classifyLimitType(String limitName) {
        String upper = limitName.toUpperCase();
        if (upper.contains("API") || upper.contains("CALLOUT")) return "API";
        if (upper.contains("APEX") || upper.contains("CODE")) return "APEX";
        if (upper.contains("STORAGE") || upper.contains("DATA") || upper.contains("FILE")) return "STORAGE";
        if (upper.contains("EMAIL")) return "EMAIL";
        if (upper.contains("FLOW") || upper.contains("PROCESS")) return "AUTOMATION";
        if (upper.contains("QUERY") || upper.contains("SOQL") || upper.contains("SOSL")) return "QUERY";
        if (upper.contains("ASYNC") || upper.contains("BATCH") || upper.contains("QUEUEABLE")) return "ASYNC";
        return "GENERAL";
    }
}
