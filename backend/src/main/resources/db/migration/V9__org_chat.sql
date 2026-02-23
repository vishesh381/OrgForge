-- ============================================================
-- V9: Org Chat tables
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id         BIGSERIAL PRIMARY KEY,
    org_id     VARCHAR(255) NOT NULL,
    user_id    VARCHAR(255),
    title      VARCHAR(500) DEFAULT 'New Chat',
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id             BIGSERIAL PRIMARY KEY,
    session_id     BIGINT       NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role           VARCHAR(20)  NOT NULL,
    content        TEXT         NOT NULL,
    soql_query     TEXT,
    query_results  TEXT,
    error_message  TEXT,
    tokens_used    INT          DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_org    ON chat_sessions (org_id);
CREATE INDEX idx_chat_messages_session ON chat_messages (session_id);
