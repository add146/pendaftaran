-- Basic Multi-Tenant SaaS Conversion Migration
-- This migration adds multi-tenancy support with organization-scoped settings,
-- WAHA configuration system, and subscription management

-- 1. Update settings table for multi-tenancy
-- Add organization_id to settings
ALTER TABLE settings ADD COLUMN organization_id TEXT REFERENCES organizations(id);

-- Create index for organization-scoped settings
CREATE INDEX IF NOT EXISTS idx_settings_org_key ON settings(organization_id, key);

-- Migrate existing settings to default organization
UPDATE settings SET organization_id = 'org_default' WHERE organization_id IS NULL;

-- 2. Create WAHA admin configuration table (global, admin-only)
CREATE TABLE IF NOT EXISTS waha_config (
    id TEXT PRIMARY KEY DEFAULT 'global',
    api_url TEXT NOT NULL DEFAULT '',
    api_key TEXT NOT NULL DEFAULT '',
    session_name TEXT DEFAULT 'default',
    enabled INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default WAHA config (disabled by default)
INSERT OR IGNORE INTO waha_config (id, api_url, api_key, enabled) 
VALUES ('global', '', '', 0);

-- 3. Add WAHA toggle per organization (user-level control)
ALTER TABLE organizations ADD COLUMN waha_enabled INTEGER DEFAULT 0;

-- 4. Add super_admin flag to users table
ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0;

-- Make first user super admin
UPDATE users SET is_super_admin = 1 WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- 5. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    organization_id TEXT UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'nonprofit', -- 'nonprofit' or 'profit'
    status TEXT DEFAULT 'active', -- 'active', 'pending_payment', 'canceled', 'expired'
    
    -- Payment fields for profit plan
    payment_method TEXT, -- 'midtrans' or 'manual'
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    payment_proof_url TEXT, -- URL to payment proof (for manual payment)
    amount INTEGER DEFAULT 500000, -- Rp 500k/year for profit plan
    
    -- Timestamps
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT, -- NULL for nonprofit, set for profit (1 year from payment)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Insert nonprofit subscription for all existing organizations
INSERT OR IGNORE INTO subscriptions (id, organization_id, plan, status, payment_status)
SELECT 
    'sub_' || substr(id, 5),
    id,
    'nonprofit',
    'active',
    'paid'
FROM organizations;

-- 6. Create subscription payments table (for tracking payment history)
CREATE TABLE IF NOT EXISTS subscription_payments (
    id TEXT PRIMARY KEY,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- 'midtrans' or 'manual'
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    
    -- Midtrans fields
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    midtrans_response TEXT, -- JSON response from Midtrans
    
    -- Manual payment fields
    payment_proof_url TEXT,
    approved_by TEXT, -- user_id of admin who approved
    approved_at TEXT,
    
    -- Period covered by this payment
    period_start TEXT,
    period_end TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(payment_status);

-- 7. Add role field to team members (for future use)
-- Users table already has role field, but we'll add organization_role for multi-org support in future
-- For now, skip this as it's future scope

-- Verification queries (comment out in production)
-- SELECT COUNT(*) as settings_with_org FROM settings WHERE organization_id IS NOT NULL;
-- SELECT * FROM waha_config;
-- SELECT name, waha_enabled FROM organizations;
-- SELECT COUNT(*) as total_subscriptions FROM subscriptions;
-- SELECT o.name, s.plan, s.status FROM organizations o LEFT JOIN subscriptions s ON o.id = s.organization_id;
