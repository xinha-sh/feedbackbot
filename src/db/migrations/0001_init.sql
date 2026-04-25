-- 0001_init.sql
-- Core schema per PLAN.md §4.1. Numbered migration — never edit after commit.

CREATE TABLE workspaces (
  id                  TEXT PRIMARY KEY,
  domain              TEXT NOT NULL UNIQUE,
  state               TEXT NOT NULL,
  verification_token  TEXT NOT NULL,
  better_auth_org_id  TEXT,
  settings            TEXT NOT NULL DEFAULT '{}',
  ticket_count        INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL,
  claimed_at          INTEGER
);
CREATE INDEX ws_state_idx ON workspaces(state);

CREATE TABLE tickets (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id),
  message             TEXT NOT NULL,
  page_url            TEXT,
  user_agent          TEXT,
  email               TEXT,
  screenshot_key      TEXT,
  ip_hash             TEXT,
  status              TEXT NOT NULL DEFAULT 'open',
  classification      TEXT,
  classification_meta TEXT,
  upvotes             INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
CREATE INDEX tkt_ws_idx ON tickets(workspace_id, created_at DESC);
CREATE INDEX tkt_ws_status_idx ON tickets(workspace_id, status);
CREATE INDEX tkt_ws_class_idx ON tickets(workspace_id, classification);

CREATE TABLE comments (
  id             TEXT PRIMARY KEY,
  ticket_id      TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  workspace_id   TEXT NOT NULL REFERENCES workspaces(id),
  author_user_id TEXT,
  author_name    TEXT,
  message        TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'web',
  created_at     INTEGER NOT NULL
);
CREATE INDEX cmt_ticket_idx ON comments(ticket_id, created_at);

CREATE TABLE votes (
  id           TEXT PRIMARY KEY,
  ticket_id    TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  fingerprint  TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  UNIQUE(ticket_id, fingerprint)
);

CREATE TABLE integrations (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  kind         TEXT NOT NULL,
  name         TEXT NOT NULL,
  credentials  TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL
);

CREATE TABLE integration_routes (
  id             TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  workspace_id   TEXT NOT NULL REFERENCES workspaces(id),
  ticket_type    TEXT NOT NULL,
  config         TEXT NOT NULL,
  enabled        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX route_ws_type_idx ON integration_routes(workspace_id, ticket_type, enabled);

CREATE TABLE integration_deliveries (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspaces(id),
  integration_id TEXT NOT NULL,
  ticket_id      TEXT NOT NULL,
  status         TEXT NOT NULL,
  attempts       INTEGER NOT NULL DEFAULT 0,
  last_error     TEXT,
  request_body   TEXT,
  response_code  INTEGER,
  response_body  TEXT,
  created_at     INTEGER NOT NULL,
  delivered_at   INTEGER
);
CREATE INDEX dlv_ws_idx ON integration_deliveries(workspace_id, created_at DESC);

CREATE TABLE audit_log (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  actor_user_id TEXT,
  actor_ip_hash TEXT,
  action        TEXT NOT NULL,
  metadata      TEXT NOT NULL DEFAULT '{}',
  created_at    INTEGER NOT NULL
);
CREATE INDEX audit_ws_idx ON audit_log(workspace_id, created_at DESC);
