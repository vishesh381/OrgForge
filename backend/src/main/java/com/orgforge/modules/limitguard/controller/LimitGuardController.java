package com.orgforge.modules.limitguard.controller;

import com.orgforge.modules.limitguard.dto.LimitDataDTO;
import com.orgforge.modules.limitguard.model.LimitAlert;
import com.orgforge.modules.limitguard.model.LimitSnapshot;
import com.orgforge.modules.limitguard.service.LimitGuardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/limit-guard")
@RequiredArgsConstructor
public class LimitGuardController {

    private final LimitGuardService service;

    /**
     * GET /api/limit-guard?orgId=...
     * Returns current Salesforce org limits with usage percentages and forecasts.
     */
    @GetMapping
    public ResponseEntity<List<LimitDataDTO>> getLimits(@RequestParam String orgId) {
        log.debug("Fetching limits for org: {}", orgId);
        return ResponseEntity.ok(service.getLimits(orgId));
    }

    /**
     * GET /api/limit-guard/history?orgId=...&limitName=...&days=7
     * Returns historical snapshots for a specific limit over the last N days.
     */
    @GetMapping("/history")
    public ResponseEntity<List<LimitSnapshot>> getHistory(
            @RequestParam String orgId,
            @RequestParam String limitName,
            @RequestParam(defaultValue = "7") int days) {
        log.debug("Fetching history for org: {}, limit: {}, days: {}", orgId, limitName, days);
        return ResponseEntity.ok(service.getHistory(orgId, limitName, days));
    }

    /**
     * GET /api/limit-guard/alerts?orgId=...
     * Returns active alert configurations for the org.
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<LimitAlert>> getAlerts(@RequestParam String orgId) {
        return ResponseEntity.ok(service.getAlerts(orgId));
    }

    /**
     * POST /api/limit-guard/alerts?orgId=...
     * Creates or updates a threshold alert for a specific limit.
     */
    @PostMapping("/alerts")
    public ResponseEntity<Void> saveAlert(
            @RequestParam String orgId,
            @RequestBody AlertConfigRequest req) {
        service.saveAlertConfig(orgId, req.limitName(), req.thresholdPct(), req.notifyEmail());
        return ResponseEntity.ok().build();
    }

    public record AlertConfigRequest(
            String limitName,
            double thresholdPct,
            String notifyEmail
    ) {}
}
