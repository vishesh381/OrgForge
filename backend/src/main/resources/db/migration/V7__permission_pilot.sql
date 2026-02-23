-- ============================================================
-- V7: Permission Pilot tables
-- ============================================================

CREATE TABLE IF NOT EXISTS permission_snapshots (
    id             BIGSERIAL PRIMARY KEY,
    org_id         VARCHAR(255) NOT NULL,
    profile_name   VARCHAR(500),
    profile_id     VARCHAR(255),
    permission_set VARCHAR(500),
    user_count     INT          DEFAULT 0,
    snapshot_data  TEXT,
    snapped_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permission_comparisons (
    id          BIGSERIAL PRIMARY KEY,
    org_id      VARCHAR(255) NOT NULL,
    profile_a   VARCHAR(500),
    profile_b   VARCHAR(500),
    diff_json   TEXT,
    compared_by VARCHAR(255),
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permission_violations (
    id              BIGSERIAL PRIMARY KEY,
    org_id          VARCHAR(255) NOT NULL,
    sf_user_id      VARCHAR(255),
    username        VARCHAR(500),
    permission_type VARCHAR(100),
    permission_name VARCHAR(500),
    risk_level      VARCHAR(50),
    notes           TEXT,
    is_acknowledged BOOLEAN      NOT NULL DEFAULT false,
    detected_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_perm_snapshots_org    ON permission_snapshots (org_id);
CREATE INDEX idx_perm_violations_org   ON permission_violations (org_id);
CREATE INDEX idx_perm_violations_risk  ON permission_violations (risk_level);
