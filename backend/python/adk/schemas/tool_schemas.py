"""
MEP-light™ — ADK Tool Schemas

Pydantic models defining strict input/output schemas for all ADK agent tools.
Every tool call is schema-validated, role-checked, and audit-logged.

Tools are the interface between agentic reasoning and deterministic services.
Agents must use tools for all data access and mutations — no direct DB access.

Charter: "Separation of Evidence from Uncertainty" [16, 17]
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────

class EvidenceConfidence(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    UNKNOWN = "Unknown"

class EvidenceState(str, Enum):
    CONFIRMED = "Confirmed"
    ESTIMATED = "Estimated"
    UNKNOWN = "Unknown"

class AssumptionType(str, Enum):
    DEMAND = "Demand"
    CHANNEL_ACCESS = "Channel Access"
    FINANCIAL_MARGINS = "Financial Margins"
    ADAPTATION = "Adaptation"
    REGULATORY = "Regulatory"
    OPERATIONAL = "Operational"
    MARKET = "Market"

class RiskType(str, Enum):
    MARKET = "Market"
    REGULATORY = "Regulatory"
    FINANCIAL = "Financial"
    OPERATIONAL = "Operational"
    COMPETITIVE = "Competitive"
    REPUTATIONAL = "Reputational"
    TECHNICAL = "Technical"

class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class RoadmapPeriod(str, Enum):
    DAYS_1_30 = "Days 1-30"
    DAYS_31_60 = "Days 31-60"
    DAYS_61_90 = "Days 61-90"
    DAYS_91_PLUS = "Days 91+"

class AllowedRole(str, Enum):
    VIEWER = "Viewer"
    CONSULTANT = "Consultant"
    ADMINISTRATOR = "Administrator"


# ─── Tool Input Schemas ───────────────────────────────────────────────

class GetSessionDataInput(BaseModel):
    """Input for get_session_data tool."""
    session_id: str = Field(..., description="Assessment session UUID")

class GetSessionDataOutput(BaseModel):
    """Output for get_session_data tool."""
    session_id: str
    user_id: str
    company_name: str
    offering_name: str
    status: str
    active_state: str
    decision_mode: str
    expansion_horizon: str
    strategic_objective: str
    input_data: dict
    output_data: dict


class UpdateEvidenceLedgerInput(BaseModel):
    """Input for update_evidence_ledger tool."""
    session_id: str = Field(..., description="Assessment session UUID")
    option_id: Optional[str] = Field(None, description="Expansion option UUID")
    claim: str = Field(..., description="The evidence claim text", min_length=10)
    source_type: str = Field(
        "desk_research",
        description="Source type: internal_data, market_report, expert_judgment, desk_research, agent_research"
    )
    source_reference: str = Field("", description="Source reference (report name, URL, expert)")
    source_url: str = Field("", description="Source URL if available")
    confidence_level: EvidenceConfidence = Field(
        EvidenceConfidence.MEDIUM,
        description="Confidence level of this evidence"
    )
    evidence_state: EvidenceState = Field(
        EvidenceState.ESTIMATED,
        description="State of evidence verification"
    )
    notes: str = Field("", description="Additional notes")

class UpdateEvidenceLedgerOutput(BaseModel):
    """Output for update_evidence_ledger tool."""
    evidence_id: str
    claim: str
    confidence_level: str
    evidence_state: str
    created: bool


class CallScoringEngineInput(BaseModel):
    """Input for call_scoring_engine tool."""
    session_id: str
    company_name: str
    offering_name: str
    markets: list[dict] = Field(..., description="List of {id, name} market objects")
    market_scores: dict = Field(..., description="Market scores keyed by market ID")

class CallScoringEngineOutput(BaseModel):
    """Output for call_scoring_engine tool."""
    success: bool
    dashboard: Optional[dict] = None
    errors: list[str] = Field(default_factory=list)


class CreateAssumptionCardsInput(BaseModel):
    """Input for create_assumption_cards tool."""
    session_id: str
    option_id: Optional[str] = None
    assumptions: list[dict] = Field(
        ...,
        description="List of assumption objects with: assumption_type, assumption_text, confidence_level, validation_action"
    )

class CreateAssumptionCardsOutput(BaseModel):
    """Output for create_assumption_cards tool."""
    created_count: int
    assumption_ids: list[str]


class CreateRiskCardsInput(BaseModel):
    """Input for create_risk_cards tool."""
    session_id: str
    option_id: Optional[str] = None
    risks: list[dict] = Field(
        ...,
        description="List of risk objects with: risk_type, severity, likelihood, risk_text, mitigation"
    )

class CreateRiskCardsOutput(BaseModel):
    """Output for create_risk_cards tool."""
    created_count: int
    risk_ids: list[str]


class CreateRoadmapActionsInput(BaseModel):
    """Input for create_roadmap_actions tool."""
    session_id: str
    actions: list[dict] = Field(
        ...,
        description="List of roadmap action objects with: period, objective, action, evidence_needed, decision_gate"
    )

class CreateRoadmapActionsOutput(BaseModel):
    """Output for create_roadmap_actions tool."""
    created_count: int
    action_ids: list[str]


class DraftReportSectionInput(BaseModel):
    """Input for draft_report_section tool."""
    session_id: str
    section_type: str = Field(
        ...,
        description="Section type: executive_summary, market_comparison, evidence_summary, "
                     "risk_analysis, roadmap, recommendations, disclaimer"
    )
    context: dict = Field(default_factory=dict, description="Context data for drafting")

class DraftReportSectionOutput(BaseModel):
    """Output for draft_report_section tool."""
    section_type: str
    content: str
    word_count: int
    disclaimer_included: bool
    human_review_required: bool = True


class RunGovernanceCheckInput(BaseModel):
    """Input for run_governance_check tool."""
    content: str = Field(..., description="The content to check")
    content_type: str = Field(
        "advisory_text",
        description="Type: advisory_text, assumption, risk, report_section"
    )

class GovernanceViolation(BaseModel):
    """A single governance violation."""
    code: str
    severity: str  # critical, warning, info
    message: str
    location: Optional[str] = None

class RunGovernanceCheckOutput(BaseModel):
    """Output for run_governance_check tool."""
    passed: bool
    violations: list[GovernanceViolation] = Field(default_factory=list)
    checked_rules: list[str] = Field(default_factory=list)


class StoreAgentArtifactInput(BaseModel):
    """Input for store_agent_artifact tool."""
    agent_run_id: str
    artifact_type: str = Field("text", description="Type: text, json, markdown, pdf")
    artifact_name: str
    content: str

class StoreAgentArtifactOutput(BaseModel):
    """Output for store_agent_artifact tool."""
    artifact_id: str
    storage_uri: str
    checksum: str


class CreateHumanHandoffInput(BaseModel):
    """Input for create_human_handoff tool."""
    session_id: str
    reason: str = Field(..., description="Why human review is needed")
    urgency: str = Field("normal", description="Urgency: low, normal, high, critical")
    context: dict = Field(default_factory=dict)
    unresolved_items: list[str] = Field(default_factory=list)

class CreateHumanHandoffOutput(BaseModel):
    """Output for create_human_handoff tool."""
    handoff_id: str
    created: bool
    assigned_to: Optional[str] = None


# ─── Tool Permission Matrix ──────────────────────────────────────────

TOOL_PERMISSIONS = {
    "get_session_data": {
        "allowed_roles": [AllowedRole.VIEWER, AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "update_evidence_ledger": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "call_scoring_engine": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "create_assumption_cards": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "create_risk_cards": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "create_roadmap_actions": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "draft_report_section": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": True,
        "audit_level": "warn",
    },
    "run_governance_check": {
        "allowed_roles": [AllowedRole.VIEWER, AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "store_agent_artifact": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "info",
    },
    "create_human_handoff": {
        "allowed_roles": [AllowedRole.CONSULTANT, AllowedRole.ADMINISTRATOR],
        "requires_human_gate": False,
        "audit_level": "warn",
    },
}
