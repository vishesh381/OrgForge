package com.orgforge.modules.apexpulse.controller;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.modules.apexpulse.dto.ApexTestClassDTO;
import com.orgforge.modules.apexpulse.dto.CodeCoverageDTO;
import com.orgforge.modules.apexpulse.dto.OrgStatsDTO;
import com.orgforge.modules.apexpulse.dto.TestResultDTO;
import com.orgforge.modules.apexpulse.dto.TestRunRequest;
import com.orgforge.modules.apexpulse.model.CoverageSnapshot;
import com.orgforge.modules.apexpulse.model.TestResult;
import com.orgforge.modules.apexpulse.model.TestRun;
import com.orgforge.modules.apexpulse.repository.CoverageSnapshotRepository;
import com.orgforge.modules.apexpulse.repository.TestResultRepository;
import com.orgforge.modules.apexpulse.service.SalesforceToolingService;
import com.orgforge.modules.apexpulse.service.TestExecutionService;
import com.orgforge.modules.apexpulse.service.TestHistoryService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Consolidated controller for the ApexPulse module.
 * Merges the functionality of the original TestRunController and TestHistoryController
 * under the unified base path {@code /api/apex-pulse/}.
 *
 * <p>Every endpoint accepts {@code orgId} as a query parameter. The controller
 * resolves the corresponding {@link OrgConnection} from the repository and passes
 * it to the service layer — no session-scoped auth service is required.
 */
@RestController
@RequestMapping("/api/apex-pulse")
public class ApexPulseController {

    private final SalesforceToolingService toolingService;
    private final TestExecutionService executionService;
    private final TestHistoryService historyService;
    private final TestResultRepository testResultRepository;
    private final CoverageSnapshotRepository coverageSnapshotRepository;
    private final OrgConnectionRepository orgConnectionRepository;

    public ApexPulseController(SalesforceToolingService toolingService,
                               TestExecutionService executionService,
                               TestHistoryService historyService,
                               TestResultRepository testResultRepository,
                               CoverageSnapshotRepository coverageSnapshotRepository,
                               OrgConnectionRepository orgConnectionRepository) {
        this.toolingService = toolingService;
        this.executionService = executionService;
        this.historyService = historyService;
        this.testResultRepository = testResultRepository;
        this.coverageSnapshotRepository = coverageSnapshotRepository;
        this.orgConnectionRepository = orgConnectionRepository;
    }

    // =========================================================================
    // Org / class discovery
    // =========================================================================

    /** GET /api/apex-pulse/classes?orgId=... */
    @GetMapping("/classes")
    public ResponseEntity<List<ApexTestClassDTO>> getTestClasses(
            @RequestParam String orgId) {
        OrgConnection org = resolveOrg(orgId);
        return ResponseEntity.ok(toolingService.getTestClasses(org));
    }

    /** GET /api/apex-pulse/org-stats?orgId=... */
    @GetMapping("/org-stats")
    public ResponseEntity<OrgStatsDTO> getOrgStats(
            @RequestParam String orgId) {
        OrgConnection org = resolveOrg(orgId);
        return ResponseEntity.ok(toolingService.getOrgStats(org));
    }

    // =========================================================================
    // Test execution
    // =========================================================================

    /** POST /api/apex-pulse/run?orgId=... */
    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> runTests(
            @RequestParam String orgId,
            @RequestBody TestRunRequest request) {
        OrgConnection org = resolveOrg(orgId);
        Map<String, Object> result = new HashMap<>(executionService.startTestRun(org, request.classIds()));
        result.put("status", "queued");
        return ResponseEntity.ok(result);
    }

    /** GET /api/apex-pulse/results/{testRunId}?orgId=... */
    @GetMapping("/results/{testRunId}")
    public ResponseEntity<List<TestResultDTO>> getTestResults(
            @PathVariable String testRunId,
            @RequestParam String orgId) {
        OrgConnection org = resolveOrg(orgId);
        return ResponseEntity.ok(toolingService.getTestResults(org, testRunId));
    }

    /** GET /api/apex-pulse/coverage/{testRunId}?orgId=... */
    @GetMapping("/coverage/{testRunId}")
    public ResponseEntity<List<CodeCoverageDTO>> getCodeCoverage(
            @PathVariable String testRunId,
            @RequestParam String orgId) {
        OrgConnection org = resolveOrg(orgId);
        return ResponseEntity.ok(toolingService.getCodeCoverage(org, testRunId));
    }

    // =========================================================================
    // History
    // =========================================================================

    /** GET /api/apex-pulse/history/runs?page=0&size=20 */
    @GetMapping("/history/runs")
    public ResponseEntity<Map<String, Object>> getRunHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TestRun> runs = historyService.getRunHistory(page, size);
        Map<String, Object> response = new HashMap<>();
        response.put("runs", runs.getContent().stream().map(this::mapRun).toList());
        response.put("totalPages", runs.getTotalPages());
        response.put("totalElements", runs.getTotalElements());
        response.put("currentPage", page);
        return ResponseEntity.ok(response);
    }

    /** GET /api/apex-pulse/history/runs/{id} */
    @GetMapping("/history/runs/{id}")
    public ResponseEntity<Map<String, Object>> getRunDetail(@PathVariable Long id) {
        return historyService.getRunById(id).map(run -> {
            Map<String, Object> response = new HashMap<>(mapRun(run));

            List<TestResult> results =
                    testResultRepository.findByTestRunIdOrderByClassNameAscMethodNameAsc(id);
            response.put("results", results.stream().map(r -> new TestResultDTO(
                    r.getClassName(), r.getMethodName(), r.getOutcome().name(),
                    r.getMessage(), r.getStackTrace(), r.getRunTimeMs()
            )).toList());

            List<CoverageSnapshot> coverage =
                    coverageSnapshotRepository.findByTestRunIdOrderByClassNameAsc(id);
            response.put("coverage", coverage.stream().map(c -> new CodeCoverageDTO(
                    c.getClassName(), c.getLinesCovered(), c.getLinesUncovered(), c.getCoveragePercent()
            )).toList());

            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/apex-pulse/history/trends/pass-rate?orgId=...&days=30 */
    @GetMapping("/history/trends/pass-rate")
    public ResponseEntity<List<Map<String, Object>>> getPassRateTrend(
            @RequestParam String orgId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(historyService.getPassRateTrend(orgId, days));
    }

    /** GET /api/apex-pulse/history/trends/coverage?orgId=...&days=30 */
    @GetMapping("/history/trends/coverage")
    public ResponseEntity<List<Map<String, Object>>> getCoverageTrend(
            @RequestParam String orgId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(historyService.getCoverageTrend(orgId, days));
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private OrgConnection resolveOrg(String orgId) {
        return orgConnectionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active OrgConnection found for orgId: " + orgId));
    }

    private Map<String, Object> mapRun(TestRun run) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", run.getId());
        map.put("asyncApexJobId", run.getAsyncApexJobId());
        map.put("orgId", run.getOrgId());
        map.put("status", run.getStatus().name());
        map.put("totalTests", run.getTotalTests());
        map.put("passCount", run.getPassCount());
        map.put("failCount", run.getFailCount());
        map.put("startedAt", run.getStartedAt() != null ? run.getStartedAt().toString() : null);
        map.put("completedAt", run.getCompletedAt() != null ? run.getCompletedAt().toString() : null);
        return map;
    }
}
