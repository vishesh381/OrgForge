package com.orgforge.modules.apexpulse.service;

import com.orgforge.modules.apexpulse.model.TestRun;
import com.orgforge.modules.apexpulse.repository.CoverageSnapshotRepository;
import com.orgforge.modules.apexpulse.repository.TestRunRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class TestHistoryService {

    private final TestRunRepository testRunRepository;
    private final CoverageSnapshotRepository coverageSnapshotRepository;

    public TestHistoryService(TestRunRepository testRunRepository,
                              CoverageSnapshotRepository coverageSnapshotRepository) {
        this.testRunRepository = testRunRepository;
        this.coverageSnapshotRepository = coverageSnapshotRepository;
    }

    public Page<TestRun> getRunHistory(int page, int size) {
        return testRunRepository.findAllByOrderByStartedAtDesc(PageRequest.of(page, size));
    }

    public Optional<TestRun> getRunById(Long id) {
        return testRunRepository.findById(id);
    }

    public List<Map<String, Object>> getPassRateTrend(String orgId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<TestRun> runs = testRunRepository.findCompletedRunsSince(orgId, since);

        return runs.stream().map(run -> {
            double passRate = run.getTotalTests() > 0
                    ? (run.getPassCount() * 100.0 / run.getTotalTests()) : 0;
            Map<String, Object> point = new HashMap<>();
            point.put("date", run.getStartedAt().toString());
            point.put("passRate", Math.round(passRate * 100.0) / 100.0);
            point.put("totalTests", run.getTotalTests());
            point.put("runId", run.getId());
            return point;
        }).toList();
    }

    public List<Map<String, Object>> getCoverageTrend(String orgId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<TestRun> runs = testRunRepository.findCompletedRunsSince(orgId, since);

        return runs.stream().map(run -> {
            Double avgCoverage = coverageSnapshotRepository.findAverageCoverageByTestRunId(run.getId());
            Map<String, Object> point = new HashMap<>();
            point.put("date", run.getStartedAt().toString());
            point.put("coverage", avgCoverage != null ? Math.round(avgCoverage * 100.0) / 100.0 : 0);
            point.put("runId", run.getId());
            return point;
        }).toList();
    }

    public List<TestRun> getRecentRuns(String orgId, int limit) {
        return testRunRepository.findRecentCompleted(orgId, Pageable.ofSize(limit));
    }
}
