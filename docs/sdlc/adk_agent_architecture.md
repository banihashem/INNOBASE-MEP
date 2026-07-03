# MEP-light™ — ADK Agent Architecture Specification

**Version**: 1.0  
**Date**: 2026-07-03  
**Status**: Approved  

---

## Agent System Overview

MEP-light™ uses a **15-agent** architecture organized in an Orchestrator-Worker pattern. The Decision Manager Agent coordinates all specialist agents through structured tool calls with schema-validated I/O and immutable audit logging.

### Design Principles

1. **Agents reason; tools execute** — Agents produce reasoning. All data mutations happen through schema-validated tools.
2. **Human gates are mandatory** — No agent may deliver client-facing output without human review.
3. **Evidence over assumption** — Agents must tag all claims with confidence levels and evidence sources.
4. **Governance is non-negotiable** — Every text output passes through the Governance Agent before delivery.
5. **Deterministic scoring is sacred** — The 9-dimension scoring engine is NEVER modified by agents. Agents can only call it with proper inputs.

---

## Agent Specifications

### Agent 1: Decision Manager (Orchestrator)

| Property | Value |
|----------|-------|
| **ID** | `decision_manager` |
| **Role** | Workflow Orchestrator |
| **Model** | Gemini 2.0 Flash |
| **Phase** | All |
| **Tools** | `get_session_data`, `dispatch_agent`, `create_human_handoff` |
| **DB Access** | Read-only (workflow state) |
| **Human Gate** | Triggers gates for others; never bypasses |

**Mission**: Coordinate the multi-agent assessment workflow. Decide which specialist acts next. Enforce phase ordering and human review gates.

**Prohibited**: Making advisory decisions, bypassing human gates, generating client-facing content.

---

### Agent 2: Intake Clarifier

| Property | Value |
|----------|-------|
| **ID** | `intake_clarifier` |
| **Role** | User Input Quality |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `intake` |
| **Tools** | `get_session_data`, `create_human_handoff` |
| **DB Access** | Read-only |

**Mission**: Assess whether user-provided business context is complete enough for assessment. Identify missing or ambiguous inputs and request clarification via human handoff.

---

### Agent 3: Business Context Analyst

| Property | Value |
|----------|-------|
| **ID** | `business_context` |
| **Role** | Company Profile Analysis |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `business_context` |
| **Tools** | `get_session_data`, `update_evidence_ledger` |
| **DB Access** | Read session/company |

**Mission**: Analyze the business profile, sector, maturity, and capabilities to establish the assessment baseline.

---

### Agent 4: Offering Analyst

| Property | Value |
|----------|-------|
| **ID** | `offering_analyst` |
| **Role** | Product-Market Fit |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `offering_analysis` |
| **Tools** | `get_session_data`, `update_evidence_ledger` |
| **DB Access** | Read session/company |

**Mission**: Assess the offering's readiness for international expansion, including adaptation requirements, shelf life, regulatory compliance indicators.

---

### Agent 5: Market Researcher

| Property | Value |
|----------|-------|
| **ID** | `market_researcher` |
| **Role** | Controlled Market Research |
| **Model** | Gemini 2.0 Pro |
| **Phase** | `option_research` |
| **Tools** | `get_session_data`, `update_evidence_ledger` |
| **DB Access** | Read/Write (evidence items) |

**Mission**: Research expansion options using available knowledge and RAG-retrieved documents. All findings must be tagged with confidence level and source reference.

**Prohibited**: Inventing data, citing sources without verification, claiming certainty without evidence.

---

### Agent 6: Scoring Executor

| Property | Value |
|----------|-------|
| **ID** | `scoring_executor` |
| **Role** | Deterministic Scoring Gateway |
| **Model** | None (deterministic) |
| **Phase** | `scoring` |
| **Tools** | `call_scoring_engine` |
| **DB Access** | Read/Write (scores) |

**Mission**: Call the deterministic scoring engine with collected dimension scores. This agent performs NO reasoning — it is a structured gateway to the scoring API.

---

### Agent 7: Evidence Curator

| Property | Value |
|----------|-------|
| **ID** | `evidence_curator` |
| **Role** | Evidence Quality Assessment |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `evidence_curation` |
| **Tools** | `get_session_data`, `update_evidence_ledger` |
| **DB Access** | Read/Write (evidence items) |

**Mission**: Review collected evidence items, assess quality, identify gaps, classify confidence levels, and surface areas needing validation.

---

### Agent 8: Confidence Assessor

| Property | Value |
|----------|-------|
| **ID** | `confidence_assessor` |
| **Role** | Certainty Guardrail |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `confidence_check` |
| **Tools** | `get_session_data` |
| **DB Access** | Read-only |

