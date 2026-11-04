ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS source_event_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS source_event_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(14, 6);

UPDATE journal_entries
SET source_event_type = COALESCE(NULLIF(source_event_type, ''), 'LEGACY'),
    source_event_id = COALESCE(NULLIF(source_event_id, ''), 'LEGACY-' || id::text)
WHERE source_event_type IS NULL OR source_event_type = ''
   OR source_event_id IS NULL OR source_event_id = '';

ALTER TABLE journal_entries
  ALTER COLUMN source_event_type SET NOT NULL,
  ALTER COLUMN source_event_id SET NOT NULL;

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
