"""
MEP-light™ — SQLAlchemy ORM Models

Defines the relational schema for enterprise state persistence:
  - client_companies: Company profiles and metadata
  - user_sessions: Active assessment sessions with FSM state
  - market_scores: Per-market dimension scores linked to sessions
  - document_chunks: pgvector-indexed document embeddings for RAG
  - audit_log: Immutable record of all state-changing operations
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from .database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _gen_uuid():
    return str(uuid.uuid4())


# ─── Client Companies ───────────────────────────────────────────────

class ClientCompany(Base):
    __tablename__ = "client_companies"

    company_id = Column(String(36), primary_key=True, default=_gen_uuid)
    company_name = Column(String(255), nullable=False, default="Client Company")
    sector = Column(String(100), nullable=False)
    domestic_market_size = Column(String(255), default="")
    export_experience = Column(String(100), default="No Experience")
    capabilities = Column(Text, default="")
    constraints = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    sessions = relationship("UserSession", back_populates="company", cascade="all, delete-orphan")


# ─── User Sessions ──────────────────────────────────────────────────

class UserSession(Base):
    __tablename__ = "user_sessions"

    session_id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(String(255), nullable=False)
    user_email = Column(String(255), default="")
    user_role = Column(String(50), default="Viewer")
    company_id = Column(String(36), ForeignKey("client_companies.company_id"), nullable=True)

    # FSM state
    active_state = Column(String(50), nullable=False, default="SETUP")

    # Decision setup
    decision_mode = Column(String(50), default="compare")
    expansion_horizon = Column(String(50), default="12 months")
    strategic_objective = Column(Text, default="")
    decision_statement = Column(Text, default="")

    # Offering
    selected_offering = Column(String(255), default="Selected Offering")
    selected_strategy = Column(String(100), default="")

    # Consultant notes
    consultant_notes = Column(Text, default="")

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    company = relationship("ClientCompany", back_populates="sessions")
    scores = relationship("MarketScore", back_populates="session", cascade="all, delete-orphan")


# ─── Market Scores ──────────────────────────────────────────────────

class MarketScore(Base):
    __tablename__ = "market_scores"

    score_id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("user_sessions.session_id", ondelete="CASCADE"), nullable=False)
    market_name = Column(String(100), nullable=False)
    market_type = Column(String(50), nullable=False, default="Country")

    # Raw dimension scores (1-5)
    attractiveness_raw = Column(Integer, CheckConstraint("attractiveness_raw BETWEEN 1 AND 5"))
    offering_fit_raw = Column(Integer, CheckConstraint("offering_fit_raw BETWEEN 1 AND 5"))
    channel_access_raw = Column(Integer, CheckConstraint("channel_access_raw BETWEEN 1 AND 5"))
    competitor_intensity_raw = Column(Integer, CheckConstraint("competitor_intensity_raw BETWEEN 1 AND 5"))
    regulatory_complexity_raw = Column(Integer, CheckConstraint("regulatory_complexity_raw BETWEEN 1 AND 5"))
    operational_feasibility_raw = Column(Integer, CheckConstraint("operational_feasibility_raw BETWEEN 1 AND 5"))
    brand_transferability_raw = Column(Integer, CheckConstraint("brand_transferability_raw BETWEEN 1 AND 5"))
    strategic_value_raw = Column(Integer, CheckConstraint("strategic_value_raw BETWEEN 1 AND 5"))
    financial_logic_raw = Column(Integer, CheckConstraint("financial_logic_raw BETWEEN 1 AND 5"))

    # Evidence
    evidence_basis = Column(String(100), default="")
    evidence_confidence = Column(String(20), default="Medium")
    notes = Column(Text, default="")

    # Computed results (cached after scoring)
    expansion_potential_score = Column(Integer, nullable=True)
    tier_classification = Column(String(50), nullable=True)
    risk_level = Column(String(20), nullable=True)

    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    session = relationship("UserSession", back_populates="scores")

    __table_args__ = (
        Index("ix_market_scores_session", "session_id"),
    )


# ─── Document Chunks (pgvector RAG) ─────────────────────────────────

# Conditionally import pgvector for embedding column
try:
    from pgvector.sqlalchemy import Vector
    _HAS_PGVECTOR = True
except ImportError:
    _HAS_PGVECTOR = False


class DocumentChunk(Base):
    """
    Stores embedded document chunks for the RAG pipeline.
    Uses pgvector for similarity search in PostgreSQL.
    Falls back to text search in SQLite.
    """
    __tablename__ = "document_chunks"

    chunk_id = Column(String(36), primary_key=True, default=_gen_uuid)
    content = Column(Text, nullable=False)
    source = Column(String(500), default="")
    source_type = Column(String(100), default="")  # regulation, trade_guide, standard
    region = Column(String(100), default="")        # UAE, Middle East, etc.
    metadata_json = Column(JSON, default=dict)

    # For pgvector: 768-dimensional embedding vector (text-embedding-004 output)
    # This column is only active when pgvector extension is available.
    if _HAS_PGVECTOR:
        embedding = Column(Vector(768), nullable=True)

    # For SQLite / keyword fallback: searchable text representation
    embedding_text = Column(Text, default="")

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("ix_document_chunks_source", "source_type", "region"),
    )


# ─── Audit Log ──────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"

    log_id = Column(String(36), primary_key=True, default=_gen_uuid)
    timestamp = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    user_id = Column(String(255), default="")
    user_role = Column(String(50), default="")
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), default="")
    resource_id = Column(String(36), default="")
    details = Column(JSON, default=dict)

    __table_args__ = (
        Index("ix_audit_log_timestamp", "timestamp"),
        Index("ix_audit_log_user", "user_id"),
    )


# ═══════════════════════════════════════════════════════════════════════
# ─── Phase 4: Production 13-Entity Schema ─────────────────────────────
# ═══════════════════════════════════════════════════════════════════════
# These models align with backend/migrations/001_initial_schema.sql
# and backend/src/db_client.ts for cross-runtime consistency.

class User(Base):
    """Production user table — mirrors db_client.ts DbUser."""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    provider = Column(String(50), nullable=False, default="google")
    provider_subject = Column(String(255), nullable=False, default="")
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False, default="")
    picture_url = Column(Text, default="")
    role = Column(String(50), nullable=False, default="Viewer")
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assessment_sessions = relationship("AssessmentSession", back_populates="user", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="user")

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_role", "role"),
    )


class AssessmentSession(Base):
    """Production assessment session — mirrors db_client.ts DbSession."""
    __tablename__ = "assessment_sessions"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False, default="Untitled Session")
    company_name = Column(String(255), default="")
    offering_name = Column(String(255), default="")
    status = Column(String(50), nullable=False, default="draft")
    active_state = Column(String(50), nullable=False, default="SETUP")
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    consultant_notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="assessment_sessions")
    expansion_options = relationship("ExpansionOption", back_populates="session", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="session", cascade="all, delete-orphan")
    evidence_items = relationship("EvidenceItem", back_populates="session", cascade="all, delete-orphan")
    assumption_cards = relationship("AssumptionCard", back_populates="session", cascade="all, delete-orphan")
    risk_cards = relationship("RiskCard", back_populates="session", cascade="all, delete-orphan")
    roadmap_actions = relationship("RoadmapAction", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_assessment_sessions_user", "user_id"),
        Index("ix_assessment_sessions_status", "status"),
    )


class ExpansionOption(Base):
    """Market/channel option within an assessment session."""
    __tablename__ = "expansion_options"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    market_name = Column(String(255), nullable=False)
    market_type = Column(String(50), nullable=False, default="Country")
    channel_strategy = Column(String(255), default="")
    status = Column(String(50), default="active")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="expansion_options")


class Score(Base):
    """9-dimension score record for a market within a session."""
    __tablename__ = "scores"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    expansion_option_id = Column(String(64), ForeignKey("expansion_options.id", ondelete="SET NULL"), nullable=True)
    market_name = Column(String(255), nullable=False)

    # Raw dimension scores (1-5)
    attractiveness = Column(Integer)
    offering_fit = Column(Integer)
    channel_access = Column(Integer)
    competitive_intensity = Column(Integer)
    regulatory_complexity = Column(Integer)
    operational_feasibility = Column(Integer)
    brand_transferability = Column(Integer)
    strategic_value = Column(Integer)
    financial_logic = Column(Integer)

    # Computed results
    expansion_potential_score = Column(Integer, nullable=True)
    tier_classification = Column(String(10), nullable=True)
    risk_level = Column(String(20), nullable=True)
    risk_exposure = Column(Float, nullable=True)
    evidence_confidence = Column(String(20), default="Medium")
    evidence_confidence_score = Column(Integer, nullable=True)
    warnings = Column(JSON, default=list)

    scored_at = Column(DateTime(timezone=True), default=_utcnow)
    scored_by = Column(String(100), default="scoring_engine_v3")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="scores")

    __table_args__ = (
        Index("ix_scores_session", "session_id"),
    )


class EvidenceItem(Base):
    """Evidence ledger entry linked to a session."""
    __tablename__ = "evidence_items"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    dimension = Column(String(100), nullable=False)
    market_name = Column(String(255), default="")
    source_type = Column(String(100), default="")
    source_url = Column(Text, default="")
    source_title = Column(String(500), default="")
    excerpt = Column(Text, default="")
    confidence = Column(String(20), default="Medium")
    added_by = Column(String(100), default="consultant")
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="evidence_items")

    __table_args__ = (
        Index("ix_evidence_session_dim", "session_id", "dimension"),
    )


class AssumptionCard(Base):
    """Structured assumption tracking."""
    __tablename__ = "assumption_cards"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    statement = Column(Text, nullable=False)
    dimension = Column(String(100), default="")
    market_name = Column(String(255), default="")
    impact_if_wrong = Column(String(20), default="Medium")
    validation_method = Column(Text, default="")
    status = Column(String(50), default="untested")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="assumption_cards")


class RiskCard(Base):
    """Risk register entry."""
    __tablename__ = "risk_cards"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    risk_title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    market_name = Column(String(255), default="")
    probability = Column(String(20), default="Medium")
    impact = Column(String(20), default="Medium")
    mitigation = Column(Text, default="")
    status = Column(String(50), default="open")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="risk_cards")


class RoadmapAction(Base):
    """30-60-90 day validation action."""
    __tablename__ = "roadmap_actions"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    action_title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    market_name = Column(String(255), default="")
    time_horizon = Column(String(50), default="30 days")
    priority = Column(String(20), default="Medium")
    owner = Column(String(255), default="")
    status = Column(String(50), default="planned")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="roadmap_actions")


class Report(Base):
    """Report metadata with storage URI."""
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(100), nullable=False, default="assessment")
    title = Column(String(500), default="")
    format = Column(String(50), default="pdf")
    storage_uri = Column(Text, default="")
    generated_by = Column(String(100), default="system")
    status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("AssessmentSession", back_populates="reports")


class AuditEvent(Base):
    """Immutable audit trail — mirrors db_client.ts DbAuditEvent."""
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    user_id = Column(String(64), nullable=True)
    session_id = Column(String(64), nullable=True)
    event_type = Column(String(100), nullable=False)
    component = Column(String(100), default="")
    action = Column(String(200), nullable=False)
    safe_metadata = Column(JSON, default=dict)
    correlation_id = Column(String(100), default="")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        Index("ix_audit_events_created", "created_at"),
        Index("ix_audit_events_user", "user_id"),
        Index("ix_audit_events_type", "event_type"),
    )


class AgentRun(Base):
    """ADK agent execution record."""
    __tablename__ = "agent_runs"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    session_id = Column(String(64), ForeignKey("assessment_sessions.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    agent_name = Column(String(100), nullable=False)
    agent_role = Column(String(100), default="")
    run_status = Column(String(50), nullable=False, default="started")
    input_summary = Column(Text, default="")
    output_summary = Column(Text, default="")
    evidence_references = Column(JSON, default=list)
    tool_calls_summary = Column(JSON, default=list)
    error_category = Column(String(100), default="")
    token_usage = Column(JSON, default=dict)
    cost_estimate = Column(Float, default=0)
    started_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="agent_runs")
    artifacts = relationship("AgentArtifact", back_populates="agent_run", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_agent_runs_session", "session_id"),
        Index("ix_agent_runs_status", "run_status"),
    )


class AgentArtifact(Base):
    """Agent output artifact storage metadata."""
    __tablename__ = "agent_artifacts"

    id = Column(String(64), primary_key=True, default=_gen_uuid)
    agent_run_id = Column(String(64), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False)
    artifact_type = Column(String(100), nullable=False)
    title = Column(String(500), default="")
    content_summary = Column(Text, default="")
    storage_uri = Column(Text, default="")
    format = Column(String(50), default="json")
    size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    agent_run = relationship("AgentRun", back_populates="artifacts")

