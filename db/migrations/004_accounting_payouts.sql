ALTER TABLE commission_logs
  ADD COLUMN IF NOT EXISTS commission_id VARCHAR(128);

UPDATE commission_logs
SET commission_id = 'LEGACY-MIGRATION-COMMISSION-' || id::text
WHERE commission_id IS NULL OR BTRIM(commission_id) = '';

ALTER TABLE commission_logs
  ALTER COLUMN commission_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_logs_commission_id_key
  ON commission_logs(commission_id);

CREATE TABLE IF NOT EXISTS member_payout_profiles (
  beneficiary_user_id VARCHAR(64) PRIMARY KEY REFERENCES members(user_id) ON DELETE RESTRICT,
  tax_id_ciphertext BYTEA NOT NULL,
  tax_office_ciphertext BYTEA,
  address_ciphertext BYTEA NOT NULL,
  iban_ciphertext BYTEA NOT NULL,
  iban_holder_ciphertext BYTEA NOT NULL,
  bank_name VARCHAR(128),
  is_company BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_tax_rules (
  id BIGSERIAL PRIMARY KEY,
  rule_key VARCHAR(64) NOT NULL,
  member_type VARCHAR(16) NOT NULL CHECK (member_type IN ('INDIVIDUAL', 'COMPANY')),
  withholding_rate NUMERIC(7,6) NOT NULL DEFAULT 0 CHECK (withholding_rate >= 0 AND withholding_rate <= 1),
  stamp_tax_rate NUMERIC(7,6) NOT NULL DEFAULT 0 CHECK (stamp_tax_rate >= 0 AND stamp_tax_rate <= 1),
  effective_from DATE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by VARCHAR(128),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rule_key, member_type, effective_from)
);

CREATE TABLE IF NOT EXISTS payout_batches (
  id BIGSERIAL PRIMARY KEY,
  batch_id VARCHAR(128) NOT NULL UNIQUE,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'APPROVED', 'PAYOUT_PENDING', 'SETTLED', 'REJECTED')),
  gross_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_total >= 0),
  withholding_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (withholding_total >= 0),
  stamp_tax_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (stamp_tax_total >= 0),
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_total >= 0),
  created_by VARCHAR(128) NOT NULL,
  approved_by VARCHAR(128),
  approved_at TIMESTAMPTZ,
  settled_by VARCHAR(128),
  settled_at TIMESTAMPTZ,
  settlement_reference VARCHAR(128),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (gross_total = withholding_total + stamp_tax_total + net_total)
);

CREATE TABLE IF NOT EXISTS payout_batch_items (
  id BIGSERIAL PRIMARY KEY,
  batch_id VARCHAR(128) NOT NULL REFERENCES payout_batches(batch_id) ON DELETE RESTRICT,
  commission_id VARCHAR(128) NOT NULL REFERENCES commission_logs(commission_id) ON DELETE RESTRICT,
  beneficiary_user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE RESTRICT,
  currency VARCHAR(8) NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount > 0),
  withholding_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (withholding_amount >= 0),
  stamp_tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (stamp_tax_amount >= 0),
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'SETTLED', 'REJECTED')),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  CHECK (gross_amount = withholding_amount + stamp_tax_amount + net_amount),
  UNIQUE (batch_id, commission_id)
);

CREATE TABLE IF NOT EXISTS accounting_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type VARCHAR(48) NOT NULL CHECK (job_type IN ('CREATE_ACCOUNTING_DRAFT')),
  source_event_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  run_after TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS accounting_invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_id VARCHAR(128) NOT NULL UNIQUE,
  source_event_id VARCHAR(128) NOT NULL UNIQUE,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  commission_id VARCHAR(128) NOT NULL UNIQUE REFERENCES commission_logs(commission_id) ON DELETE RESTRICT,
  payout_batch_id VARCHAR(128) REFERENCES payout_batches(batch_id) ON DELETE RESTRICT,
  beneficiary_user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE RESTRICT,
  document_type VARCHAR(32) NOT NULL DEFAULT 'GIDER_PUSULASI'
    CHECK (document_type IN ('GIDER_PUSULASI', 'KOMISYON_FATURASI')),
  status VARCHAR(32) NOT NULL DEFAULT 'PROVIDER_NOT_CONFIGURED'
    CHECK (status IN ('PROVIDER_NOT_CONFIGURED', 'READY', 'SUBMISSION_PENDING', 'ISSUED', 'FAILED', 'CANCELLED')),
  currency VARCHAR(8) NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount > 0),
  withholding_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (withholding_amount >= 0),
  stamp_tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (stamp_tax_amount >= 0),
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  tax_rule_id BIGINT REFERENCES accounting_tax_rules(id) ON DELETE RESTRICT,
  beneficiary_snapshot_ciphertext BYTEA NOT NULL,
  company_snapshot_ciphertext BYTEA NOT NULL,
  provider VARCHAR(64),
  provider_document_id VARCHAR(128),
  pdf_storage_key TEXT,
  xml_storage_key TEXT,
  output_sha256 VARCHAR(64),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (gross_amount = withholding_amount + stamp_tax_amount + net_amount)
);

CREATE INDEX IF NOT EXISTS idx_accounting_tax_rules_active
  ON accounting_tax_rules(member_type, effective_from DESC) WHERE enabled = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_batches_settlement_reference_unique
  ON payout_batches(settlement_reference) WHERE settlement_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_batches_status_created
  ON payout_batches(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_items_active_commission_unique
  ON payout_batch_items(commission_id) WHERE status <> 'REJECTED';
CREATE INDEX IF NOT EXISTS idx_payout_items_beneficiary
  ON payout_batch_items(beneficiary_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_jobs_due
  ON accounting_jobs(status, run_after, id);
CREATE TABLE IF NOT EXISTS accounting_anomalies (
  id BIGSERIAL PRIMARY KEY,
  source_event_id VARCHAR(128) NOT NULL,
  anomaly_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_event_id, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_accounting_invoices_status_created
  ON accounting_invoices(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_beneficiary
  ON accounting_invoices(beneficiary_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_anomalies_open
  ON accounting_anomalies(created_at DESC) WHERE resolved_at IS NULL;
