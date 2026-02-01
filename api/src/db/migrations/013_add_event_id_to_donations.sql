-- Add event_id to donations table to ensure donations persist even if participant is deleted
ALTER TABLE donations ADD COLUMN event_id TEXT REFERENCES events(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_donations_event ON donations(event_id);

-- Backfill event_id from participants
UPDATE donations 
SET event_id = (
    SELECT event_id 
    FROM participants 
    WHERE participants.id = donations.participant_id
)
WHERE participant_id IS NOT NULL;
