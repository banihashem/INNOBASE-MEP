# MEP-light™ — ADK Deep Research Report

**Version**: 1.0  
**Date**: 2026-07-03  
**Author**: Principal Product Architect (Agent)  
**Status**: Draft — requires human review  

---

## 1. Executive Summary

This report evaluates **Google Agent Development Kit (ADK) 2.0** as the multi-agent framework for MEP-light™'s advisory intelligence layer. The assessment covers ADK's architecture, the specific agent topology needed for MEP-light™, integration patterns with the existing Express/TypeScript + FastAPI/Python hybrid backend, and production deployment on Cloud Run.

**Key Finding**: ADK 2.0 is a production-ready, Python-first framework that provides the exact orchestration, delegation, and tooling abstractions MEP-light™ requires. The recommended architecture is a **Hybrid Gateway model** where the existing Express/TypeScript API server remains the primary HTTP gateway, and ADK agents run within the FastAPI/Python service, exposed via internal API endpoints.

---

## 2. ADK 2.0 Architecture Assessment

### 2.1 Core Architecture

ADK 2.0 is built on three pillars:

| Pillar | Description | MEP-light™ Relevance |
|--------|-------------|---------------------|
| **Agent** | Autonomous reasoning unit with instructions, model access, and tools | Each specialist (Evidence, Risk, Roadmap, etc.) is an Agent |
| **Tool** | Structured function with schema-validated I/O | All data access, scoring, governance checks are Tools |
| **Workflow Runtime** | Graph-based execution with deterministic + LLM nodes | Assessment workflow phases map to graph nodes |

### 2.2 Agent Patterns Evaluated

| Pattern | Description | Selected? | Reason |
|---------|-------------|-----------|--------|
| **Orchestrator-Worker** | Central agent delegates to specialists | ✅ Yes | Decision Manager dispatches to domain agents |
| **Agent-as-Tool** | Parent uses child agent as a callable tool | ✅ Yes | Sub-agents appear as tools to the orchestrator |
| **Sequential Pipeline** | Agents execute in strict sequence | ⚠️ Partial | Some phases are sequential (intake → scoring → report) |
| **Parallel Fan-out** | Multiple agents run simultaneously | ⚠️ Future | Evidence research can parallelize across markets |
| **A2A Protocol** | Cross-language agent communication | ❌ No | Single-language (Python) sufficient for Phase 4 |

### 2.3 ADK vs. Alternatives

| Framework | Strengths | Weaknesses | Decision |
|-----------|-----------|------------|----------|
| **ADK 2.0** | Google-native, Cloud Run-ready, built-in eval, Python-first | Python-only for full features | ✅ Selected |
| **LangGraph** | Mature, graph-based, good debugging | Not Google-native, no built-in A2A | ❌ |
| **CrewAI** | Simple multi-agent API | Less structured tooling, no built-in governance | ❌ |
| **AutoGen** | Strong multi-agent conversation | Complex setup, Microsoft-aligned | ❌ |
| **Custom** | Full control | Massive development effort, no evaluation framework | ❌ |

---

## 3. MEP-light™ Agent Topology

### 3.1 Agent Registry (15 Agents)

| # | Agent | Role | Phase | Tools |
|---|-------|------|-------|-------|
| 1 | **Decision Manager** | Orchestrator | All | dispatch, workflow_state |
| 2 | **Intake Clarifier** | User input quality | intake | get_session_data, create_human_handoff |
| 3 | **Business Context** | Company profile analysis | business_context | get_session_data, update_evidence_ledger |
| 4 | **Offering Analyst** | Product-market fit | offering_analysis | get_session_data, update_evidence_ledger |
| 5 | **Market Researcher** | Controlled research | option_research | get_session_data, update_evidence_ledger |
| 6 | **Scoring Executor** | Deterministic scoring | scoring | call_scoring_engine |
| 7 | **Evidence Curator** | Evidence quality assessment | evidence_curation | get_session_data, update_evidence_ledger |
| 8 | **Confidence Assessor** | Certainty guardrail | confidence_check | get_session_data |
| 9 | **Risk Analyst** | Risk identification | risk_assessment | create_risk_cards, create_assumption_cards |
| 10 | **Roadmap Planner** | Validation roadmap | roadmap_planning | create_roadmap_actions |
| 11 | **Report Composer** | Narrative generation | report_drafting | draft_report_section, create_human_handoff |
| 12 | **Governance Guard** | Output validation | governance_check | run_governance_check |
| 13 | **Evaluation Agent** | Quality assurance | evaluation | run_governance_check |
| 14 | **Document Ingester** | RAG document processing | background | store_agent_artifact |
| 15 | **Session Summarizer** | Session state summary | all | get_session_data |

