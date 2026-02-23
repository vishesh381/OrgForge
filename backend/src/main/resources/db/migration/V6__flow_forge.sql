-- ============================================================
-- V6: Flow Forge tables
-- ============================================================

CREATE TABLE IF NOT EXISTS flow_runs (
    id            BIGSERIAL PRIMARY KEY,
    org_id        VARCHAR(255) NOT NULL,
    flow_name     VARCHAR(500),
    flow_type     VARCHAR(100),
    flow_id       VARCHAR(255),
    status        VARCHAR(50),
    error_message TEXT,
    started_at    TIMESTAMP,
    duration_ms   BIGINT,
    record_id     VARCHAR(255),
    triggered_by  VARCHAR(500),
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flow_errors (
    id              BIGSERIAL PRIMARY KEY,
    flow_run_id     BIGINT       NOT NULL REFERENCES flow_runs(id) ON DELETE CASCADE,
    error_type      VARCHAR(200),
    error_message   TEXT,
    stack_trace     TEXT,
    element_label   VARCHAR(500),
    element_api_name VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS flow_overlaps (
    id            BIGSERIAL PRIMARY KEY,
    org_id        VARCHAR(255) NOT NULL,
    object_name   VARCHAR(255),
    trigger_event VARCHAR(100),
    flow_names    TEXT,
    risk_level    VARCHAR(50),
    detected_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_runs_org    ON flow_runs (org_id);
CREATE INDEX idx_flow_runs_status ON flow_runs (status);
CREATE INDEX idx_flow_overlaps_org ON flow_overlaps (org_id);
