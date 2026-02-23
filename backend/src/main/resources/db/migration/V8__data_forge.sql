-- ============================================================
-- V8: Data Forge tables
-- ============================================================

CREATE TABLE IF NOT EXISTS import_jobs (
    id               BIGSERIAL PRIMARY KEY,
    org_id           VARCHAR(255) NOT NULL,
    object_name      VARCHAR(255),
    status           VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    total_records    INT          NOT NULL DEFAULT 0,
    processed_records INT         NOT NULL DEFAULT 0,
    success_count    INT          NOT NULL DEFAULT 0,
    error_count      INT          NOT NULL DEFAULT 0,
    file_name        VARCHAR(500),
    operation        VARCHAR(50)  DEFAULT 'INSERT',
    created_by       VARCHAR(255),
    created_at       TIMESTAMP    NOT NULL DEFAULT now(),
    completed_at     TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_errors (
    id            BIGSERIAL PRIMARY KEY,
    import_job_id BIGINT       NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number    INT,
    error_message TEXT,
    raw_data      TEXT
);

CREATE TABLE IF NOT EXISTS field_mappings (
    id             BIGSERIAL PRIMARY KEY,
    org_id         VARCHAR(255) NOT NULL,
    object_name    VARCHAR(255),
    mapping_name   VARCHAR(255),
    mapping_json   TEXT,
    created_by     VARCHAR(255),
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (org_id, object_name, mapping_name)
);

CREATE INDEX idx_import_jobs_org    ON import_jobs (org_id);
CREATE INDEX idx_import_jobs_status ON import_jobs (status);
CREATE INDEX idx_import_errors_job  ON import_errors (import_job_id);
