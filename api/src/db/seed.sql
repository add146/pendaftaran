-- Seed data for development

-- Default organization
INSERT OR IGNORE INTO organizations (id, name, slug) VALUES 
('org_system', 'System', 'system'),
('org_default', 'Masjid Al-Ikhlas', 'masjid-al-ikhlas');

-- Default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, organization_id, email, password_hash, name, role) VALUES 
('user_admin', 'org_default', 'admin@masjid.com', '0630306f-421a-424a-89af-e5d66ffcbbb2:26964094809a5f2c569d0c5519123aa2d9a481bd8fe51c1f5c53c12f7427995b', 'Imam Ahmed', 'admin'),
('user_khibroh', 'org_system', 'khibrohstudio@gmail.com', '0630306f-421a-424a-89af-e5d66ffcbbb2:26964094809a5f2c569d0c5519123aa2d9a481bd8fe51c1f5c53c12f7427995b', 'Khibroh Studio', 'super_admin');

-- Sample events
INSERT OR IGNORE INTO events (id, organization_id, title, description, event_date, event_time, location, capacity, event_mode, visibility, status, slug) VALUES 
('evt_001', 'org_default', 'Friday Youth Halaqa', 'Weekly youth study circle focusing on Islamic fundamentals and contemporary issues.', '2024-11-12', '19:00', 'Masjid Al-Ikhlas, Main Hall', 50, 'free', 'public', 'open', 'friday-youth-halaqa'),
('evt_002', 'org_default', 'Annual Community Dinner', 'Join us for our annual community dinner to celebrate and strengthen bonds within our community.', '2024-12-01', '18:30', 'Community Center', 500, 'paid', 'public', 'open', 'annual-community-dinner'),
('evt_003', 'org_default', 'Quran Recitation Contest', 'Annual Quran recitation competition for all age groups.', '2024-12-15', '09:00', 'Masjid Al-Ikhlas', 100, 'free', 'public', 'draft', 'quran-recitation-contest'),
('evt_004', 'org_default', 'Pengajian Akbar: Preparing for Ramadan', 'A spiritual gathering designed to prepare our hearts and minds for Ramadan.', '2024-03-10', '09:00', 'Masjid Al-Ikhlas, Main Hall', 200, 'free', 'public', 'open', 'pengajian-akbar-ramadan');

-- Ticket types
INSERT OR IGNORE INTO ticket_types (id, event_id, name, price, quota) VALUES 
('tkt_001', 'evt_001', 'General Admission', 0, 50),
('tkt_002', 'evt_002', 'Single Ticket', 50000, 300),
('tkt_003', 'evt_002', 'Family Ticket (4)', 150000, 50),
('tkt_004', 'evt_002', 'VIP Access', 100000, 20),
('tkt_005', 'evt_003', 'Participant', 0, 100),
('tkt_006', 'evt_004', 'Ikhwan', 0, 100),
('tkt_007', 'evt_004', 'Akhwat', 0, 100);

-- Sample participants
INSERT OR IGNORE INTO participants (id, event_id, ticket_type_id, registration_id, full_name, email, phone, gender, payment_status, check_in_status, check_in_time) VALUES 
('prt_001', 'evt_002', 'tkt_003', 'REG-8821', 'Ahmed Ali', 'ahmed.ali@example.com', '+6281234567890', 'male', 'paid', 'checked_in', '07:45'),
('prt_002', 'evt_002', 'tkt_002', 'REG-8822', 'Fatima Hassan', 'f.hassan92@gmail.com', '+6281234567891', 'female', 'pending', 'not_arrived', NULL),
('prt_003', 'evt_002', 'tkt_004', 'REG-8845', 'Youssef Khan', 'youssef.k@company.com', '+6281234567892', 'male', 'paid', 'not_arrived', NULL),
('prt_004', 'evt_002', 'tkt_002', 'REG-8901', 'Sarah Malik', 's.malik@email.com', '+6281234567893', 'female', 'failed', 'not_arrived', NULL),
('prt_005', 'evt_004', 'tkt_006', 'REG-2026-00123', 'Ahmad Fauzi', 'ahmad.fauzi@email.com', '+6281234567894', 'male', 'paid', 'not_arrived', NULL);
