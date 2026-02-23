package com.orgforge.modules.orglens.controller;

import com.orgforge.modules.orglens.model.DeadCodeItem;
import com.orgforge.modules.orglens.model.OrgDependency;
import com.orgforge.modules.orglens.model.OrgHealthScore;
import com.orgforge.modules.orglens.repository.OrgHealthScoreRepository;
import com.orgforge.modules.orglens.service.OrgLensService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for the OrgLens module.
 * Base path: {@code /api/org-lens}
 *
 * <p>All mutating endpoints that interact with Salesforce accept {@code orgId} as a
 * mandatory query parameter so any connected org can be addressed without a
 * session-scoped auth service.
 */
@Slf4j
@RestController
@RequestMapping("/api/org-lens")
@RequiredArgsConstructor
public class OrgLensController {

    private final OrgLensService orgLensService;
    private final OrgHealthScoreRepository healthScoreRepository;

    // -------------------------------------------------------------------------
    // Health
    // -------------------------------------------------------------------------

    /**
     * GET /api/org-lens/health?orgId=...
     * Runs a full health analysis against Salesforce and persists + returns the result.
     */
    @GetMapping("/health")
    public ResponseEntity<OrgHealthScore> analyzeHealth(@RequestParam String orgId) {
        return ResponseEntity.ok(orgLensService.analyzeOrgHealth(orgId));
    }

    /**
     * GET /api/org-lens/health/history?orgId=...
     * Returns the 10 most recent health scores for the given org.
     */
    @GetMapping("/health/history")
    public ResponseEntity<List<OrgHealthScore>> getHealthHistory(@RequestParam String orgId) {
        return ResponseEntity.ok(healthScoreRepository.findTop10ByOrgIdOrderByScoredAtDesc(orgId));
    }

    // -------------------------------------------------------------------------
    // Dead Code
    // -------------------------------------------------------------------------

    /**
     * GET /api/org-lens/dead-code?orgId=...
     * Queries Salesforce for stale / zero-coverage Apex and inactive Flows.
     */
    @GetMapping("/dead-code")
    public ResponseEntity<List<DeadCodeItem>> detectDeadCode(@RequestParam String orgId) {
        return ResponseEntity.ok(orgLensService.detectDeadCode(orgId));
    }

    /**
     * POST /api/org-lens/dead-code/{id}/review?orgId=...
     * Marks a dead code item as reviewed.
     * Body: { "reviewedBy": "username" }
     */
    @PostMapping("/dead-code/{id}/review")
    public ResponseEntity<Map<String, Object>> markReviewed(
            @PathVariable Long id,
            @RequestParam String orgId,
            @RequestBody Map<String, String> body) {
        String reviewedBy = body.getOrDefault("reviewedBy", "unknown");
        orgLensService.markReviewed(id, reviewedBy);
        return ResponseEntity.ok(Map.of("id", id, "reviewed", true, "reviewedBy", reviewedBy));
    }

    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    /**
     * GET /api/org-lens/dependencies?orgId=...
     * Fetches metadata component dependencies from Salesforce Tooling API.
     */
    @GetMapping("/dependencies")
    public ResponseEntity<List<OrgDependency>> getDependencies(@RequestParam String orgId) {
        return ResponseEntity.ok(orgLensService.getDependencies(orgId));
    }
}
