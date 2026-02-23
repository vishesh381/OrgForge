package com.orgforge.modules.orglens.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.ToolingApiClient;
import com.orgforge.modules.orglens.model.DeadCodeItem;
import com.orgforge.modules.orglens.model.OrgDependency;
import com.orgforge.modules.orglens.model.OrgHealthScore;
import com.orgforge.modules.orglens.repository.DeadCodeItemRepository;
import com.orgforge.modules.orglens.repository.OrgDependencyRepository;
import com.orgforge.modules.orglens.repository.OrgHealthScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrgLensService {

    private final OrgConnectionRepository orgConnectionRepository;
    private final OrgHealthScoreRepository healthScoreRepository;
    private final DeadCodeItemRepository deadCodeItemRepository;
    private final OrgDependencyRepository orgDependencyRepository;
    private final ToolingApiClient toolingApiClient;

    // -------------------------------------------------------------------------
    // Org resolution
    // -------------------------------------------------------------------------

    private OrgConnection resolveOrg(String orgId) {
        return orgConnectionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active OrgConnection found for orgId: " + orgId));
    }

    // -------------------------------------------------------------------------
    // Health Analysis
    // -------------------------------------------------------------------------

    @Cacheable(value = "orgHealth", key = "#orgId")
    public OrgHealthScore analyzeOrgHealth(String orgId) {
        OrgConnection org = resolveOrg(orgId);
        log.info("Analyzing org health for orgId={}", orgId);

        int totalApexClasses = queryCount(org, "SELECT COUNT() FROM ApexClass");
        int activeFlows      = queryCount(org, "SELECT COUNT() FROM Flow WHERE Status='Active'");
        int totalFlows       = queryCount(org, "SELECT COUNT() FROM Flow");
        int profileCount     = queryCount(org, "SELECT COUNT() FROM Profile");
        int customObjectCount= queryCount(org, "SELECT COUNT() FROM CustomObject");
        int permSetCount     = queryCount(org, "SELECT COUNT() FROM PermissionSet WHERE IsOwnedByProfile=false");

        int metadataCount = totalApexClasses + totalFlows + customObjectCount + profileCount + permSetCount;

        // apex_score: based on average code coverage percentage
        // We approximate by querying ApexCodeCoverageAggregate
        BigDecimal apexScore = computeApexScore(org, totalApexClasses);

        // flow_score: ratio of active vs total flows (100 = all active, 0 = all inactive)
        BigDecimal flowScore;
        if (totalFlows == 0) {
            flowScore = BigDecimal.valueOf(75); // neutral score when no flows exist
        } else {
            double activeRatio = (double) activeFlows / totalFlows;
            // Penalise for many inactive flows; a high active ratio is good
            flowScore = BigDecimal.valueOf(activeRatio * 100).setScale(2, RoundingMode.HALF_UP);
        }

        // permission_score: lower complexity (fewer profiles + perm sets) is better
        // Baseline: ≤5 profiles+perm sets → 100, every extra drops by 2 points
        int complexityUnits = profileCount + permSetCount;
        double permRaw = Math.max(0, 100 - Math.max(0, complexityUnits - 5) * 2.0);
        BigDecimal permissionScore = BigDecimal.valueOf(permRaw).setScale(2, RoundingMode.HALF_UP);

        // data_score: placeholder — a real implementation would query record counts,
        // duplicate rules and data quality. We default to 80 so the dashboard renders.
        BigDecimal dataScore = BigDecimal.valueOf(80.00).setScale(2, RoundingMode.HALF_UP);

        // overall = weighted average
        BigDecimal overall = apexScore
                .multiply(BigDecimal.valueOf(0.35))
                .add(flowScore.multiply(BigDecimal.valueOf(0.25)))
                .add(permissionScore.multiply(BigDecimal.valueOf(0.20)))
                .add(dataScore.multiply(BigDecimal.valueOf(0.20)))
                .setScale(2, RoundingMode.HALF_UP);

        OrgHealthScore score = OrgHealthScore.builder()
                .orgId(orgId)
                .overallScore(overall)
                .apexScore(apexScore)
                .flowScore(flowScore)
                .permissionScore(permissionScore)
                .dataScore(dataScore)
                .metadataCount(metadataCount)
                .scoredAt(LocalDateTime.now())
                .build();

        return healthScoreRepository.save(score);
    }

    private BigDecimal computeApexScore(OrgConnection org, int totalApexClasses) {
        if (totalApexClasses == 0) {
            return BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP);
        }
        try {
            // Query aggregate coverage for all non-test classes
            String soql = "SELECT NumLinesCovered, NumLinesUncovered FROM ApexCodeCoverageAggregate LIMIT 500";
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) toolingApiClient.query(org, soql);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("records");
            if (records == null || records.isEmpty()) {
                return BigDecimal.valueOf(50.00).setScale(2, RoundingMode.HALF_UP);
            }
            long covered   = 0;
            long uncovered = 0;
            for (Map<String, Object> r : records) {
                covered   += toLong(r.get("NumLinesCovered"));
                uncovered += toLong(r.get("NumLinesUncovered"));
            }
            long total = covered + uncovered;
            if (total == 0) return BigDecimal.valueOf(50.00).setScale(2, RoundingMode.HALF_UP);
            double pct = (double) covered / total * 100.0;
            return BigDecimal.valueOf(pct).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("Could not fetch apex coverage for orgId={}: {}", "unknown", e.getMessage());
            return BigDecimal.valueOf(50.00).setScale(2, RoundingMode.HALF_UP);
        }
    }

    // -------------------------------------------------------------------------
    // Dead Code Detection
    // -------------------------------------------------------------------------

    @CachePut(value = "deadCode", key = "#orgId")
    public List<DeadCodeItem> detectDeadCode(String orgId) {
        OrgConnection org = resolveOrg(orgId);
        log.info("Detecting dead code for orgId={}", orgId);

        List<DeadCodeItem> items = new ArrayList<>();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);

        // --- Stale Apex Classes with zero coverage ---
        try {
            String apexSoql = "SELECT Id, Name, NamespacePrefix, LastModifiedDate "
                    + "FROM ApexClass WHERE Status='Active' LIMIT 200";
            @SuppressWarnings("unchecked")
            Map<String, Object> apexResult = (Map<String, Object>) toolingApiClient.query(org, apexSoql);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> apexRecords = (List<Map<String, Object>>) apexResult.get("records");

            if (apexRecords != null) {
                // Get zero-coverage class IDs
                String coverSoql = "SELECT ApexClassOrTriggerId FROM ApexCodeCoverageAggregate "
                        + "WHERE NumLinesCovered=0 LIMIT 500";
                @SuppressWarnings("unchecked")
                Map<String, Object> coverResult = (Map<String, Object>) toolingApiClient.query(org, coverSoql);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> coverRecords = (List<Map<String, Object>>) coverResult.get("records");
                java.util.Set<String> zeroCoverageIds = new java.util.HashSet<>();
                if (coverRecords != null) {
                    for (Map<String, Object> cr : coverRecords) {
                        Object cid = cr.get("ApexClassOrTriggerId");
                        if (cid != null) zeroCoverageIds.add(cid.toString());
                    }
                }

                for (Map<String, Object> r : apexRecords) {
                    String id = (String) r.get("Id");
                    String lastModStr = (String) r.get("LastModifiedDate");
                    LocalDateTime lastMod = parseDateTime(lastModStr);
                    boolean stale = lastMod != null && lastMod.isBefore(cutoff);
                    boolean zeroCoverage = zeroCoverageIds.contains(id);

                    if (stale || zeroCoverage) {
                        items.add(DeadCodeItem.builder()
                                .orgId(orgId)
                                .componentType("ApexClass")
                                .componentName((String) r.get("Name"))
                                .apiName((String) r.get("Name"))
                                .namespace((String) r.get("NamespacePrefix"))
                                .lastModified(lastMod)
                                .isReviewed(false)
                                .detectedAt(LocalDateTime.now())
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not query Apex classes for dead code: {}", e.getMessage());
        }

        // --- Inactive Flows ---
        try {
            String flowSoql = "SELECT Id, MasterLabel, Status, LastModifiedDate "
                    + "FROM Flow WHERE Status='Obsolete' OR Status='Draft' LIMIT 200";
            @SuppressWarnings("unchecked")
            Map<String, Object> flowResult = (Map<String, Object>) toolingApiClient.query(org, flowSoql);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> flowRecords = (List<Map<String, Object>>) flowResult.get("records");

            if (flowRecords != null) {
                for (Map<String, Object> r : flowRecords) {
                    items.add(DeadCodeItem.builder()
                            .orgId(orgId)
                            .componentType("Flow")
                            .componentName((String) r.get("MasterLabel"))
                            .apiName((String) r.get("MasterLabel"))
                            .namespace(null)
                            .lastModified(parseDateTime((String) r.get("LastModifiedDate")))
                            .isReviewed(false)
                            .detectedAt(LocalDateTime.now())
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Could not query Flows for dead code: {}", e.getMessage());
        }

        // Persist — delete previous unreviewed items for this org and save fresh ones
        List<DeadCodeItem> existing = deadCodeItemRepository.findByOrgIdAndIsReviewedFalse(orgId);
        deadCodeItemRepository.deleteAll(existing);
        return deadCodeItemRepository.saveAll(items);
    }

    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    @Cacheable(value = "orgDependencies", key = "#orgId")
    public List<OrgDependency> getDependencies(String orgId) {
        OrgConnection org = resolveOrg(orgId);
        log.info("Fetching dependencies for orgId={}", orgId);

        List<OrgDependency> dependencies = new ArrayList<>();
        try {
            String soql = "SELECT MetadataComponentName, MetadataComponentType, "
                    + "RefMetadataComponentName, RefMetadataComponentType "
                    + "FROM MetadataComponentDependency LIMIT 200";
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) toolingApiClient.query(org, soql);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("records");

            if (records != null) {
                for (Map<String, Object> r : records) {
                    dependencies.add(OrgDependency.builder()
                            .orgId(orgId)
                            .sourceName((String) r.get("MetadataComponentName"))
                            .sourceType((String) r.get("MetadataComponentType"))
                            .targetName((String) r.get("RefMetadataComponentName"))
                            .targetType((String) r.get("RefMetadataComponentType"))
                            .dependencyType("reference")
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch MetadataComponentDependency for orgId={}: {}", orgId, e.getMessage());
        }

        // Persist — replace all existing dependencies for this org
        List<OrgDependency> existing = orgDependencyRepository.findByOrgId(orgId);
        orgDependencyRepository.deleteAll(existing);
        return orgDependencyRepository.saveAll(dependencies);
    }

    // -------------------------------------------------------------------------
    // Review management
    // -------------------------------------------------------------------------

    public void markReviewed(Long itemId, String reviewedBy) {
        DeadCodeItem item = deadCodeItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("DeadCodeItem not found: " + itemId));
        item.setReviewed(true);
        item.setReviewedBy(reviewedBy);
        deadCodeItemRepository.save(item);
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private int queryCount(OrgConnection org, String soql) {
        try {
            Map<String, Object> result = (Map<String, Object>) toolingApiClient.query(org, soql);
            Object size = result.get("totalSize");
            if (size == null) size = result.get("size");
            return size != null ? ((Number) size).intValue() : 0;
        } catch (Exception e) {
            log.warn("COUNT query failed [{}]: {}", soql, e.getMessage());
            return 0;
        }
    }

    private long toLong(Object val) {
        if (val == null) return 0L;
        return ((Number) val).longValue();
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Salesforce returns ISO-8601, e.g. "2024-01-15T12:30:00.000+0000"
            return LocalDateTime.parse(raw.substring(0, 19),
                    java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        } catch (Exception e) {
            return null;
        }
    }
}
