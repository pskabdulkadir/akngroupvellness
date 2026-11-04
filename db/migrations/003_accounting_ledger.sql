ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(14, 6);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(14, 6);

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS bank_settlement_ref VARCHAR(128),
  ADD COLUMN IF NOT EXISTS payout_provider VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_idempotency_key
  ON journal_entries(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_source_event
  ON journal_entries(source_event_type, source_event_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at
  ON journal_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at
  ON wallet_transactions(created_at DESC);
