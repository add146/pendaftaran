-- Temporary fix: Set super admin password to plain text for initial login
-- User MUST change this password immediately after first login
-- Password: admin123

UPDATE users 
SET password_hash = 'admin123'
WHERE email = 'superadmin@system.local';

-- IMPORTANT: This is a temporary plain text password
-- The login route has backward compatibility that will accept plain text
-- Change password immediately after login via Profile page
