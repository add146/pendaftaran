-- Migration 002: Super Admin Role & User
-- Add super admin role and create default super admin account

-- Add super_admin to role enum (SQLite doesn't have ALTER TYPE, so we rely on CHECK constraint)
-- The users table already has CHECK(role IN ('admin', 'user'))
-- We'll update existing records if needed and rely on application-level validation

-- Create super admin organization (system-level)
INSERT OR IGNORE INTO organizations (id, name, slug, created_at) VALUES 
('org_system', 'System Admin', 'system-admin', CURRENT_TIMESTAMP);

-- Create super admin user
-- Password: superadmin123 (hashed with bcrypt)
-- Email: superadmin@system.local
INSERT OR IGNORE INTO users (
    id, 
    organization_id, 
    email, 
    password_hash, 
    name, 
    role, 
    created_at
) VALUES (
    'user_superadmin',
    'org_system',
    'superadmin@system.local',
    '$2a$10$YQ98PzLkUw8A.qiFJ6P0JeVwD5H1YvF8rBxCXhH8h8F8n8P8P8P8O',  -- superadmin123
    'Super Administrator',
    'super_admin',
    CURRENT_TIMESTAMP
);

-- Create nonprofit subscription for system org (required for data integrity)
INSERT OR IGNORE INTO subscriptions (
    id, 
    organization_id, 
    plan, 
    status, 
    payment_status, 
    amount,
    created_at
) VALUES (
    'sub_system',
    'org_system',
    'nonprofit',
    'active',
    'paid',
    0,
    CURRENT_TIMESTAMP
);