### 3.2 Agent Interaction Diagram

```
                    ┌───────────────────────┐
                    │   Decision Manager    │
                    │   (Orchestrator)      │
                    └─────────┬─────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐     ┌──────▼──────┐     ┌──────▼──────┐
    │  Intake    │     │  Business   │     │  Offering   │
    │  Clarifier │     │  Context    │     │  Analyst    │
    └─────┬─────┘     └──────┬──────┘     └──────┬──────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐     ┌──────▼──────┐     ┌──────▼──────┐
    │  Market    │     │  Scoring    │     │  Evidence   │
    │  Researcher│     │  Executor   │     │  Curator    │
    └─────┬─────┘     └──────┬──────┘     └──────┬──────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐     ┌──────▼──────┐     ┌──────▼──────┐
    │ Confidence │     │   Risk      │     │  Roadmap    │
    │ Assessor   │     │   Analyst   │     │  Planner    │
    └─────┬─────┘     └──────┬──────┘     └──────┬──────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐     ┌──────▼──────┐     ┌──────▼──────┐
    │  Report    │     │ Governance  │     │ Evaluation  │
    │  Composer  │     │   Guard     │     │   Agent     │
    └────────────┘     └─────────────┘     └─────────────┘
```

### 3.3 Human Gate Locations

| Gate | After Phase | Trigger Condition |
|------|------------|-------------------|
| **Input Review** | intake | Incomplete or ambiguous business context |
| **Evidence Review** | evidence_curation | Low-confidence evidence on high-potential markets |
| **Scoring Review** | confidence_check | Certainty guardrail triggered |
| **Report Review** | report_drafting | Always — all reports require human review |
| **Governance Escalation** | governance_check | Critical governance violations |

---

## 4. Integration Architecture

