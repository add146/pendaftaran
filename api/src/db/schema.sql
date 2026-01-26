-- Organizations/Tenants
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    waha_enabled INTEGER DEFAULT 0,
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
    payment_mode TEXT DEFAULT 'manual', -- 'manual' or 'auto' (Midtrans)
    whatsapp_cs TEXT, -- WhatsApp number for manual payment
    bank_name TEXT, -- Bank name for manual payment
    account_holder_name TEXT, -- Account holder name for manual payment
    account_number TEXT, -- Bank account number for manual payment
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'draft',
    image_url TEXT,
    slug TEXT UNIQUE,
    note TEXT,
    icon_type TEXT DEFAULT 'info',
    event_type TEXT DEFAULT 'offline', -- 'offline', 'online', 'hybrid'
    online_platform TEXT, -- 'google_meet', 'zoom', 'youtube', 'custom'
    online_url TEXT,
    online_password TEXT,
    online_instructions TEXT,
    meeting_link_sent INTEGER DEFAULT 0,
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
    city TEXT, -- Kota tinggal
    gender TEXT,
    payment_status TEXT DEFAULT 'pending',
    check_in_status TEXT DEFAULT 'not_arrived',
    check_in_time TEXT,
    qr_code TEXT,
    whatsapp_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    whatsapp_sent_at TEXT,
    attendance_type TEXT DEFAULT 'offline', -- 'offline', 'online'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    order_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_type TEXT,
    midtrans_response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings (key-value storage for app configuration)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    value TEXT,
    organization_id TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_reg_id ON participants(registration_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
