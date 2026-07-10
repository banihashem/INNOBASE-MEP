-- Migration 005: Add demo_participant role
-- Date: 2026-07-10

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('Viewer', 'Consultant', 'Administrator', 'demo_participant'));

INSERT INTO schema_migrations (version, name)
VALUES (5, '005_add_demo_participant_role')
ON CONFLICT (version) DO NOTHING;
