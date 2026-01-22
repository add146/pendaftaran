-- Add custom form fields support for events
-- Migration: 002_custom_fields

-- Table to store custom fields defined for each event
CREATE TABLE IF NOT EXISTS event_custom_fields (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('text', 'textarea', 'radio', 'checkbox')),
  label TEXT NOT NULL,
  required INTEGER DEFAULT 0 CHECK(required IN (0, 1)),
  options TEXT, -- JSON array for radio/checkbox options
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_custom_fields_event_id ON event_custom_fields(event_id);
CREATE INDEX IF NOT EXISTS idx_event_custom_fields_display_order ON event_custom_fields(event_id, display_order);

-- Table to store participant responses to custom fields
CREATE TABLE IF NOT EXISTS participant_field_responses (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES event_custom_fields(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participant_field_responses_participant ON participant_field_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_field_responses_field ON participant_field_responses(field_id);
