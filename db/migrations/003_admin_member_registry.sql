CREATE TABLE IF NOT EXISTS monoline_member_registry (
  user_id VARCHAR(64) PRIMARY KEY,
  global_line_id INTEGER NOT NULL,
  archived_at TIMESTAMPTZ,
  member_data_ciphertext BYTEA NOT NULL,
  credential_ciphertext BYTEA,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monoline_member_registry_position
  ON monoline_member_registry(global_line_id);

CREATE INDEX IF NOT EXISTS idx_monoline_member_registry_archived
  ON monoline_member_registry(archived_at);
