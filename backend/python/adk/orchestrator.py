"""
MEP-light™ — ADK Orchestrator Agent

The Decision Manager Agent that owns the workflow lifecycle.
Responsible for:
  - Deciding which specialist agent acts next
  - Maintaining workflow state across agent interactions
  - Enforcing product boundaries (no market-entry approvals)
  - Triggering deterministic scoring when needed
  - Escalating to human review when required

This agent uses Google ADK's Agent-as-Tool delegation pattern to
coordinate specialist agents in a controlled, auditable workflow.

Allowed:
  - Read session data
  - Call sub-agents (intake, evidence, risk, roadmap, report, etc.)
  - Call deterministic scoring API
  - Create agent run records
  - Produce internal workflow summaries

Prohibited:
  - Bypass human review gates
  - Make final market-entry decisions
  - Invent facts
  - Approve reports as client-ready
  - Perform hidden or untestable scoring
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger("mep.adk.orchestrator")

# ─── Feature Flag ─────────────────────────────────────────────────────

ADK_ENABLED = False  # Set via environment variable ADK_ENABLED=true

def is_adk_enabled() -> bool:
    """Check if ADK features are enabled via feature flag."""
    import os
    return os.environ.get("ADK_ENABLED", "false").lower() == "true"


# ─── Workflow State ───────────────────────────────────────────────────

@dataclass
class WorkflowState:
    """Tracks the state of an orchestrated ADK workflow."""
    workflow_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    current_phase: str = "intake"
    completed_phases: list = field(default_factory=list)
    pending_agents: list = field(default_factory=list)
    human_gates_pending: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── Workflow Phases ──────────────────────────────────────────────────

WORKFLOW_PHASES = [
    "intake",           # User input collection and clarification
    "business_context", # Business profile analysis
    "offering_analysis",# Offering strategy assessment
    "option_research",  # Market/option research (controlled)
    "scoring",          # Deterministic scoring engine call
    "evidence_curation",# Evidence quality assessment
    "confidence_check", # Confidence and certainty guardrail
    "risk_assessment",  # Risk and assumption card generation
    "roadmap_planning", # Validation roadmap generation
    "report_drafting",  # Report narrative composition
    "governance_check", # Output guardrail validation
    "human_review",     # Human review gate
]


# ─── Orchestrator ─────────────────────────────────────────────────────

class MepOrchestrator:
    """
    MEP-light™ Decision Manager Agent.
    
    Coordinates the multi-agent workflow for market-entry assessment.
    Uses a phase-based approach where each phase maps to one or more
    specialist agents.
    
    The orchestrator never makes substantive decisions itself — it
    delegates to specialist agents and deterministic services.
    """

    def __init__(self, session_id: Optional[str] = None):
        self.state = WorkflowState(session_id=session_id)
        self.agent_registry: dict = {}
        logger.info(
            "Orchestrator initialized",
            extra={
                "workflow_id": self.state.workflow_id,
                "session_id": session_id,
            }
        )

    def register_agent(self, phase: str, agent_callable):
        """Register a specialist agent for a workflow phase."""
        self.agent_registry[phase] = agent_callable
        logger.debug(f"Agent registered for phase: {phase}")

    async def execute_phase(self, phase: str, context: dict) -> dict:
        """
        Execute a single workflow phase by delegating to the registered agent.
        
        Returns a result dict with:
          - status: 'completed', 'needs_human', 'error'
          - output: Phase-specific output data
          - next_phase: Suggested next phase (or None)
          - human_gate: Whether human review is required before proceeding
        """
        if phase not in WORKFLOW_PHASES:
            return {
                "status": "error",
                "output": None,
                "error": f"Unknown phase: {phase}",
                "next_phase": None,
                "human_gate": False,
            }

        agent = self.agent_registry.get(phase)
        if not agent:
            logger.warning(f"No agent registered for phase: {phase}")
            return {
                "status": "skipped",
                "output": None,
                "error": f"No agent registered for phase: {phase}",
                "next_phase": self._get_next_phase(phase),
                "human_gate": False,
            }

        run_id = str(uuid.uuid4())
        logger.info(
            f"Executing phase: {phase}",
            extra={
                "workflow_id": self.state.workflow_id,
                "phase": phase,
                "run_id": run_id,
            }
        )

        try:
            result = await agent(context, run_id=run_id)

            self.state.completed_phases.append(phase)
            self.state.current_phase = self._get_next_phase(phase) or "complete"
            self.state.updated_at = datetime.now(timezone.utc).isoformat()

            # Check for human gate requirement
            human_gate = self._requires_human_gate(phase, result)
            if human_gate:
                self.state.human_gates_pending.append({
                    "phase": phase,
                    "reason": human_gate,
                    "run_id": run_id,
                })

            return {
                "status": "completed" if not human_gate else "needs_human",
                "output": result,
                "next_phase": self.state.current_phase,
                "human_gate": bool(human_gate),
                "human_gate_reason": human_gate,
                "run_id": run_id,
            }

        except Exception as e:
            logger.error(
                f"Phase execution failed: {phase}",
                extra={
                    "workflow_id": self.state.workflow_id,
                    "phase": phase,
                    "error": str(e),
                },
                exc_info=True,
            )
            self.state.errors.append({
                "phase": phase,
                "error": str(e),
                "run_id": run_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return {
                "status": "error",
                "output": None,
                "error": str(e),
                "next_phase": None,
                "human_gate": True,
                "human_gate_reason": f"Agent error in {phase}: {str(e)}",
                "run_id": run_id,
            }

    def _get_next_phase(self, current: str) -> Optional[str]:
        """Get the next phase in the workflow sequence."""
        try:
            idx = WORKFLOW_PHASES.index(current)
            if idx + 1 < len(WORKFLOW_PHASES):
                return WORKFLOW_PHASES[idx + 1]
        except ValueError:
            pass
        return None

    def _requires_human_gate(self, phase: str, result: dict) -> Optional[str]:
        """
        Determine if a phase result requires human review.
        
        Human gates are triggered for:
        - Report drafting (always requires human review before client delivery)
        - High-potential + low-confidence results
        - Governance check failures
        - Unsupported claims detected
        """
        # Report drafts always require human review
        if phase == "report_drafting":
            return "Report drafts require human review before client delivery"

        # Governance failures require human review
        if phase == "governance_check":
            violations = result.get("violations", [])
            if violations:
                return f"Governance violations detected: {len(violations)} issue(s)"

        # Confidence check may trigger human review
        if phase == "confidence_check":
            guardrail_triggered = result.get("certainty_guardrail_triggered", False)
            if guardrail_triggered:
                return "Certainty guardrail triggered — high potential with low evidence confidence"

        return None

    def get_workflow_summary(self) -> dict:
        """Get a summary of the current workflow state."""
        return {
            "workflow_id": self.state.workflow_id,
            "session_id": self.state.session_id,
            "current_phase": self.state.current_phase,
            "completed_phases": self.state.completed_phases,
            "pending_human_gates": len(self.state.human_gates_pending),
            "errors": len(self.state.errors),
            "started_at": self.state.started_at,
            "updated_at": self.state.updated_at,
        }
