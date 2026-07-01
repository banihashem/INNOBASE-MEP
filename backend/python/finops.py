"""
MEP-light™ — FinOps Circuit Breaker & Token Budget Controls

Implements:
  1. Per-session token budget tracking (max 2M tokens)
  2. Consecutive turn circuit breaker (max 10 turns without resolution)
  3. FastAPI dependencies for injection into agentic endpoints

Blueprint reference:
  "FinOps Circuit Breakers: Implements token-budget caps (maximum 2 million
   tokens per session) and a step circuit breaker that automatically halts
   multi-agent loops if they exceed 10 consecutive turns" [§4.2]

Charter compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
"""

import logging
import time
from typing import Optional
from collections import defaultdict

from fastapi import Depends, HTTPException, Request, status

from .metrics import TOKEN_CONSUMPTION

logger = logging.getLogger("mep.finops")

# ─── Constants ────────────────────────────────────────────────────────

MAX_TOKENS_PER_SESSION = 2_000_000       # 2M token budget cap
MAX_CONSECUTIVE_TURNS = 10                # Circuit breaker turn limit
TOKEN_WARNING_THRESHOLD = 0.85            # Warn at 85% of budget


# ─── In-Memory Session Trackers ──────────────────────────────────────
# In production, these would be backed by Redis or the database.

_session_token_usage: dict[str, int] = defaultdict(int)
_session_turn_counts: dict[str, int] = defaultdict(int)
_session_last_activity: dict[str, float] = {}

# Session timeout: reset counters after 1 hour of inactivity
SESSION_IDLE_TIMEOUT = 3600


# ─── Token Budget Tracking ───────────────────────────────────────────

def record_token_usage(
    session_id: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> dict:
    """
    Record token consumption for a session and check budget.

    Returns:
        dict with budget status, remaining tokens, and whether the limit
        has been exceeded.
    """
    _cleanup_stale_sessions()

    total_new = input_tokens + output_tokens
    _session_token_usage[session_id] += total_new
    _session_last_activity[session_id] = time.time()

    # Track in Prometheus
    if input_tokens > 0:
        TOKEN_CONSUMPTION.labels(direction="input").inc(input_tokens)
    if output_tokens > 0:
        TOKEN_CONSUMPTION.labels(direction="output").inc(output_tokens)

    current_usage = _session_token_usage[session_id]
    remaining = max(0, MAX_TOKENS_PER_SESSION - current_usage)
    exceeded = current_usage > MAX_TOKENS_PER_SESSION
    warning = current_usage >= (MAX_TOKENS_PER_SESSION * TOKEN_WARNING_THRESHOLD)

    if exceeded:
        logger.critical(
            "TOKEN_BUDGET_EXCEEDED for session %s. Usage: %d / %d",
            session_id, current_usage, MAX_TOKENS_PER_SESSION,
            extra={
                "session_id": session_id,
                "finops_alert": "BUDGET_EXCEEDED",
                "total_tokens": current_usage,
                "max_tokens": MAX_TOKENS_PER_SESSION,
            },
        )
    elif warning:
        logger.warning(
            "Token budget at %.0f%% for session %s. Usage: %d / %d",
            (current_usage / MAX_TOKENS_PER_SESSION) * 100,
            session_id, current_usage, MAX_TOKENS_PER_SESSION,
            extra={
                "session_id": session_id,
                "finops_alert": "BUDGET_WARNING",
                "total_tokens": current_usage,
            },
        )

    return {
        "session_id": session_id,
        "total_tokens_used": current_usage,
        "remaining_tokens": remaining,
        "budget_exceeded": exceeded,
        "budget_warning": warning,
    }


# ─── Turn Circuit Breaker ────────────────────────────────────────────

def record_agentic_turn(session_id: str) -> dict:
    """
    Record an agentic turn and check circuit breaker.

    If the session exceeds MAX_CONSECUTIVE_TURNS without resolution,
    the circuit breaker trips.

    Returns:
        dict with turn count and whether the breaker has tripped.
    """
    _session_turn_counts[session_id] += 1
    _session_last_activity[session_id] = time.time()

    current_turns = _session_turn_counts[session_id]
    tripped = current_turns >= MAX_CONSECUTIVE_TURNS

    if tripped:
        logger.critical(
            "CIRCUIT_BREAKER_TRIPPED for session %s after %d consecutive turns. "
            "Halting agentic loop to prevent runaway compute.",
            session_id, current_turns,
            extra={
                "session_id": session_id,
                "finops_alert": "CIRCUIT_BREAKER_TRIPPED",
                "consecutive_turns": current_turns,
                "max_turns": MAX_CONSECUTIVE_TURNS,
            },
        )

    return {
        "session_id": session_id,
        "consecutive_turns": current_turns,
        "max_turns": MAX_CONSECUTIVE_TURNS,
        "circuit_breaker_tripped": tripped,
    }


def reset_turn_counter(session_id: str) -> None:
    """Reset the turn counter when a resolution is achieved."""
    _session_turn_counts[session_id] = 0
    logger.info(
        "Turn counter reset for session %s",
        session_id,
        extra={"session_id": session_id},
    )


# ─── FastAPI Dependencies ────────────────────────────────────────────

def check_token_budget(session_id: str) -> None:
    """
    FastAPI dependency: raises 429 if the session's token budget is exceeded.

    Usage:
        @router.post("/endpoint")
        async def my_endpoint(
            session_id: str,
            _budget=Depends(lambda: check_token_budget(session_id))
        ):
            ...
    """
    current_usage = _session_token_usage.get(session_id, 0)
    if current_usage >= MAX_TOKENS_PER_SESSION:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Token budget exceeded",
                "message": (
                    f"Session has consumed {current_usage:,} tokens, exceeding the "
                    f"maximum budget of {MAX_TOKENS_PER_SESSION:,} tokens. "
                    f"Start a new session to continue."
                ),
                "code": "FINOPS_BUDGET_EXCEEDED",
                "total_tokens_used": current_usage,
                "max_tokens": MAX_TOKENS_PER_SESSION,
            },
        )


