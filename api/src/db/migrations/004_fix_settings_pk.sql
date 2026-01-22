-- Migration 004: Fix settings table for multi-tenancy
-- Settings table needs composite primary key (key, organization_id) not just key

-- Drop the old settings table (backup data first if needed)
-- Since this is for fixing super admin and we just created it, safe to recreate

-- Create new settings table with proper composite key
CREATE TABLE IF NOT EXISTS settings_new (
    key TEXT NOT NULL,
    value TEXT,
    organization_id TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, organization_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Copy existing data if any
INSERT INTO settings_new (key, value, organization_id, updated_at)
SELECT key, value, organization_id, updated_at FROM settings
WHERE organization_id IS NOT NULL;

-- Drop old table
DROP TABLE settings;

-- Rename new table
ALTER TABLE settings_new RENAME TO settings;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_settings_org ON settings(organization_id);
