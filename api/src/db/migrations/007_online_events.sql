-- Migration: Add support for online and hybrid events

-- Add fields to events table
ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'offline'; -- 'offline', 'online', 'hybrid'
ALTER TABLE events ADD COLUMN online_platform TEXT; -- 'google_meet', 'zoom', 'youtube', 'custom'
ALTER TABLE events ADD COLUMN online_url TEXT;
ALTER TABLE events ADD COLUMN online_password TEXT;
ALTER TABLE events ADD COLUMN online_instructions TEXT;
ALTER TABLE events ADD COLUMN meeting_link_sent INTEGER DEFAULT 0;

-- Add fields to participants table
ALTER TABLE participants ADD COLUMN attendance_type TEXT DEFAULT 'offline'; -- 'offline', 'online'
