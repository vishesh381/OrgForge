-- ============================================================
-- V4: Org Lens tables (health, dead code, dependencies)
-- ============================================================

CREATE TABLE IF NOT EXISTS org_health_scores (
    id               BIGSERIAL PRIMARY KEY,
    org_id           VARCHAR(255) NOT NULL,
    overall_score    DECIMAL(5,2),
    apex_score       DECIMAL(5,2),
    flow_score       DECIMAL(5,2),
    permission_score DECIMAL(5,2),
    data_score       DECIMAL(5,2),
    metadata_count   INT          DEFAULT 0,
    scored_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dead_code_items (
    id              BIGSERIAL PRIMARY KEY,
    org_id          VARCHAR(255) NOT NULL,
    component_type  VARCHAR(100),
    component_name  VARCHAR(500),
    api_name        VARCHAR(500),
    namespace       VARCHAR(255),
    last_modified   TIMESTAMP,
    is_reviewed     BOOLEAN      NOT NULL DEFAULT false,
    reviewed_by     VARCHAR(255),
    notes           TEXT,
    detected_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_dependencies (
    id              BIGSERIAL PRIMARY KEY,
    org_id          VARCHAR(255) NOT NULL,
    source_type     VARCHAR(100),
    source_name     VARCHAR(500),
    target_type     VARCHAR(100),
    target_name     VARCHAR(500),
    dependency_type VARCHAR(100),
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_scores_org ON org_health_scores (org_id, scored_at);
CREATE INDEX idx_dead_code_org     ON dead_code_items (org_id);
CREATE INDEX idx_dependencies_org  ON org_dependencies (org_id);
