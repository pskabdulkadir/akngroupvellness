ALTER TABLE commission_logs
  ADD COLUMN IF NOT EXISTS commission_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS beneficiary_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS commission_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS tier_level INTEGER,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING_14D',
  ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clawback_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'commission_logs' AND column_name = 'target_external_id'
  ) THEN
    EXECUTE $sql$
      UPDATE commission_logs c
      SET beneficiary_user_id = m.user_id
      FROM members m
      WHERE c.beneficiary_user_id IS NULL
        AND m.user_id::text = c.target_external_id::text
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'commission_logs' AND column_name = 'target_user_id'
  ) THEN
    EXECUTE $sql$
      UPDATE commission_logs c
      SET beneficiary_user_id = m.user_id
      FROM members m
      WHERE c.beneficiary_user_id IS NULL
        AND c.target_user_id IS NOT NULL
        AND m.id::text = c.target_user_id::text
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'commission_logs' AND column_name = 'type'
  ) THEN
    EXECUTE $sql$
      UPDATE commission_logs
      SET commission_type = type::text
      WHERE commission_type IS NULL OR BTRIM(commission_type) = ''
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'commission_logs' AND column_name = 'depth_level'
  ) THEN
    EXECUTE $sql$
      UPDATE commission_logs
      SET tier_level = depth_level
      WHERE tier_level IS NULL
    $sql$;
  END IF;
END $$;

UPDATE commission_logs
SET commission_id = COALESCE(NULLIF(BTRIM(commission_id), ''), 'LEGACY-MIGRATION-COMMISSION-' || id::text),
    commission_type = COALESCE(NULLIF(BTRIM(commission_type), ''), 'LEGACY'),
    release_at = COALESCE(release_at, created_at + INTERVAL '14 days'),
    clawback_status = COALESCE(
      NULLIF(BTRIM(clawback_status), ''),
      CASE
        WHEN status IN ('RELEASED', 'SETTLED') THEN 'RELEASED_TO_BALANCE'
        WHEN status IN ('REFUNDED', 'REFUNDED_CANCELLED', 'CLAWBACKED') THEN 'CLAWBACK_REFUNDED'
        WHEN status = 'FRAUD_REVIEW' THEN 'FRAUD_REVIEW'
        ELSE 'ACTIVE'
      END
    );

UPDATE commission_logs c
SET currency = UPPER(o.currency)
FROM orders o
WHERE o.order_id = c.order_id
  AND UPPER(o.currency) IN ('TRY', 'USD');

ALTER TABLE commission_logs
  ALTER COLUMN commission_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_logs_commission_id_key
  ON commission_logs(commission_id);
CREATE INDEX IF NOT EXISTS idx_comm_release ON commission_logs(release_at, status);
