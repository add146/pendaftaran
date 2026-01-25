PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS organizations;
CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
, waha_enabled INTEGER DEFAULT 0);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
, is_super_admin INTEGER DEFAULT 0);

DROP TABLE IF EXISTS events;
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    event_time TEXT,
    location TEXT,
    location_map_url TEXT,
    capacity INTEGER,
    event_mode TEXT DEFAULT 'free',
    payment_mode TEXT DEFAULT 'manual', 
    whatsapp_cs TEXT, 
    bank_name TEXT, 
    account_holder_name TEXT, 
    account_number TEXT, 
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'draft',
    image_url TEXT,
    slug TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ticket_types;
CREATE TABLE ticket_types (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    quota INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS participants;
CREATE TABLE participants (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id TEXT REFERENCES ticket_types(id),
    registration_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    city TEXT, 
    gender TEXT,
    payment_status TEXT DEFAULT 'pending',
    check_in_status TEXT DEFAULT 'not_arrived',
    check_in_time TEXT,
    qr_code TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    order_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_type TEXT,
    midtrans_response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
, organization_id TEXT REFERENCES organizations(id));

DROP TABLE IF EXISTS waha_config;
CREATE TABLE waha_config (
    id TEXT PRIMARY KEY DEFAULT 'global',
    api_url TEXT NOT NULL DEFAULT '',
    api_key TEXT NOT NULL DEFAULT '',
    session_name TEXT DEFAULT 'default',
    enabled INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    organization_id TEXT UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'nonprofit', 
    status TEXT DEFAULT 'active', 
    payment_method TEXT, 
    payment_status TEXT DEFAULT 'pending', 
    payment_proof_url TEXT, 
    amount INTEGER DEFAULT 500000, 
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT, 
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS subscription_payments;
CREATE TABLE subscription_payments (
    id TEXT PRIMARY KEY,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL, 
    payment_status TEXT DEFAULT 'pending', 
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    midtrans_response TEXT, 
    payment_proof_url TEXT,
    approved_by TEXT, 
    approved_at TEXT,
    period_start TEXT,
    period_end TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS event_custom_fields;
CREATE TABLE event_custom_fields (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('text', 'textarea', 'radio', 'checkbox')),
  label TEXT NOT NULL,
  required INTEGER DEFAULT 0 CHECK(required IN (0, 1)),
  options TEXT, 
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS participant_field_responses;
CREATE TABLE participant_field_responses (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES event_custom_fields(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_reg_id ON participants(registration_id);
CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_settings_org_key ON settings(organization_id, key);
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscription_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX idx_subscription_payments_org ON subscription_payments(organization_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(payment_status);
CREATE INDEX idx_event_custom_fields_event_id ON event_custom_fields(event_id);
CREATE INDEX idx_event_custom_fields_display_order ON event_custom_fields(event_id, display_order);
CREATE INDEX idx_participant_field_responses_participant ON participant_field_responses(participant_id);
CREATE INDEX idx_participant_field_responses_field ON participant_field_responses(field_id);
