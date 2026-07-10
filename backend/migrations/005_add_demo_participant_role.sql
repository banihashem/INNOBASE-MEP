-- Migration 005: Add demo_participant role (Hardened)
-- Date: 2026-07-10
-- Purpose: Safely expands the users.role CHECK constraint to include 'demo_participant'.

DO $$
BEGIN
    -- 1. Safely drop the existing constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- 2. Add the new constraint with all valid roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('Viewer', 'Consultant', 'Administrator', 'demo_participant'));
      
    -- 3. Log the migration safely
    INSERT INTO schema_migrations (version, name)
    VALUES (5, '005_add_demo_participant_role')
    ON CONFLICT (version) DO NOTHING;
END $$;
