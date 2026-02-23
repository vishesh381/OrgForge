-- ============================================================
-- V5: Deploy Pilot tables
-- ============================================================

CREATE TABLE IF NOT EXISTS deployments (
    id                BIGSERIAL PRIMARY KEY,
    org_id            VARCHAR(255) NOT NULL,
    sf_deployment_id  VARCHAR(255),
    label             VARCHAR(500),
    component_count   INT          NOT NULL DEFAULT 0,
    status            VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    deploy_type       VARCHAR(50),
    validation_only   BOOLEAN      NOT NULL DEFAULT false,
    error_message     TEXT,
    deployed_by       VARCHAR(255),
    started_at        TIMESTAMP    NOT NULL DEFAULT now(),
    completed_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deploy_components (
    id              BIGSERIAL PRIMARY KEY,
    deployment_id   BIGINT       NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    component_type  VARCHAR(200),
    component_name  VARCHAR(500),
    status          VARCHAR(50),
    error_message   TEXT
);

CREATE TABLE IF NOT EXISTS deploy_rollbacks (
    id              BIGSERIAL PRIMARY KEY,
    deployment_id   BIGINT       NOT NULL REFERENCES deployments(id),
    rollback_reason TEXT,
    rolled_back_by  VARCHAR(255),
    rolled_back_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_deployments_org    ON deployments (org_id);
CREATE INDEX idx_deployments_status ON deployments (status);
CREATE INDEX idx_deploy_components  ON deploy_components (deployment_id);
