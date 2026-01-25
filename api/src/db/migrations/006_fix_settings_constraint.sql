-- Migration 006: Ensure settings table has correct composite primary key
-- This fixes the "UNIQUE constraint failed: settings.key" error

-- 1. Create new table with correct schema
CREATE TABLE IF NOT EXISTS settings_v2 (
    key TEXT NOT NULL,
    value TEXT,
    organization_id TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, organization_id)
);

-- 2. Copy data from existing table
-- Use INSERT OR REPLACE to handle potential duplicates if any (though unlikely if constraint existed)
INSERT OR REPLACE INTO settings_v2 (key, value, organization_id, updated_at)
SELECT key, value, organization_id, updated_at 
FROM settings 
WHERE organization_id IS NOT NULL;

-- 3. Drop old table
DROP TABLE settings;

-- 4. Rename new table
ALTER TABLE settings_v2 RENAME TO settings;

-- 5. Re-create index
CREATE INDEX IF NOT EXISTS idx_settings_org_v2 ON settings(organization_id);
