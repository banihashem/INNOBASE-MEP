-- MEP-light™ — Initial Database Schema
-- Migration 001: Core relational tables
--
-- Run against PostgreSQL:
--   psql -d mep_light -f 001_initial_schema.sql

BEGIN;

-- ─── Client Companies ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Client Company',
    sector VARCHAR(100) NOT NULL,
    domestic_market_size VARCHAR(255) DEFAULT '',
    export_experience VARCHAR(100) DEFAULT 'No Experience',
    capabilities TEXT DEFAULT '',
    constraints TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── User Sessions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) DEFAULT '',
    user_role VARCHAR(50) DEFAULT 'Viewer',
    company_id UUID REFERENCES client_companies(company_id),
    active_state VARCHAR(50) NOT NULL DEFAULT 'SETUP',
    decision_mode VARCHAR(50) DEFAULT 'compare',
    expansion_horizon VARCHAR(50) DEFAULT '12 months',
    strategic_objective TEXT DEFAULT '',
    decision_statement TEXT DEFAULT '',
    selected_offering VARCHAR(255) DEFAULT 'Selected Offering',
    selected_strategy VARCHAR(100) DEFAULT '',
    consultant_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_user_sessions_user ON user_sessions(user_id);

-- ─── Market Scores ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    market_name VARCHAR(100) NOT NULL,
    market_type VARCHAR(50) NOT NULL DEFAULT 'Country',
    attractiveness_raw INT CHECK (attractiveness_raw BETWEEN 1 AND 5),
    offering_fit_raw INT CHECK (offering_fit_raw BETWEEN 1 AND 5),
    channel_access_raw INT CHECK (channel_access_raw BETWEEN 1 AND 5),
    competitor_intensity_raw INT CHECK (competitor_intensity_raw BETWEEN 1 AND 5),
    regulatory_complexity_raw INT CHECK (regulatory_complexity_raw BETWEEN 1 AND 5),
    operational_feasibility_raw INT CHECK (operational_feasibility_raw BETWEEN 1 AND 5),
    brand_transferability_raw INT CHECK (brand_transferability_raw BETWEEN 1 AND 5),
    strategic_value_raw INT CHECK (strategic_value_raw BETWEEN 1 AND 5),
    financial_logic_raw INT CHECK (financial_logic_raw BETWEEN 1 AND 5),
    evidence_basis VARCHAR(100) DEFAULT '',
    evidence_confidence VARCHAR(20) DEFAULT 'Medium',
    notes TEXT DEFAULT '',
    expansion_potential_score INT,
    tier_classification VARCHAR(50),
    risk_level VARCHAR(20),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_market_scores_session ON market_scores(session_id);

-- ─── Audit Log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id VARCHAR(255) DEFAULT '',
    user_role VARCHAR(50) DEFAULT '',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) DEFAULT '',
    resource_id VARCHAR(36) DEFAULT '',
    details JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS ix_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_log_user ON audit_log(user_id);

COMMIT;
