package com.orgforge.modules.apexpulse.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.modules.apexpulse.dto.CodeCoverageDTO;
import com.orgforge.modules.apexpulse.dto.TestProgressDTO;
import com.orgforge.modules.apexpulse.dto.TestResultDTO;
import com.orgforge.modules.apexpulse.model.CoverageSnapshot;
import com.orgforge.modules.apexpulse.model.TestOutcome;
import com.orgforge.modules.apexpulse.model.TestResult;
import com.orgforge.modules.apexpulse.model.TestRun;
import com.orgforge.modules.apexpulse.model.TestRunStatus;
import com.orgforge.modules.apexpulse.repository.TestRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates Apex test runs for a given {@link OrgConnection}.
 * The caller (controller) resolves the OrgConnection from the orgId query param
 * and passes it through, so this service has no dependency on session-scoped auth.
 */
@Service
public class TestExecutionService {

    private static final Logger log = LoggerFactory.getLogger(TestExecutionService.class);

    private final SalesforceToolingService toolingService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TestRunRepository testRunRepository;

    public TestExecutionService(SalesforceToolingService toolingService,
                                SimpMessagingTemplate messagingTemplate,
                                TestRunRepository testRunRepository) {
        this.toolingService = toolingService;
        this.messagingTemplate = messagingTemplate;
        this.testRunRepository = testRunRepository;
    }

    /**
     * Kicks off an asynchronous Apex test run against the given org.
     *
     * @param org      the OrgConnection representing the target Salesforce org
     * @param classIds list of ApexClass IDs to include in the run
     * @return map containing {@code testRunId} (SF async job ID) and {@code dbRunId}
     */
    public Map<String, Object> startTestRun(OrgConnection org, List<String> classIds) {
        String testRunId = toolingService.runTestsAsync(org, classIds);
        log.info("Started async test run: {}", testRunId);

        TestRun run = new TestRun();
        run.setAsyncApexJobId(testRunId);
        run.setOrgId(org.getOrgId());
        run.setStatus(TestRunStatus.QUEUED);
        run.setStartedAt(LocalDateTime.now());
        testRunRepository.save(run);

        pollTestProgress(org, testRunId, run.getId());
        return Map.of("testRunId", testRunId, "dbRunId", run.getId());
    }

    @Async("taskExecutor")
    @SuppressWarnings("unchecked")
    public void pollTestProgress(OrgConnection org, String testRunId, Long dbRunId) {
        int maxPolls = 120;
        int pollCount = 0;

        try {
            while (pollCount < maxPolls) {
                Thread.sleep(3000);
                pollCount++;

                Map<String, Object> queueStatus = toolingService.getTestQueueStatus(org, testRunId);
                List<Map<String, Object>> records = (List<Map<String, Object>>) queueStatus.get("records");

                if (records == null || records.isEmpty()) {
                    continue;
                }

                int total = records.size();
                int completed = 0;
                int passed = 0;
                int failed = 0;
                boolean allDone = true;

                for (Map<String, Object> item : records) {
                    String status = (String) item.get("Status");
                    if ("Completed".equals(status)) {
                        completed++;
                    } else if ("Failed".equals(status)) {
                        completed++;
                        failed++;
                    } else {
                        allDone = false;
                    }
                }

                double pct = total > 0 ? (completed * 100.0 / total) : 0;
                String status = allDone ? "Completed" : "Processing";

                TestProgressDTO progress = new TestProgressDTO(
                        testRunId, dbRunId, status, total, completed, passed, failed,
                        Math.round(pct * 100.0) / 100.0
                );
                messagingTemplate.convertAndSend("/topic/test-progress", progress);

                if (allDone) {
                    finalizeRun(org, testRunId, dbRunId);
                    return;
                }
            }

            log.warn("Test run {} timed out after {} polls", testRunId, maxPolls);
            updateRunStatus(dbRunId, TestRunStatus.FAILED);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Polling interrupted for test run {}", testRunId);
            updateRunStatus(dbRunId, TestRunStatus.ABORTED);
        } catch (Exception e) {
            log.error("Error polling test run {}: {}", testRunId, e.getMessage());
            updateRunStatus(dbRunId, TestRunStatus.FAILED);
        }
    }

    private void finalizeRun(OrgConnection org, String testRunId, Long dbRunId) {
        List<TestResultDTO> results = toolingService.getTestResults(org, testRunId);
        List<CodeCoverageDTO> coverage = toolingService.getCodeCoverage(org, testRunId);

        int passCount = (int) results.stream().filter(r -> "Pass".equals(r.outcome())).count();
        int failCount = (int) results.stream().filter(r -> "Fail".equals(r.outcome())).count();

        TestRun run = testRunRepository.findById(dbRunId).orElse(null);
        if (run != null) {
            run.setStatus(TestRunStatus.COMPLETED);
            run.setTotalTests(results.size());
            run.setPassCount(passCount);
            run.setFailCount(failCount);
            run.setCompletedAt(LocalDateTime.now());

            for (TestResultDTO dto : results) {
                TestResult result = new TestResult();
                result.setClassName(dto.className());
                result.setMethodName(dto.methodName());
                result.setOutcome(mapOutcome(dto.outcome()));
                result.setMessage(dto.message());
                result.setStackTrace(dto.stackTrace());
                result.setRunTimeMs(dto.runTimeMs());
                result.setTestRun(run);
                run.getResults().add(result);
            }

            for (CodeCoverageDTO dto : coverage) {
                CoverageSnapshot snapshot = new CoverageSnapshot();
                snapshot.setClassName(dto.classOrTriggerName());
                snapshot.setLinesCovered(dto.linesCovered());
                snapshot.setLinesUncovered(dto.linesUncovered());
                snapshot.setCoveragePercent(dto.coveragePercent());
                snapshot.setTestRun(run);
                run.getCoverageSnapshots().add(snapshot);
            }

            testRunRepository.save(run);
        }

        TestProgressDTO finalProgress = new TestProgressDTO(
                testRunId, dbRunId, "Completed", results.size(), results.size(),
                passCount, failCount, 100.0
        );
        messagingTemplate.convertAndSend("/topic/test-progress", finalProgress);
        log.info("Test run {} completed: {} passed, {} failed", testRunId, passCount, failCount);
    }

    private void updateRunStatus(Long dbRunId, TestRunStatus status) {
        testRunRepository.findById(dbRunId).ifPresent(run -> {
            run.setStatus(status);
            run.setCompletedAt(LocalDateTime.now());
            testRunRepository.save(run);
        });
    }

    private TestOutcome mapOutcome(String sfOutcome) {
        if (sfOutcome == null) return TestOutcome.SKIP;
        return switch (sfOutcome) {
            case "Pass" -> TestOutcome.PASS;
            case "Fail" -> TestOutcome.FAIL;
            case "CompileFail" -> TestOutcome.COMPILE_FAIL;
            default -> TestOutcome.SKIP;
        };
    }
}
