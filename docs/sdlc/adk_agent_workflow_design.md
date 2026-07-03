# MEP-light™ — ADK Agent Workflow Design

**Version**: 4.0  
**Date**: 2026-07-03  

---

## Workflow 1: Market Assessment (Primary)

```mermaid
graph TD
    A[User: Create Session] --> B[Intake Agent]
    B --> C[Business Context Agent]
    C --> D[Evidence Curator Agent]
    D --> E[Scoring Agent]
    E --> F[Confidence Agent]
    F --> G[Risk & Assumption Agent]
    G --> H[Roadmap Agent]
    H --> I[Report Agent]
    I --> J[Governance Guard]
    J -->|Pass| K[Evaluation Agent]
    J -->|Fail| I
    K -->|Pass| L["Human Review Gate ⛔"]
    K -->|Fail| H
    L --> M[Delivery to User]
```

### Phase Definitions

| Phase | Agent | Input | Output | Human Gate |
|-------|-------|-------|--------|------------|
| 1 | Intake | User form data | Validated session config | No |
| 2 | Business Context | Session config | Company + market context | No |
| 3 | Evidence Curator | Context + markets | Evidence ledger entries | No |
| 4 | Scoring | Evidence + dimensions | Raw 9-dimension scores | No |
| 5 | Confidence | Scores + evidence | Confidence labels + warnings | No |
| 6 | Risk & Assumption | Scores + confidence | Risk cards + assumption cards | No |
| 7 | Roadmap | Analysis complete | 30-60-90 day actions | No |
| 8 | Report Composition | All above | Draft report sections | No |
| 9 | Governance Guard | Draft report | Pass/fail + violation codes | No |
| 10 | Evaluation QA | Report | Quality score | No |
| 11 | Human Review | Final report | **Approved / Rejected** | **YES** |
| 12 | Delivery | Approved report | PDF + dashboard | No |

---

## Workflow 2: Evidence Research

```mermaid
graph TD
    A[Trigger: Low confidence score] --> B[Evidence Curator]
    B --> C[Search: Public sources]
    C --> D[Validate: Cross-reference]
    D --> E[Score: Update confidence]
    E --> F[Governance Guard]
    F --> G[Return: Updated evidence]
```

### Trigger Conditions
- Evidence confidence < `Medium` for any dimension
- User requests "deep research" on a market
- Assumption card marked "critical"

---

## Workflow 3: Report Generation

```mermaid
graph TD
    A[Assessment Complete] --> B[Report Agent]
    B --> C[Executive Summary]
    B --> D[Market Comparisons]
    B --> E[Risk Matrix]
    B --> F[Roadmap]
    C & D & E & F --> G[Governance Guard]
    G --> H[PDF Generation]
    H --> I[Human Review Gate]
```

---

## Workflow 4: SDLC Automation (Internal)

| Step | Agent | Action |
|------|-------|--------|
| 1 | SDLC Agent | Generate test plan from requirements |
| 2 | SDLC Agent | Generate deployment checklist |
| 3 | SDLC Agent | Generate security review template |
| 4 | Governance | Validate all outputs |

---

## Failure Handling

| Failure Type | Response | Retry | Escalation |
|-------------|----------|-------|------------|
| Agent timeout (>30s) | Cancel, log, return partial | 1 retry | Mark session "error" |
| Governance violation | Return to composition agent | 2 retries | Human review required |
| LLM API error | Exponential backoff | 3 retries | Fallback to deterministic scoring |
| Token limit exceeded | Chunk input, run in stages | 1 retry | Alert user, suggest simplification |
| Database error | Transaction rollback | 1 retry | Mark session "error", alert ops |

---

## Human Gate Specification

| Gate | When | Who | Actions Available |
|------|------|-----|-------------------|
| Pre-Report Delivery | After governance pass | Consultant (Admin) | Approve / Reject / Edit |
| Evidence Override | After evidence research | Consultant | Accept / Reject sources |
| Score Override | After automated scoring | Consultant | Adjust dimensions (logged) |

> **Charter Compliance**: All human gates align with MEP charter principle "Clarify Preparedness, Do Not Predict Success." No agent may bypass a human gate.