**Mission**: Evaluate whether high-scoring markets have sufficient evidence confidence. Trigger the certainty guardrail (Tier A → Tier B cap) when evidence is insufficient for high-potential markets.

---

### Agent 9: Risk Analyst

| Property | Value |
|----------|-------|
| **ID** | `risk_analyst` |
| **Role** | Risk & Assumption Identification |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `risk_assessment` |
| **Tools** | `create_risk_cards`, `create_assumption_cards`, `get_session_data` |
| **DB Access** | Read/Write (risk and assumption cards) |

**Mission**: Identify risks and assumptions underlying each expansion option. Generate structured risk cards with severity, likelihood, and mitigation strategies.

---

### Agent 10: Roadmap Planner

| Property | Value |
|----------|-------|
| **ID** | `roadmap_planner` |
| **Role** | Validation Roadmap Generation |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `roadmap_planning` |
| **Tools** | `create_roadmap_actions`, `get_session_data` |
| **DB Access** | Read/Write (roadmap actions) |

**Mission**: Generate a 30-60-90 day validation roadmap linking actions to identified risks and assumptions. Each action must have a decision gate and evidence requirement.

---

### Agent 11: Report Composer

| Property | Value |
|----------|-------|
| **ID** | `report_composer` |
| **Role** | Narrative Generation |
| **Model** | Gemini 2.0 Pro |
| **Phase** | `report_drafting` |
| **Tools** | `draft_report_section`, `create_human_handoff`, `run_governance_check` |
| **DB Access** | Read session/scores/evidence; Write reports |
| **Human Gate** | **ALWAYS** — no report is delivered without human review |

**Mission**: Compose assessment report sections including executive summary, market comparison, evidence summary, risk analysis, and roadmap. All outputs are marked DRAFT and require human approval.

---

### Agent 12: Governance Guard

| Property | Value |
|----------|-------|
| **ID** | `governance_guard` |
| **Role** | Output Validation |
| **Model** | Rule-based (no LLM) |
| **Phase** | `governance_check` |
| **Tools** | `run_governance_check` |
| **DB Access** | Read-only |

**Mission**: Validate all agent outputs against MEP-light™ charter rules. Check for overconfidence, approval language, legal/financial advice, missing uncertainty markers, and PII exposure.

---

### Agent 13: Evaluation Agent

| Property | Value |
|----------|-------|
| **ID** | `evaluation_agent` |
| **Role** | Quality Assurance |
| **Model** | Gemini 2.0 Flash |
| **Phase** | `evaluation` |
| **Tools** | `run_governance_check`, `get_session_data` |
| **DB Access** | Read-only |

**Mission**: Assess the overall quality of the assessment workflow output, checking for consistency, completeness, and alignment with the initial business context.

---

### Agent 14: Document Ingester

| Property | Value |
|----------|-------|
| **ID** | `document_ingester` |
| **Role** | RAG Document Processing |
| **Model** | None (deterministic) |
| **Phase** | Background |
| **Tools** | `store_agent_artifact` |
| **DB Access** | Write (document_chunks) |

**Mission**: Process uploaded documents into chunks for RAG retrieval. Generate embeddings and store in pgvector.

---

### Agent 15: Session Summarizer

| Property | Value |
|----------|-------|
| **ID** | `session_summarizer` |
| **Role** | Session State Summary |
| **Model** | Gemini 2.0 Flash |
| **Phase** | All (on-demand) |
| **Tools** | `get_session_data` |
| **DB Access** | Read-only |

**Mission**: Generate concise summaries of session state for workflow coordination and UI display.

---

## Tool Registry

| Tool | Input Schema | Output Schema | Audit Level |
|------|-------------|---------------|-------------|
| `get_session_data` | `GetSessionDataInput` | `GetSessionDataOutput` | info |
| `update_evidence_ledger` | `UpdateEvidenceLedgerInput` | `UpdateEvidenceLedgerOutput` | info |
| `call_scoring_engine` | `CallScoringEngineInput` | `CallScoringEngineOutput` | info |
| `create_assumption_cards` | `CreateAssumptionCardsInput` | `CreateAssumptionCardsOutput` | info |
| `create_risk_cards` | `CreateRiskCardsInput` | `CreateRiskCardsOutput` | info |
| `create_roadmap_actions` | `CreateRoadmapActionsInput` | `CreateRoadmapActionsOutput` | info |
| `draft_report_section` | `DraftReportSectionInput` | `DraftReportSectionOutput` | warn |
| `run_governance_check` | `RunGovernanceCheckInput` | `RunGovernanceCheckOutput` | info |
| `store_agent_artifact` | `StoreAgentArtifactInput` | `StoreAgentArtifactOutput` | info |
| `create_human_handoff` | `CreateHumanHandoffInput` | `CreateHumanHandoffOutput` | warn |
