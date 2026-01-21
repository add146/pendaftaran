-- Organizations/Tenants
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users (Admin)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE IF NOT EXISTS events (
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
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'draft',
    image_url TEXT,
    slug TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Types
CREATE TABLE IF NOT EXISTS ticket_types (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    quota INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id TEXT REFERENCES ticket_types(id),
    registration_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    payment_status TEXT DEFAULT 'pending',
    check_in_status TEXT DEFAULT 'not_arrived',
    check_in_time TEXT,
    qr_code TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_reg_id ON participants(registration_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
