"""
MEP-light™ — ADK Agent Module

Google ADK-based multi-agent system for MEP-light™ workflows.
This module provides the agentic intelligence layer for evidence-grounded
market-entry advisory support.

Architecture:
  - Orchestrator Agent: Workflow coordination and dispatch
  - Specialist Agents: Domain-specific reasoning (evidence, risk, roadmap, etc.)
  - Tool Layer: Structured, audited tool calls to deterministic services
  - Governance: Output validation and guardrail enforcement

All agent outputs are advisory, cautious, and validation-oriented.
No agent may issue final market-entry approvals or guarantee outcomes.

Charter Compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
  "Separation of Evidence from Uncertainty" [16, 17]
"""

__version__ = "0.1.0"
