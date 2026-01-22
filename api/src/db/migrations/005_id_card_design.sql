-- Migration: Add id_card_design column to events table
-- This stores the ID card design settings per event as JSON

ALTER TABLE events ADD COLUMN id_card_design TEXT;
