-- ============================================================================
-- AKN Group Wellness / MLM Altyapısı - PostgreSQL Kalıcı Şema & İdempotency
-- Hedef Mimari: Node.js / Express (server.ts) + Saf PostgreSQL (Bulut/Neon/Render)
-- ============================================================================

-- 1. ÜYELER VE BAYİLER TABLOSU
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(64),
  tc_identity_no VARCHAR(32),
  country_code VARCHAR(8) NOT NULL DEFAULT 'TR',
  city VARCHAR(100),
  sponsor_id VARCHAR(64),
  ref_code VARCHAR(64) UNIQUE,
  career_level INT NOT NULL DEFAULT 1,
  career_title VARCHAR(64) NOT NULL DEFAULT 'Emmâre',
  max_career_level INT NOT NULL DEFAULT 1,
  max_career_title VARCHAR(64) NOT NULL DEFAULT 'Emmâre',
  active_career_level INT NOT NULL DEFAULT 1,
  active_career_title VARCHAR(64) NOT NULL DEFAULT 'Emmâre',
  package_id VARCHAR(64) NOT NULL DEFAULT 'PKG_MINI_DENEME',
  highest_package_id VARCHAR(64),
  wallet_try NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  wallet_usd NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  wallet_eur NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  pending_try NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  pending_usd NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  pending_eur NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  personal_volume NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  group_volume NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  session_credits INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  activity_expires_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SİPARİŞLER TABLOSU & MÜKERRER İŞLEM ENGELİ
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(128) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
  order_type VARCHAR(64) NOT NULL DEFAULT 'REGULAR',
  package_id VARCHAR(64),
  order_amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  region VARCHAR(32) NOT NULL DEFAULT 'DOMESTIC',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(64) DEFAULT 'VPOS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. İDEMPOTENCY (MÜKERRERLİK) TABLOSU
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(128) PRIMARY KEY,
  order_id VARCHAR(128) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. FİNANSAL CÜZDAN HAREKETLERİ TABLOSU (ÇİFT ÖDEME KORUMALI)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(128) UNIQUE NOT NULL,
  order_id VARCHAR(128),
  transaction_type VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  direction VARCHAR(16) NOT NULL DEFAULT 'CREDIT',
  description TEXT,
  reference_event_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_tx_type_user UNIQUE (order_id, transaction_type, user_id)
);

-- 5. ÇİFT TARAFLI YEVMİYE KAYITLARI (DOUBLE-ENTRY GENERAL LEDGER)
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(64) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_event_type VARCHAR(64) NOT NULL,
  source_event_id VARCHAR(128) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  debit_account_code VARCHAR(32) NOT NULL,
  debit_account_name VARCHAR(128) NOT NULL,
  debit_amount NUMERIC(14,2) NOT NULL,
  credit_account_code VARCHAR(32) NOT NULL,
  credit_account_name VARCHAR(128) NOT NULL,
  credit_amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  reconciled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. KOMİSYON KAYITLARI TABLOSU
CREATE TABLE IF NOT EXISTS commission_logs (
  id SERIAL PRIMARY KEY,
  commission_id VARCHAR(128) UNIQUE NOT NULL,
  order_id VARCHAR(128) NOT NULL,
  beneficiary_user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
  commission_type VARCHAR(64) NOT NULL,
  tier_level INT,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING_14D',
  release_at TIMESTAMPTZ NOT NULL,
  clawback_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comm_order_type_user UNIQUE (order_id, commission_type, beneficiary_user_id)
);

-- 7. PARA ÇEKME TALEPLERİ
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(128) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  channel VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER_TR',
  payout_address VARCHAR(128) NOT NULL,
  tax_deduction NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_payout NUMERIC(14,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  admin_decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_members_sponsor ON members(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_members_career ON members(career_level);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_order ON wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_journal_event ON journal_entries(source_event_id);
CREATE INDEX IF NOT EXISTS idx_comm_release ON commission_logs(release_at, status);
