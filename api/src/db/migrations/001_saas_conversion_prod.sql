-- Migration 001: SaaS Conversion (Production Safe Version)
-- This migration adds multi-tenant features without breaking existing data

-- Disable foreign keys temporarily for migration
PRAGMA foreign_keys = OFF;

-- 1. Modify settings table to be organization-scoped
ALTER TABLE settings ADD COLUMN organization_id TEXT;

-- Update existing settings to belong to first organization (if any)
UPDATE settings 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 2. Create WAHA config table (global admin-level)
CREATE TABLE IF NOT EXISTS waha_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    session_name TEXT DEFAULT 'default',
    enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add WAHA toggle to organizations
ALTER TABLE organizations ADD COLUMN waha_enabled INTEGER DEFAULT 0;

-- 4. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    plan TEXT NOT NULL CHECK(plan IN ('nonprofit', 'profit')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending_payment', 'canceled', 'expired')),
    payment_method TEXT CHECK(payment_method IN ('midtrans', 'manual')),
    payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed')),
    payment_proof_url TEXT,
    amount REAL DEFAULT 0,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);

-- 5. Create subscription_payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('midtrans', 'manual')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_proof_url TEXT,
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    approved_by TEXT,
    approved_at TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_org ON subscription_payments(organization_id);

-- 6. Create nonprofit subscriptions for all existing organizations
INSERT OR IGNORE INTO subscriptions (id, organization_id, plan, status, payment_status, amount)
SELECT 
    'sub_' || substr(hex(randomblob(4)), 1, 8),
    id,
    'nonprofit',
    'active',
    'paid',
    0
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions WHERE subscriptions.organization_id = organizations.id
);

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