### 4.1 Hybrid Gateway Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Run Container                        │
│                                                               │
│  ┌──────────────────────┐    ┌─────────────────────────────┐ │
│  │  Express.js           │    │  FastAPI/Python              │ │
│  │  (Primary HTTP GW)    │    │  (ADK Agent Service)         │ │
│  │                        │    │                               │ │
│  │  /api/health          │    │  /api/v2/adk/health          │ │
│  │  /api/score           │    │  /api/v2/adk/workflows/*     │ │
│  │  /api/v2/sessions/*   │    │  /api/v2/adk/governance/*    │ │
│  │  /api/v2/users/*      │    │  /api/v2/score (Python)      │ │
│  │  /api/export-pdf      │    │  /api/v2/rag/*               │ │
│  │                        │    │                               │ │
│  │  Port 8080            │    │  Port 8000                    │ │
│  └────────────┬───────────┘    └───────────┬──────────────────┘ │
│               │                            │                     │
│               │     ┌──────────────────┐   │                     │
│               └─────│  Cloud SQL       │───┘                     │
│                     │  PostgreSQL 16   │                          │
│                     └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Dockerfile Update Required

The current Dockerfile only starts the Express/TypeScript server. To serve the ADK layer, we need to:

1. Add Python 3.12 to the production image
2. Install Python dependencies from `backend/python/requirements.txt`
3. Use a process manager (e.g., `supervisord`) to run both Express (port 8080) and FastAPI (port 8000)
4. OR: Consolidate to a single Python server with FastAPI serving both the static frontend and all API endpoints (future Phase 5)

**Recommended (Phase 4)**: Use `supervisord` to run both servers in a single container:
- Express.js on port 8080 (primary gateway + static assets)
- FastAPI on port 8000 (ADK + scoring + RAG)
- Express proxies `/api/v2/adk/*` and `/api/v2/score` to FastAPI

---

## 5. ADK Agent Instructions (Skeletons)

### 5.1 Decision Manager Instruction

```
You are the MEP-light™ Decision Manager Agent.
Your role: Coordinate the multi-agent assessment workflow.

RULES:
1. You NEVER make substantive advisory decisions yourself.
2. You delegate ALL domain reasoning to specialist agents.
3. You enforce human review gates at mandatory checkpoints.
4. You track workflow state and ensure phase completion.
5. You escalate errors to human review immediately.

WORKFLOW PHASES (in order):
intake → business_context → offering_analysis → option_research →
scoring → evidence_curation → confidence_check → risk_assessment →
roadmap_planning → report_drafting → governance_check → human_review

PROHIBITED:
- Bypassing human review gates
- Making market-entry recommendations
- Inventing evidence or data
- Approving reports without human sign-off
```

### 5.2 Governance Guard Instruction

```
You are the MEP-light™ Governance Guard Agent.
Your role: Validate ALL agent outputs before they reach consultants or clients.

RULES:
1. Check for overconfident language (guarantee, certain, will succeed)
2. Check for prohibited approval language (enter this market, approved for entry)
3. Check for legal/financial/regulatory advice
4. Check for missing uncertainty markers
5. Check for PII exposure
6. FAIL any output with critical violations

CHARTER PRINCIPLES:
- "Clarify Preparedness, Do Not Predict Success"
- "Neutral Strategic Advisor"
- "Separation of Evidence from Uncertainty"

You MUST flag any content that implies market-entry approval,
revenue guarantees, or certainty without evidence basis.
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ADK dependency instability | Low | Medium | Feature flag, fallback to deterministic-only scoring |
| LLM hallucination in agent outputs | Medium | High | Governance agent, human review gates, evidence-grounding |
| Token cost escalation | Medium | Medium | Token usage tracking per agent run, cost alerts |
| Latency impact on UX | Medium | Medium | Async workflows, progress indicators, caching |
| Agent loop/recursion | Low | High | Max iteration limits, timeout guards |
| Prompt injection via user input | Low | Critical | Input sanitization, instruction-level guardrails |

---

## 7. Recommendations

1. **Deploy ADK behind feature flag** (`ADK_ENABLED=true`) — zero impact on existing deterministic scoring
2. **Start with 4 core agents**: Orchestrator, Scoring Executor, Governance Guard, Evaluation Agent
3. **Add specialist agents incrementally**: Evidence → Risk → Roadmap → Report
4. **Implement token tracking from day 1** — agent runs are recorded with cost estimates
5. **Human review is ALWAYS required** for report composition — no agent-approved client deliverables
6. **Run governance checks on ALL text outputs** — even internal summaries

---

## 8. Charter Compliance Checklist

| Principle | How ADK Implementation Complies |
|-----------|-------------------------------|
| "Clarify Preparedness, Do Not Predict Success" | Governance agent blocks all predictive/guarantee language |
| "Neutral Strategic Advisor" | No agent has "recommend entry" capability |
| "Separation of Evidence from Uncertainty" | Evidence items have confidence levels; scoring has certainty guardrails |
| "Do not issue final market-entry approvals" | Human review gate is mandatory before any report delivery |
| "No hidden scoring" | Scoring remains deterministic, transparent, auditable |
| "Consultant-ready, not client-final" | Reports are marked draft until human review |

---

## 9. References

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [ADK 2.0 Release Notes](https://github.com/google/adk-python)
- [Agent-to-Agent Protocol Specification](https://a2aprotocol.ai/)
- MEP-light™ Concept Layer Charter, §10, §14, §15, §16, §17, §18
