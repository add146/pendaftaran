INSERT INTO organizations (id, name, slug, created_at) VALUES ('org_system', 'System', 'system', CURRENT_TIMESTAMP);
INSERT INTO users (id, organization_id, email, password_hash, name, role, is_super_admin) VALUES ('user_khibroh', 'org_system', 'khibroh@gmail.com', '$2a$10$EmKzD8qZ3WqH7sKGQ0qVH.S2YqFq4bzYN3JhKHZLKJN4DZN3sKF/.', 'Khibroh Studio', 'super_admin', 1);
