ALTER TABLE members
  ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64),
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256),
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_request_id_unique
  ON wallet_transactions(user_id, request_id)
  WHERE request_id IS NOT NULL;
