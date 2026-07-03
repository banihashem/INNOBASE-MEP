-- MEP-light™ — Production Database Schema (Cloud SQL for PostgreSQL)
-- Migration 001: Initial Production Schema
-- Version: 4.0.0
-- Date: 2026-07-03
--
-- This migration creates the complete production data model for MEP-light™
-- covering all 13 entity types required for durable persistence.
--
-- Prerequisites:
--   - PostgreSQL 16 on Cloud SQL
--   - pgvector extension (for future RAG)
--   - Database: mep_production
--   - User: mep_app with appropriate grants

-- ─── Extensions ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pgvector for future RAG/evidence vector search
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── 1. Users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        VARCHAR(50)  NOT NULL DEFAULT 'google',
    provider_subject VARCHAR(255) NOT NULL DEFAULT '',
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL DEFAULT '',
    picture_url     VARCHAR(500) DEFAULT '',
    role            VARCHAR(50)  NOT NULL DEFAULT 'Viewer'
                    CHECK (role IN ('Viewer', 'Consultant', 'Administrator')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('invited', 'active', 'deactivated')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_subject);

-- ─── 2. Companies ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    VARCHAR(255) NOT NULL DEFAULT 'Client Company',
    sector          VARCHAR(100) NOT NULL DEFAULT '',
    business_type   VARCHAR(100) DEFAULT '',
    maturity_level  VARCHAR(50)  DEFAULT '',
    current_market  VARCHAR(255) DEFAULT '',
    current_channels TEXT        DEFAULT '',
    current_offerings TEXT       DEFAULT '',
    capabilities    TEXT         DEFAULT '',
    constraints     TEXT         DEFAULT '',
    created_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_creator ON companies(created_by);

-- ─── 3. Assessment Sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id          UUID         REFERENCES companies(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL DEFAULT 'Untitled Session',
    active_state        VARCHAR(50)  NOT NULL DEFAULT 'SETUP',
    decision_mode       VARCHAR(50)  DEFAULT 'compare',
    expansion_horizon   VARCHAR(50)  DEFAULT '12 months',
    strategic_objective TEXT         DEFAULT '',
    selected_offering   VARCHAR(255) DEFAULT '',
    selected_strategy   VARCHAR(100) DEFAULT '',
    status              VARCHAR(50)  NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'in_progress', 'scoring', 'review', 'completed', 'archived')),
    input_data          JSONB        DEFAULT '{}',
    output_data         JSONB        DEFAULT '{}',
    consultant_notes    TEXT         DEFAULT '',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company ON assessment_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON assessment_sessions(active_state);

