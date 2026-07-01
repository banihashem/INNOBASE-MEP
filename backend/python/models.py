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

    # For pgvector: embedding column is added via migration
    # For SQLite: we use keyword search as fallback
    embedding_text = Column(Text, default="")  # Searchable text representation

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
