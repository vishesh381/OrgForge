package com.orgforge.modules.apexpulse.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_runs")
public class TestRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String asyncApexJobId;

    /** Salesforce 18-character org ID string, kept as String for SF compatibility. */
    private String orgId;

    @Enumerated(EnumType.STRING)
    private TestRunStatus status;

    private int totalTests;
    private int passCount;
    private int failCount;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "testRun", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestResult> results = new ArrayList<>();

    @OneToMany(mappedBy = "testRun", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CoverageSnapshot> coverageSnapshots = new ArrayList<>();

    public TestRun() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAsyncApexJobId() {
        return asyncApexJobId;
    }

    public void setAsyncApexJobId(String asyncApexJobId) {
        this.asyncApexJobId = asyncApexJobId;
    }

    public String getOrgId() {
        return orgId;
    }

    public void setOrgId(String orgId) {
        this.orgId = orgId;
    }

    public TestRunStatus getStatus() {
        return status;
    }

    public void setStatus(TestRunStatus status) {
        this.status = status;
    }

    public int getTotalTests() {
        return totalTests;
    }

    public void setTotalTests(int totalTests) {
        this.totalTests = totalTests;
    }

    public int getPassCount() {
        return passCount;
    }

    public void setPassCount(int passCount) {
        this.passCount = passCount;
    }

    public int getFailCount() {
        return failCount;
    }

    public void setFailCount(int failCount) {
        this.failCount = failCount;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public List<TestResult> getResults() {
        return results;
    }

    public void setResults(List<TestResult> results) {
        this.results = results;
    }

    public List<CoverageSnapshot> getCoverageSnapshots() {
        return coverageSnapshots;
    }

    public void setCoverageSnapshots(List<CoverageSnapshot> coverageSnapshots) {
        this.coverageSnapshots = coverageSnapshots;
    }
}
