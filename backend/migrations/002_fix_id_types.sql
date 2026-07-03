-- MEP-light™ — Migration 002: Fix ID Types
-- Version: 4.1.0
-- Date: 2026-07-03
--
-- Problem: Application generates TEXT IDs (e.g., "user_1234_abc") but schema
-- used UUID types causing INSERT failures.
-- Fix: Alter primary key columns to TEXT for tables where application generates IDs.
-- Tables with database-generated UUIDs (companies, expansion_options, scores,
-- evidence_items, assumption_cards, risk_cards, roadmap_actions, reports) keep UUID.

-- ─── Drop triggers first (they'll be recreated) ─────────────────────
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON assessment_sessions;

-- ─── Fix users table ─────────────────────────────────────────────────
-- Drop dependent foreign keys first
ALTER TABLE assessment_sessions DROP CONSTRAINT IF EXISTS assessment_sessions_user_id_fkey;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey;
ALTER TABLE evidence_items DROP CONSTRAINT IF EXISTS evidence_items_created_by_fkey;
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reviewed_by_fkey;

-- Change users.id from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Change foreign key columns that reference users.id
ALTER TABLE assessment_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE companies ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE evidence_items ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE audit_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE reports ALTER COLUMN reviewed_by TYPE TEXT USING reviewed_by::TEXT;

-- Re-add foreign keys
ALTER TABLE assessment_sessions ADD CONSTRAINT assessment_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE companies ADD CONSTRAINT companies_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE evidence_items ADD CONSTRAINT evidence_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD CONSTRAINT reports_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- ─── Fix assessment_sessions.id ──────────────────────────────────────
ALTER TABLE expansion_options DROP CONSTRAINT IF EXISTS expansion_options_session_id_fkey;
ALTER TABLE evidence_items DROP CONSTRAINT IF EXISTS evidence_items_session_id_fkey;
ALTER TABLE assumption_cards DROP CONSTRAINT IF EXISTS assumption_cards_session_id_fkey;
ALTER TABLE risk_cards DROP CONSTRAINT IF EXISTS risk_cards_session_id_fkey;
ALTER TABLE roadmap_actions DROP CONSTRAINT IF EXISTS roadmap_actions_session_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_session_id_fkey;
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_session_id_fkey;
ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_session_id_fkey;

ALTER TABLE assessment_sessions ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Fix FK columns
ALTER TABLE expansion_options ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE evidence_items ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE assumption_cards ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE risk_cards ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE roadmap_actions ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE reports ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE audit_events ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE agent_runs ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- Re-add FK constraints
ALTER TABLE expansion_options ADD CONSTRAINT expansion_options_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE evidence_items ADD CONSTRAINT evidence_items_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE assumption_cards ADD CONSTRAINT assumption_cards_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE risk_cards ADD CONSTRAINT risk_cards_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE roadmap_actions ADD CONSTRAINT roadmap_actions_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE reports ADD CONSTRAINT reports_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL;
ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL;

-- ─── Fix audit_events.id ─────────────────────────────────────────────
ALTER TABLE audit_events ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- ─── Fix agent_runs.id ───────────────────────────────────────────────
ALTER TABLE agent_artifacts DROP CONSTRAINT IF EXISTS agent_artifacts_agent_run_id_fkey;
ALTER TABLE agent_runs ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE agent_artifacts ALTER COLUMN agent_run_id TYPE TEXT USING agent_run_id::TEXT;
ALTER TABLE agent_artifacts ADD CONSTRAINT agent_artifacts_agent_run_id_fkey
    FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;

-- ─── Fix agent_artifacts.id ──────────────────────────────────────────
ALTER TABLE agent_artifacts ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- ─── Recreate triggers ───────────────────────────────────────────────
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Track migration ────────────────────────────────────────────────
INSERT INTO schema_migrations (version, name)
VALUES (2, '002_fix_id_types')
ON CONFLICT (version) DO NOTHING;
