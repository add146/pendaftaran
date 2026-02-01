-- Add customer details to payments table to persist data after participant deletion
ALTER TABLE payments ADD COLUMN event_id TEXT REFERENCES events(id);
ALTER TABLE payments ADD COLUMN customer_name TEXT;
ALTER TABLE payments ADD COLUMN customer_email TEXT;
ALTER TABLE payments ADD COLUMN customer_phone TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);

-- Backfill data from participants
UPDATE payments 
SET 
    event_id = (SELECT event_id FROM participants WHERE participants.id = payments.participant_id),
    customer_name = (SELECT full_name FROM participants WHERE participants.id = payments.participant_id),
    customer_email = (SELECT email FROM participants WHERE participants.id = payments.participant_id),
    customer_phone = (SELECT phone FROM participants WHERE participants.id = payments.participant_id)
WHERE participant_id IS NOT NULL;