-- ─── 4. Expansion Options ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_options (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id              UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    option_name             VARCHAR(255) NOT NULL,
    option_type             VARCHAR(50)  NOT NULL DEFAULT 'Country'
                            CHECK (option_type IN ('Country', 'Region', 'Channel', 'Segment')),
    reason_for_inclusion    TEXT         DEFAULT '',
    known_opportunity_signal TEXT        DEFAULT '',
    known_concern           TEXT         DEFAULT '',
    evidence_basis          VARCHAR(100) DEFAULT '',
    notes                   TEXT         DEFAULT '',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_options_session ON expansion_options(session_id);

-- ─── 5. Scores ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id               UUID    NOT NULL REFERENCES expansion_options(id) ON DELETE CASCADE,
    -- Raw dimension scores (1-5)
    market_attractiveness   INTEGER CHECK (market_attractiveness BETWEEN 1 AND 5),
    offering_fit            INTEGER CHECK (offering_fit BETWEEN 1 AND 5),
    channel_access          INTEGER CHECK (channel_access BETWEEN 1 AND 5),
    competitive_intensity   INTEGER CHECK (competitive_intensity BETWEEN 1 AND 5),
    regulatory_complexity   INTEGER CHECK (regulatory_complexity BETWEEN 1 AND 5),
    operational_feasibility INTEGER CHECK (operational_feasibility BETWEEN 1 AND 5),
    brand_trust_transferability INTEGER CHECK (brand_trust_transferability BETWEEN 1 AND 5),
    strategic_value         INTEGER CHECK (strategic_value BETWEEN 1 AND 5),
    financial_logic         INTEGER CHECK (financial_logic BETWEEN 1 AND 5),
    -- Evidence
    evidence_confidence     VARCHAR(20) DEFAULT 'Medium'
                            CHECK (evidence_confidence IN ('High', 'Medium', 'Low', 'Unknown')),
    -- Computed (adjusted dimensions)
    adjusted_competition    NUMERIC(5,2),
    adjusted_regulatory     NUMERIC(5,2),
    -- Computed (category sub-scores)
    opportunity_score       NUMERIC(5,2),
    fit_score               NUMERIC(5,2),
    feasibility_score       NUMERIC(5,2),
    strategic_score         NUMERIC(5,2),
    financial_score         NUMERIC(5,2),
    -- Composite
    potential_score         INTEGER,
    risk_exposure_score     NUMERIC(5,2),
    -- Classification
    tier                    VARCHAR(50),
    confidence_label        VARCHAR(50),
    certainty_guardrail_triggered BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_option ON scores(option_id);
CREATE INDEX IF NOT EXISTS idx_scores_tier ON scores(tier);

-- ─── 6. Evidence Items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    option_id           UUID         REFERENCES expansion_options(id) ON DELETE SET NULL,
    claim               TEXT         NOT NULL,
    source_type         VARCHAR(100) DEFAULT ''
                        CHECK (source_type IN ('', 'internal_data', 'market_report', 'expert_judgment',
                               'desk_research', 'trade_guide', 'regulation', 'consultant_note', 'agent_research')),
    source_reference    VARCHAR(500) DEFAULT '',
    source_url          VARCHAR(1000) DEFAULT '',
    confidence_level    VARCHAR(20)  DEFAULT 'Medium'
                        CHECK (confidence_level IN ('High', 'Medium', 'Low', 'Unknown')),
    evidence_state      VARCHAR(20)  DEFAULT 'Estimated'
                        CHECK (evidence_state IN ('Confirmed', 'Estimated', 'Unknown')),
    notes               TEXT         DEFAULT '',
    created_by          UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_session ON evidence_items(session_id);
CREATE INDEX IF NOT EXISTS idx_evidence_option ON evidence_items(option_id);
CREATE INDEX IF NOT EXISTS idx_evidence_confidence ON evidence_items(confidence_level);

-- ─── 7. Assumption Cards ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assumption_cards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    option_id           UUID         REFERENCES expansion_options(id) ON DELETE SET NULL,
    assumption_type     VARCHAR(50)  DEFAULT 'Demand'
                        CHECK (assumption_type IN ('Demand', 'Channel Access', 'Financial Margins',
                               'Adaptation', 'Regulatory', 'Operational', 'Market')),
    assumption_text     TEXT         NOT NULL,
    confidence_level    VARCHAR(20)  DEFAULT 'Medium'
                        CHECK (confidence_level IN ('High', 'Medium', 'Low')),
    why_it_matters      TEXT         DEFAULT '',
    validation_action   TEXT         DEFAULT '',
    impact_if_wrong     TEXT         DEFAULT '',
    status              VARCHAR(20)  DEFAULT 'open'
                        CHECK (status IN ('open', 'validating', 'validated', 'invalidated', 'deferred')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assumptions_session ON assumption_cards(session_id);

-- ─── 8. Risk Cards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_cards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    option_id           UUID         REFERENCES expansion_options(id) ON DELETE SET NULL,
    risk_type           VARCHAR(50)  DEFAULT 'Market'
                        CHECK (risk_type IN ('Market', 'Regulatory', 'Financial', 'Operational',
                               'Competitive', 'Reputational', 'Technical')),
    severity            VARCHAR(20)  DEFAULT 'Medium'
                        CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    likelihood          VARCHAR(20)  DEFAULT 'Possible'
                        CHECK (likelihood IN ('Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare')),
    risk_text           TEXT         NOT NULL,
    mitigation          TEXT         DEFAULT '',
    evidence_required   TEXT         DEFAULT '',
    owner               VARCHAR(255) DEFAULT '',
    status              VARCHAR(20)  DEFAULT 'open'
                        CHECK (status IN ('open', 'mitigating', 'mitigated', 'accepted', 'closed')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_session ON risk_cards(session_id);

-- ─── 9. Roadmap Actions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_actions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id              UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    period                  VARCHAR(50)  NOT NULL DEFAULT 'Days 1-30'
                            CHECK (period IN ('Days 1-30', 'Days 31-60', 'Days 61-90', 'Days 91+')),
    objective               TEXT         NOT NULL,
    action                  TEXT         NOT NULL,
    linked_risk_id          UUID         REFERENCES risk_cards(id) ON DELETE SET NULL,
    linked_assumption_id    UUID         REFERENCES assumption_cards(id) ON DELETE SET NULL,
    evidence_needed         TEXT         DEFAULT '',
    decision_gate           TEXT         DEFAULT '',
    owner                   VARCHAR(255) DEFAULT '',
    status                  VARCHAR(20)  DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'deferred')),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_session ON roadmap_actions(session_id);

-- ─── 10. Reports ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    report_type     VARCHAR(50)  NOT NULL DEFAULT 'executive_summary'
                    CHECK (report_type IN ('executive_summary', 'detailed_assessment',
                           'consultant_brief', 'board_report', 'validation_roadmap')),
    report_status   VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (report_status IN ('draft', 'generating', 'generated', 'reviewed', 'exported', 'failed')),
    generated_by    VARCHAR(100) DEFAULT 'system',
    reviewed_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
    review_status   VARCHAR(20)  DEFAULT 'pending'
                    CHECK (review_status IN ('pending', 'approved', 'rejected', 'revision_needed')),
    generated_at    TIMESTAMPTZ  DEFAULT NOW(),
    storage_uri     VARCHAR(1000) DEFAULT '',
    checksum        VARCHAR(128) DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(report_status);

-- ─── 11. Audit Events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
    session_id      UUID         REFERENCES assessment_sessions(id) ON DELETE SET NULL,
    event_type      VARCHAR(100) NOT NULL,
    component       VARCHAR(100) DEFAULT '',
    action          VARCHAR(255) NOT NULL,
    safe_metadata   JSONB        DEFAULT '{}',
    correlation_id  VARCHAR(100) DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit events are append-only — no UPDATE or DELETE expected
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_events(correlation_id);

-- ─── 12. Agent Runs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID         REFERENCES assessment_sessions(id) ON DELETE SET NULL,
    agent_name          VARCHAR(100) NOT NULL,
    agent_role          VARCHAR(100) NOT NULL DEFAULT '',
    run_status          VARCHAR(20)  NOT NULL DEFAULT 'started'
                        CHECK (run_status IN ('started', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    input_summary       TEXT         DEFAULT '',
    output_summary      TEXT         DEFAULT '',
    evidence_references JSONB        DEFAULT '[]',
    tool_calls_summary  JSONB        DEFAULT '[]',
    error_category      VARCHAR(100) DEFAULT '',
    token_usage         JSONB        DEFAULT '{}',
    cost_estimate       NUMERIC(10,4) DEFAULT 0,
    started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON agent_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at);

-- ─── 13. Agent Artifacts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_artifacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_run_id    UUID         NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    artifact_type   VARCHAR(50)  NOT NULL DEFAULT 'text'
                    CHECK (artifact_type IN ('text', 'json', 'markdown', 'pdf', 'csv', 'image')),
    artifact_name   VARCHAR(255) NOT NULL DEFAULT '',
    storage_uri     VARCHAR(1000) DEFAULT '',
    checksum        VARCHAR(128) DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run ON agent_artifacts(agent_run_id);

-- ─── Document Chunks (pgvector RAG — future use) ──────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content         TEXT         NOT NULL,
    source          VARCHAR(500) DEFAULT '',
    source_type     VARCHAR(100) DEFAULT '',
    region          VARCHAR(100) DEFAULT '',
    metadata        JSONB        DEFAULT '{}',
    embedding       vector(768),
    embedding_text  TEXT         DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_source ON document_chunks(source_type, region);
-- Future: CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── Schema Version Tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, name)
VALUES (1, '001_initial_schema')
ON CONFLICT (version) DO NOTHING;

-- ─── Update Timestamp Trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply auto-update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON expansion_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assumptions_updated_at BEFORE UPDATE ON assumption_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risk_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roadmap_updated_at BEFORE UPDATE ON roadmap_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
