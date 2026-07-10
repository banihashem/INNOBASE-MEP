-- Migration 005: Add demo_participant role (Hardened & Idempotent)
-- Date: 2026-07-10
-- Purpose: Safely expands the users.role CHECK constraint to include 'demo_participant'.
--
-- Idempotency guarantees:
--   1. Safe to run multiple times (IF EXISTS / ON CONFLICT guards)
--   2. Works regardless of existing constraint name (drops ALL check constraints on users.role)
--   3. Preserves all existing Administrator, Consultant, and Viewer users
--   4. Does NOT modify, delete, or demote any existing user row
--   5. Does NOT contain UPDATE/DELETE on users table
--
-- Rollback plan (preserves data):
--   DO $$
--   BEGIN
--     ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
--     ALTER TABLE users ADD CONSTRAINT users_role_check
--       CHECK (role IN ('Viewer', 'Consultant', 'Administrator'));
--     -- NOTE: Rollback will fail if any rows have role='demo_participant'.
--     -- First UPDATE those rows: UPDATE users SET role = 'Viewer' WHERE role = 'demo_participant';
--   END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop ALL check constraints on the users.role column, regardless of name.
    --    This handles auto-generated names like users_role_check, users_role_check1, etc.
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
            AND att.attrelid = con.conrelid
        WHERE con.conrelid = 'users'::regclass
            AND con.contype = 'c'
            AND att.attname = 'role'
    LOOP
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- 2. Add the new constraint with all valid roles (including demo_participant)
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('Viewer', 'Consultant', 'Administrator', 'demo_participant'));

    -- 3. Log the migration safely (idempotent via ON CONFLICT)
    INSERT INTO schema_migrations (version, name)
    VALUES (5, '005_add_demo_participant_role')
    ON CONFLICT (version) DO NOTHING;
END $$;
