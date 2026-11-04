ALTER TABLE payout_batches
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

UPDATE payout_batches
SET idempotency_key = 'legacy-' || LEFT(batch_id, 121)
WHERE idempotency_key IS NULL;

ALTER TABLE payout_batches
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE accounting_invoices
  ALTER COLUMN payout_batch_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payout_batches_idempotency_key_key
  ON payout_batches(idempotency_key);

ALTER TABLE payout_batch_items
  DROP CONSTRAINT IF EXISTS payout_batch_items_commission_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_items_active_commission_unique
  ON payout_batch_items(commission_id) WHERE status <> 'REJECTED';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_batches_settlement_reference_unique
  ON payout_batches(settlement_reference) WHERE settlement_reference IS NOT NULL;
