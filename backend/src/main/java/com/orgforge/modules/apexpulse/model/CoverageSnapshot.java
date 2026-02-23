package com.orgforge.modules.apexpulse.model;

import jakarta.persistence.*;

@Entity
@Table(name = "coverage_snapshots")
public class CoverageSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String className;
    private int linesCovered;
    private int linesUncovered;
    private double coveragePercent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_run_id")
    private TestRun testRun;

    public CoverageSnapshot() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public int getLinesCovered() {
        return linesCovered;
    }

    public void setLinesCovered(int linesCovered) {
        this.linesCovered = linesCovered;
    }

    public int getLinesUncovered() {
        return linesUncovered;
    }

    public void setLinesUncovered(int linesUncovered) {
        this.linesUncovered = linesUncovered;
    }

    public double getCoveragePercent() {
        return coveragePercent;
    }

    public void setCoveragePercent(double coveragePercent) {
        this.coveragePercent = coveragePercent;
    }

    public TestRun getTestRun() {
        return testRun;
    }

    public void setTestRun(TestRun testRun) {
        this.testRun = testRun;
    }
}
