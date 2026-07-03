# MEP-light™ — ADK Tooling Specification

**Version**: 4.0  
**Date**: 2026-07-03  

---

## Tool Inventory

| # | Tool Name | Used By | DB Write | Audit | Input Schema | Output Schema |
|---|-----------|---------|----------|-------|-------------|---------------|
| 1 | `get_session_data` | All agents | No | No | `{session_id}` | Full session JSON |
| 2 | `update_session_state` | Orchestrator | Yes | Yes | `{session_id, state, data}` | Updated session |
| 3 | `call_scoring_engine` | Scoring Agent | No | Yes | `{dimensions[]}` | Scored results |
| 4 | `store_evidence_item` | Evidence Curator | Yes | Yes | `{EvidenceItemInput}` | Stored evidence |
| 5 | `create_assumption_card` | Risk Agent | Yes | Yes | `{AssumptionCardInput}` | Card ID |
| 6 | `create_risk_card` | Risk Agent | Yes | Yes | `{RiskCardInput}` | Card ID |
| 7 | `create_roadmap_action` | Roadmap Agent | Yes | Yes | `{RoadmapActionInput}` | Action ID |
| 8 | `draft_report_section` | Report Agent | Yes | Yes | `{section, content}` | Section ID |
| 9 | `run_governance_check` | Governance Guard | No | Yes | `{content}` | Pass/fail + violations |
| 10 | `store_agent_artifact` | All agents | Yes | Yes | `{ArtifactInput}` | Artifact ID |
| 11 | `record_agent_run` | Orchestrator | Yes | Yes | `{AgentRunInput}` | Run ID |
| 12 | `complete_agent_run` | Orchestrator | Yes | Yes | `{run_id, result}` | Updated run |
| 13 | `list_evidence_by_dimension` | Evidence Curator | No | No | `{session_id, dimension}` | Evidence[] |
| 14 | `get_market_scores` | Confidence Agent | No | No | `{session_id}` | Score[] |

---

## Tool Schemas (Pydantic)

### `EvidenceItemInput`
```python
class EvidenceItemInput(BaseModel):
    session_id: str
    dimension: str          # e.g. "Market Attractiveness"
    market_name: str
    source_type: str        # "regulation", "trade_guide", "market_report"
    source_url: str = ""
    source_title: str
    excerpt: str            # Max 2000 chars
    confidence: str = "Medium"  # High, Medium, Low
```

### `AssumptionCardInput`
```python
class AssumptionCardInput(BaseModel):
    session_id: str
    statement: str
    dimension: str = ""
    market_name: str = ""
    impact_if_wrong: str = "Medium"  # High, Medium, Low
    validation_method: str = ""
```

### `RiskCardInput`
```python
class RiskCardInput(BaseModel):
    session_id: str
    risk_title: str
    description: str = ""
    market_name: str = ""
    probability: str = "Medium"
    impact: str = "Medium"
    mitigation: str = ""
```

### `RoadmapActionInput`
```python
class RoadmapActionInput(BaseModel):
    session_id: str
    action_title: str
    description: str = ""
    market_name: str = ""
    time_horizon: str = "30 days"  # "30 days", "60 days", "90 days"
    priority: str = "Medium"
    owner: str = ""
```

### `GovernanceCheckInput`
```python
class GovernanceCheckInput(BaseModel):
    content: str
    content_type: str = "report_section"
    session_id: str = ""
```

### `GovernanceCheckOutput`
```python
class GovernanceCheckOutput(BaseModel):
    compliant: bool
    violations: list[GovernanceViolation]
    checked_at: str  # ISO timestamp
```

---

## Role-Based Access Control (Tool Level)

| Tool | Administrator | Consultant | Viewer | Agent |
|------|:---:|:---:|:---:|:---:|
| `get_session_data` | ✅ | ✅ (own) | ✅ (own) | ✅ |
| `update_session_state` | ✅ | ✅ (own) | ❌ | ✅ |
| `call_scoring_engine` | ✅ | ✅ | ❌ | ✅ |
| `store_evidence_item` | ✅ | ✅ (own) | ❌ | ✅ |
| `create_assumption_card` | ✅ | ✅ (own) | ❌ | ✅ |
| `create_risk_card` | ✅ | ✅ (own) | ❌ | ✅ |
| `run_governance_check` | ✅ | ✅ | ✅ | ✅ |
| `record_agent_run` | ✅ | ❌ | ❌ | ✅ |

---

## Audit Requirements

All DB-write tools MUST:
1. Generate a unique event ID (`evt_<timestamp>_<random>`)
2. Record the calling agent name and run ID
3. Store action type, user ID (if applicable), and session ID
4. Write a `safe_metadata` JSON object (no PII beyond email)
5. Set `created_at` to server timestamp
