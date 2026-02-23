-- ============================================================
-- V1: Core tables (users, org_connections, audit_logs)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        VARCHAR(255) NOT NULL UNIQUE,
    name         VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role         VARCHAR(50)  NOT NULL DEFAULT 'USER',
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_connections (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                VARCHAR(255) NOT NULL UNIQUE,
    org_name              VARCHAR(255),
    instance_url          VARCHAR(500),
    org_type              VARCHAR(50),
    access_token          TEXT,
    refresh_token         TEXT,
    token_expiry          TIMESTAMP,
    api_version           VARCHAR(20)  DEFAULT '60.0',
    is_active             BOOLEAN      NOT NULL DEFAULT true,
    connected_by_user_id  VARCHAR(255),
    created_at            TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    org_id     UUID,
    user_id    UUID,
    module     VARCHAR(100),
    action     VARCHAR(200),
    details    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_id  ON audit_logs (org_id);
CREATE INDEX idx_audit_logs_module  ON audit_logs (module);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);
