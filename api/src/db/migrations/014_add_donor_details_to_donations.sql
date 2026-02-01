-- Add donor details to donations table to persist data after participant deletion
ALTER TABLE donations ADD COLUMN donor_name TEXT;
ALTER TABLE donations ADD COLUMN donor_email TEXT;
ALTER TABLE donations ADD COLUMN donor_phone TEXT;

-- Backfill data from participants
UPDATE donations 
SET 
    donor_name = (SELECT full_name FROM participants WHERE participants.id = donations.participant_id),
    donor_email = (SELECT email FROM participants WHERE participants.id = donations.participant_id),
    donor_phone = (SELECT phone FROM participants WHERE participants.id = donations.participant_id)
WHERE participant_id IS NOT NULL;