def check_circuit_breaker(session_id: str) -> None:
    """
    FastAPI dependency: raises 429 if the circuit breaker has tripped.

    Usage:
        @router.post("/endpoint")
        async def my_endpoint(
            session_id: str,
            _breaker=Depends(lambda: check_circuit_breaker(session_id))
        ):
            ...
    """
    current_turns = _session_turn_counts.get(session_id, 0)
    if current_turns >= MAX_CONSECUTIVE_TURNS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Circuit breaker tripped",
                "message": (
                    f"Session has exceeded {MAX_CONSECUTIVE_TURNS} consecutive "
                    f"agentic turns without resolution. The loop has been halted "
                    f"to prevent runaway compute costs. Reset the session to continue."
                ),
                "code": "FINOPS_CIRCUIT_BREAKER",
                "consecutive_turns": current_turns,
                "max_turns": MAX_CONSECUTIVE_TURNS,
            },
        )


# ─── Session Status ──────────────────────────────────────────────────

def get_session_finops_status(session_id: str) -> dict:
    """Get the current FinOps status for a session."""
    current_usage = _session_token_usage.get(session_id, 0)
    current_turns = _session_turn_counts.get(session_id, 0)

    return {
        "session_id": session_id,
        "token_budget": {
            "used": current_usage,
            "max": MAX_TOKENS_PER_SESSION,
            "remaining": max(0, MAX_TOKENS_PER_SESSION - current_usage),
            "percent_used": round((current_usage / MAX_TOKENS_PER_SESSION) * 100, 1),
            "exceeded": current_usage >= MAX_TOKENS_PER_SESSION,
        },
        "circuit_breaker": {
            "consecutive_turns": current_turns,
            "max_turns": MAX_CONSECUTIVE_TURNS,
            "tripped": current_turns >= MAX_CONSECUTIVE_TURNS,
        },
    }


def reset_session(session_id: str) -> None:
    """Fully reset FinOps counters for a session."""
    _session_token_usage.pop(session_id, None)
    _session_turn_counts.pop(session_id, None)
    _session_last_activity.pop(session_id, None)
    logger.info("FinOps counters reset for session %s", session_id)


# ─── Internal Cleanup ────────────────────────────────────────────────

def _cleanup_stale_sessions() -> None:
    """Remove tracking data for sessions that have been idle too long."""
    now = time.time()
    stale = [
        sid for sid, last in _session_last_activity.items()
        if now - last > SESSION_IDLE_TIMEOUT
    ]
    for sid in stale:
        reset_session(sid)
