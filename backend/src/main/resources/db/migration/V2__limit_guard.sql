-- ============================================================
-- V2: Limit Guard tables
-- ============================================================

CREATE TABLE IF NOT EXISTS limit_snapshots (
    id                       BIGSERIAL PRIMARY KEY,
    org_id                   VARCHAR(255) NOT NULL,
    limit_name               VARCHAR(255) NOT NULL,
    limit_type               VARCHAR(100),
    used                     BIGINT       NOT NULL DEFAULT 0,
    total                    BIGINT       NOT NULL DEFAULT 0,
    percentage               DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    forecasted_exhaustion_at TIMESTAMP,
    snapshot_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS limit_alerts (
    id             BIGSERIAL PRIMARY KEY,
    org_id         VARCHAR(255) NOT NULL,
    limit_name     VARCHAR(255) NOT NULL,
    threshold_pct  DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    notify_email   VARCHAR(500),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (org_id, limit_name)
);

CREATE INDEX idx_limit_snapshots_org_id ON limit_snapshots (org_id);
CREATE INDEX idx_limit_snapshots_at     ON limit_snapshots (snapshot_at);
