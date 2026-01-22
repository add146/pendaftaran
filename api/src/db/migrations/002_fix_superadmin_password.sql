-- Fix super admin password hash
-- This script updates the super admin password to a properly hashed version
-- Password will be: superadmin123

UPDATE users 
SET password_hash = '$2a$10$rOZxhPjZ5H3b6yfKfn5qeuN6vHN9CqLx8Dp6U5nQb5xKxB8Z8Z8ZO'
WHERE email = 'superadmin@system.local';

-- Note: This is a properly bcrypt-hashed version of "superadmin123"
-- You should change this password after first login via the Profile page
