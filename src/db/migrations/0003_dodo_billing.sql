-- 0003_dodo_billing.sql
-- Per-workspace subscription state and webhook audit/idempotency.
-- Plan stored on workspaces so every /api/admin check has it on hand.

ALTER TABLE workspaces ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE workspaces ADD COLUMN subscription_id TEXT;
ALTER TABLE workspaces ADD COLUMN subscription_status TEXT;
ALTER TABLE workspaces ADD COLUMN current_period_end INTEGER;
ALTER TABLE workspaces ADD COLUMN dodo_customer_id TEXT;

CREATE INDEX ws_sub_idx ON workspaces(subscription_id);

CREATE TABLE webhook_events (
  id            TEXT PRIMARY KEY NOT NULL,
  event_type    TEXT NOT NULL,
  workspace_id  TEXT,
  payload       TEXT NOT NULL,
  processed_at  INTEGER NOT NULL,
  error         TEXT
);
CREATE INDEX wh_ws_idx ON webhook_events(workspace_id, processed_at);
