package com.orgforge.modules.apexpulse.model;

import jakarta.persistence.*;

@Entity
@Table(name = "test_results")
public class TestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String className;
    private String methodName;

    @Enumerated(EnumType.STRING)
    private TestOutcome outcome;

    @Column(length = 4000)
    private String message;

    @Column(length = 8000)
    private String stackTrace;

    private long runTimeMs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_run_id")
    private TestRun testRun;

    public TestResult() {
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

    public String getMethodName() {
        return methodName;
    }

    public void setMethodName(String methodName) {
        this.methodName = methodName;
    }

    public TestOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(TestOutcome outcome) {
        this.outcome = outcome;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStackTrace() {
        return stackTrace;
    }

    public void setStackTrace(String stackTrace) {
        this.stackTrace = stackTrace;
    }

    public long getRunTimeMs() {
        return runTimeMs;
    }

    public void setRunTimeMs(long runTimeMs) {
        this.runTimeMs = runTimeMs;
    }

    public TestRun getTestRun() {
        return testRun;
    }

    public void setTestRun(TestRun testRun) {
        this.testRun = testRun;
    }
}
