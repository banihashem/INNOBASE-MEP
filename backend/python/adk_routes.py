"""
MEP-light™ — ADK API Routes

FastAPI endpoints for controlled ADK workflow execution.
All endpoints are behind the ADK_ENABLED feature flag and require
Consultant or Administrator role.

Endpoints:
  POST /api/v2/adk/workflows/start     — Start a new ADK workflow
  GET  /api/v2/adk/workflows/{id}      — Get workflow status
  POST /api/v2/adk/workflows/{id}/step  — Execute next workflow step
  POST /api/v2/adk/governance/check     — Run governance check on content
  GET  /api/v2/adk/health               — ADK service health check
  GET  /api/v2/adk/agent-runs           — List agent runs for a session
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import require_consultant, verify_token
from .adk.orchestrator import MepOrchestrator, is_adk_enabled, WORKFLOW_PHASES
from .adk.governance_agent import run_full_governance_check

logger = logging.getLogger("mep.adk.routes")

router = APIRouter(prefix="/api/v2/adk", tags=["adk"])


# ─── Feature Flag Guard ──────────────────────────────────────────────

def require_adk_enabled():
    """Dependency that checks if ADK is enabled."""
    if not is_adk_enabled():
        raise HTTPException(
            status_code=503,
            detail="ADK features are not enabled. Set ADK_ENABLED=true to activate."
        )


# ─── Request/Response Models ─────────────────────────────────────────

class StartWorkflowRequest(BaseModel):
    session_id: str = Field(..., description="Assessment session ID")

class StartWorkflowResponse(BaseModel):
    workflow_id: str
    session_id: str
    current_phase: str
    phases: list[str]
    status: str

class StepWorkflowRequest(BaseModel):
    context: dict = Field(default_factory=dict, description="Additional context for this step")

class GovernanceCheckRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Content to check")
    content_type: str = Field(
        "advisory_text",
        description="Type: advisory_text, assumption, risk, report_section"
    )


# ─── Active Workflows (in-memory for now, DB in Phase 4.6) ──────────

_active_workflows: dict[str, MepOrchestrator] = {}


# ─── Endpoints ────────────────────────────────────────────────────────

@router.get("/health")
async def adk_health():
    """ADK service health check — reports feature flag status."""
    return {
        "service": "MEP-light™ ADK Agent Service",
        "version": "0.1.0",
        "enabled": is_adk_enabled(),
        "available_phases": WORKFLOW_PHASES,
        "active_workflows": len(_active_workflows),
        "charter": "Clarify Preparedness, Do Not Predict Success",
    }


@router.post("/workflows/start", dependencies=[Depends(require_adk_enabled)])
async def start_workflow(
    body: StartWorkflowRequest,
    user: dict = Depends(require_consultant),
):
    """
    Start a new ADK-orchestrated workflow for an assessment session.
    Requires Consultant or Administrator role.
    """
    orchestrator = MepOrchestrator(session_id=body.session_id)
    _active_workflows[orchestrator.state.workflow_id] = orchestrator

    logger.info(
        "ADK workflow started",
        extra={
            "workflow_id": orchestrator.state.workflow_id,
            "session_id": body.session_id,
            "user_email": user.get("email", "unknown"),
        }
    )

    return {
        "workflow_id": orchestrator.state.workflow_id,
        "session_id": body.session_id,
        "current_phase": orchestrator.state.current_phase,
        "phases": WORKFLOW_PHASES,
        "status": "started",
    }


@router.get("/workflows/{workflow_id}", dependencies=[Depends(require_adk_enabled)])
async def get_workflow_status(
    workflow_id: str,
    user: dict = Depends(require_consultant),
):
    """Get the current status of an ADK workflow."""
    orchestrator = _active_workflows.get(workflow_id)
    if not orchestrator:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return orchestrator.get_workflow_summary()


@router.post("/workflows/{workflow_id}/step", dependencies=[Depends(require_adk_enabled)])
async def step_workflow(
    workflow_id: str,
    body: StepWorkflowRequest,
    user: dict = Depends(require_consultant),
):
    """
    Execute the next phase in an ADK workflow.
    Returns the phase result and whether a human gate is required.
    """
    orchestrator = _active_workflows.get(workflow_id)
    if not orchestrator:
        raise HTTPException(status_code=404, detail="Workflow not found")

    current_phase = orchestrator.state.current_phase
    if current_phase == "complete":
        return {
            "status": "workflow_complete",
            "message": "All phases have been completed.",
            "summary": orchestrator.get_workflow_summary(),
        }

    result = await orchestrator.execute_phase(current_phase, body.context)

    logger.info(
        "ADK workflow step executed",
        extra={
            "workflow_id": workflow_id,
            "phase": current_phase,
            "status": result.get("status"),
            "human_gate": result.get("human_gate", False),
            "user_email": user.get("email", "unknown"),
        }
    )

    return {
        "phase_executed": current_phase,
        "result": result,
        "workflow_summary": orchestrator.get_workflow_summary(),
    }


@router.post("/governance/check")
async def governance_check(
    body: GovernanceCheckRequest,
    user: dict = Depends(verify_token),
):
    """
    Run a governance check on content.
    Available to all authenticated users (no feature flag required).
    Checks for overconfidence, approval language, legal/financial advice,
    missing uncertainty markers, and PII exposure.
    """
    result = run_full_governance_check(
        content=body.content,
        content_type=body.content_type,
    )

    logger.info(
        "Governance check executed",
        extra={
            "content_type": body.content_type,
            "passed": result["passed"],
            "violations": len(result["violations"]),
            "user_email": user.get("email", "unknown"),
        }
    )

    return result


@router.get("/agent-runs", dependencies=[Depends(require_adk_enabled)])
async def list_agent_runs(
    session_id: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_consultant),
):
    """
    List agent runs, optionally filtered by session.
    Agent run records are persisted in the production database.
    """
    # TODO: Query from database once PostgreSQL migration is complete
    return {
        "agent_runs": [],
        "total": 0,
        "note": "Agent run persistence pending Cloud SQL migration",
    }
