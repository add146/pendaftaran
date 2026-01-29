-- Add order_id to participants
ALTER TABLE participants ADD COLUMN order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_participants_order ON participants(order_id);

-- Create event_bulk_discounts table
CREATE TABLE IF NOT EXISTS event_bulk_discounts (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    min_qty INTEGER NOT NULL,
    discount_type TEXT DEFAULT 'percent', -- 'percent' or 'nominal'
    discount_value INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discounts_event ON event_bulk_discounts(event_id);
