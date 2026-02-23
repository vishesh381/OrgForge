package com.orgforge.modules.permissionpilot.controller;

import com.orgforge.modules.permissionpilot.model.PermissionComparison;
import com.orgforge.modules.permissionpilot.model.PermissionSnapshot;
import com.orgforge.modules.permissionpilot.model.PermissionViolation;
import com.orgforge.modules.permissionpilot.repository.PermissionComparisonRepository;
import com.orgforge.modules.permissionpilot.repository.PermissionViolationRepository;
import com.orgforge.modules.permissionpilot.service.PermissionPilotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/permission-pilot")
@RequiredArgsConstructor
public class PermissionPilotController {

    private final PermissionPilotService service;
    private final PermissionComparisonRepository comparisonRepo;
    private final PermissionViolationRepository violationRepo;

    /**
     * GET /api/permission-pilot/profiles?orgId=...
     * Returns combined list of Profiles and custom Permission Sets from Salesforce.
     */
    @GetMapping("/profiles")
    public ResponseEntity<List<Map<String, Object>>> getProfiles(@RequestParam String orgId) {
        log.debug("Fetching profiles for org: {}", orgId);
        return ResponseEntity.ok(service.getProfiles(orgId));
    }

    /**
     * POST /api/permission-pilot/snapshot?orgId=...&profileId=...&profileName=...
     * Takes an object-permission snapshot for a given profile/permission-set.
     */
    @PostMapping("/snapshot")
    public ResponseEntity<PermissionSnapshot> snapshotProfile(
            @RequestParam String orgId,
            @RequestParam String profileId,
            @RequestParam String profileName) {
        log.debug("Taking snapshot for org: {}, profile: {}", orgId, profileName);
        return ResponseEntity.ok(service.snapshotProfile(orgId, profileId, profileName));
    }

    /**
     * GET /api/permission-pilot/comparisons?orgId=...
     * Returns all saved profile comparisons for the org, newest first.
     */
    @GetMapping("/comparisons")
    public ResponseEntity<List<PermissionComparison>> getComparisons(@RequestParam String orgId) {
        log.debug("Fetching comparisons for org: {}", orgId);
        return ResponseEntity.ok(comparisonRepo.findByOrgIdOrderByCreatedAtDesc(orgId));
    }

    /**
     * POST /api/permission-pilot/compare?orgId=...&profileA=...&profileB=...&comparedBy=...
     * Compares two profiles using their latest snapshots and saves the diff.
     */
    @PostMapping("/compare")
    public ResponseEntity<PermissionComparison> compareProfiles(
            @RequestParam String orgId,
            @RequestParam String profileA,
            @RequestParam String profileB,
            @RequestParam(defaultValue = "system") String comparedBy) {
        log.debug("Comparing profiles {} vs {} for org: {}", profileA, profileB, orgId);
        return ResponseEntity.ok(service.compareProfiles(orgId, profileA, profileB, comparedBy));
    }

    /**
     * GET /api/permission-pilot/violations?orgId=...
     * Returns all saved violations for the org, newest first.
     */
    @GetMapping("/violations")
    public ResponseEntity<List<PermissionViolation>> getViolations(@RequestParam String orgId) {
        log.debug("Fetching violations for org: {}", orgId);
        return ResponseEntity.ok(violationRepo.findByOrgIdOrderByDetectedAtDesc(orgId));
    }

    /**
     * POST /api/permission-pilot/detect-violations?orgId=...
     * Runs violation detection against Salesforce and returns new violations.
     */
    @PostMapping("/detect-violations")
    public ResponseEntity<List<PermissionViolation>> detectViolations(@RequestParam String orgId) {
        log.info("Running violation detection for org: {}", orgId);
        return ResponseEntity.ok(service.detectViolations(orgId));
    }

    /**
     * POST /api/permission-pilot/violations/{id}/acknowledge
     * Marks a violation as acknowledged so it no longer appears in the active list.
     */
    @PostMapping("/violations/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeViolation(@PathVariable Long id) {
        log.debug("Acknowledging violation: {}", id);
        service.acknowledgeViolation(id);
        return ResponseEntity.ok().build();
    }
}
