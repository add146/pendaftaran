-- Add donation configuration to events table
ALTER TABLE events ADD COLUMN donation_enabled INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN donation_min_amount INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN donation_description TEXT;

-- Create donations table for tracking
CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id),
    order_id TEXT,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, failed
    payment_type TEXT, -- midtrans
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_donations_participant ON donations(participant_id);
CREATE INDEX IF NOT EXISTS idx_donations_order ON donations(order_id);
