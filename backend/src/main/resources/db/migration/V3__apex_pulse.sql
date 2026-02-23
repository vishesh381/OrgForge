-- ============================================================
-- V3: Apex Pulse tables (test runs, results, coverage)
-- ============================================================

CREATE TABLE IF NOT EXISTS test_runs (
    id                BIGSERIAL PRIMARY KEY,
    org_id            VARCHAR(255) NOT NULL,
    sf_job_id         VARCHAR(255),
    status            VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    total_tests       INT          NOT NULL DEFAULT 0,
    passed_tests      INT          NOT NULL DEFAULT 0,
    failed_tests      INT          NOT NULL DEFAULT 0,
    skipped_tests     INT          NOT NULL DEFAULT 0,
    overall_coverage  DECIMAL(5,2),
    started_at        TIMESTAMP    NOT NULL DEFAULT now(),
    completed_at      TIMESTAMP,
    trigger_type      VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS test_results (
    id              BIGSERIAL PRIMARY KEY,
    test_run_id     BIGINT       NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    class_name      VARCHAR(500),
    method_name     VARCHAR(500),
    outcome         VARCHAR(50)  NOT NULL,
    run_time_ms     BIGINT,
    error_message   TEXT,
    stack_trace     TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coverage_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    test_run_id     BIGINT       NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    class_name      VARCHAR(500),
    apex_class_id   VARCHAR(255),
    lines_covered   INT          NOT NULL DEFAULT 0,
    lines_uncovered INT          NOT NULL DEFAULT 0,
    coverage_pct    DECIMAL(5,2),
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_runs_org_id ON test_runs (org_id);
CREATE INDEX idx_test_runs_status ON test_runs (status);
CREATE INDEX idx_test_results_run  ON test_results (test_run_id);
CREATE INDEX idx_coverage_run       ON coverage_snapshots (test_run_id);
