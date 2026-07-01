### Architectural Blueprint: Transitioning MEP-light™ to an Industrial-Grade Platform

This blueprint provides the comprehensive architectural designs required to elevate **MEP-light™** from a front-end React scaffolding at `mep.innobase.app` into a production-ready, secure, and context-aware strategic advisory system. Grounded in the **INNOBASE AI Product Design Framework v3.0** `` and the **MEP-light Concept Layer Charter** ``, this blueprint organizes the platform’s specifications into four decoupled layers (Concept, Context, Logic, and Physical) and outlines an Evaluation-Driven Development (EDD) framework.

---

### 1. Concept Layer: Intent, Boundaries, & Risk Appetite

The Concept Layer establishes the core identity and strategic boundaries of MEP-light™, defining why this system exists and setting the limits of its agency to prevent probabilistic failure modes ``.

```
                    [ STRATEGIC GOAL: CLARIFY PREPAREDNESS ]
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
  [ INCLUSIONS (v1.0 Scope) ]                           [ EXCLUSIONS (Strict Boundaries) ]
  • Food & Beverage (F&B) sector                  • No financial forecasting
  • UAE market focus                              • No ROI or profit simulations
  • Brand & product readiness                      • No legal or regulatory advice
  • Category-level F&B logic                      • No multi-country comparisons
```

#### 1.1 Statement of Intelligence (SoI)
The **Statement of Intelligence (SoI)** defines the cognitive boundaries of the MEP-light™ agentic system ``:
*   **Cognitive Scope:** The system operates as a strategic diagnostic intelligence designed to structure market-expansion decisions ``. It guides users through framing decisions, comparing product-market-channel options, evaluating organizational readiness, exposing assumptions, and generating 30-60-90 day validation roadmaps ``.
*   **Epistemic Boundaries:** The system operates under a philosophy of "uncertainty as a signal for reflection" ``. It does not possess real-time predictive knowledge of market outcomes and must treat data gaps as explicit, structured milestones in the action roadmap rather than filling gaps with speculative assumptions ``.
*   **Agency Level:** Governed strictly as an **Advisor (SAE Level 2)** ``. The system is allowed to analyze user inputs against readiness rules, classify options, highlight gaps, and suggest non-prescriptive validation actions ``. It is prohibited from approving or rejecting market entry, issuing financial guarantees, or replacing expert human judgment ``.

#### 1.2 Value Architecture & Levers
The system’s value is driven by two primary levers defined in the *INNOBASE Value Architecture* ``:
*   **Effectiveness (The Quality Lever):** Improving decision quality by exposing underlying assumptions and separating market attractiveness from evidence certainty ``. Success is measured by *Decision Accuracy* (expert validation of prioritized options) and *Uncertainty Visibility* (accurate mapping of assumptions) ``.
*   **Efficiency (The Cost Lever):** Streamlining the screening of expansion candidates during workshops and trade events (e.g., Gulfood) ``. Success is measured by a *Completion Rate* of under 10 minutes per session ``.

#### 1.3 AI Risk Register & Tolerances
The platform enforces a structured risk mitigation strategy to address the unique behavioral risks of probabilistic strategic advisors ``:

| Identified Risk | Risk Description | Concept-Level Mitigation `` | Tolerance Level |
| :--- | :--- | :--- | :--- |
| **Hallucination** | System invents fake regulatory standards, market sizes, or competitor data ``. | Strict RAG grounding in verified databases; restrict outputs to structured, pre-configured logic ``. | **Zero Tolerance** |
| **Over-optimism** | Giving companies false confidence or premature entry approvals ``. | Dual-scoring mechanism; conservative scoring scales; explicit "Needs Validation" badges ``. | **Low Tolerance** |
| **Over-reliance** | Users blindly trust AI-generated roadmaps without verifying assumptions ``. | Mandatory disclaimers on dashboard screens; explicit routing to human advisors ``. | **Low Tolerance** |
| **Misinterpretation** | Users treat readiness tiers as final commercial approvals ``. | Cautious, non-prescriptive advisory language (e.g., "Leading Validation Candidate") ``. | **Zero Tolerance** |

---

### 2. The Context Layer: Embedding AI in Organizational Reality

The Context Layer governs how the system integrates with human workflows and organizational structures, defining the interface between the AI and human experts ``.

```
                              [ HUMAN STRATEGIC GATE ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
      [ ACTIVE DIAGNOSTIC ]                            [ WORKSHOP VALIDATION ]
    Orchestrated Multi-Agent                         Consultant Review, Override,
    Data Intake & Evaluation                         and PDF Brief Signing-Off
```

#### 2.1 The Federated Operating Model (Hub-and-Spoke)
MEP-light™ utilizes a **Federated Hub-and-Spoke Model** ``:
*   **The Hub (Platform Team):** Manages the core AI infrastructure, including the FastAPI gateway, security configurations, Model Context Protocol (MCP) integrations, and pgvector-based regulatory databases ``.
*   **The Spokes (Consulting & Business Units):** Configure the domain-specific prompt interfaces, manage custom client weightings, and oversee live diagnostic workshops ``.

#### 2.2 RACI Governance Matrix
To establish clear operational ownership and prevent delivery bottlenecks, the following RACI matrix is enforced ``:

| Platform Task | Product Owner (BU) | AI Architect (Tech) | Risk/Ethicist | Compliance/Legal |
| :--- | :--- | :--- | :--- | :--- |
| **Statement of Intelligence** | **Accountable (A)** | Responsible (R) | Consulted (C) | Informed (I) |
| **Weighting & Scoring Models** | **Accountable (A)** | Responsible (R) | Consulted (C) | Informed (I) |
| **OIDC & RBAC Security** | Informed (I) | **Accountable (A)** | Informed (I) | Consulted (C) |
| **Guardrails & Risk Controls** | Informed (I) | Responsible (R) | **Accountable (A)** | Consulted (C) |
| **Final Client Brief Export** | **Accountable (A)** | Responsible (R) | Informed (I) | Consulted (C) |

#### 2.3 Human-in-the-Loop (HITL) Design Patterns
The system structures human involvement into three operational patterns to ensure strategic safety ``:
*   **Human-via-Gate (The Approver):** A human advisor must review and authorize any strategic report before it is generated as a board-ready PDF, preventing the automatic generation of unverified market-entry claims ``.
*   **Human-on-Exception (The Pilot):** If any prioritized market triggers the "Evidence Discrepancy Alert" (High Opportunity but Low Evidence Confidence), the system pauses execution and highlights the specific data gap for human expert validation ``.
*   **Human-as-Teacher (The Coach):** Consultants can manually override calculated scores, adjust sector weights, and input custom workshop annotations. These adjustments are logged to calibrate the weighting matrix over time ``.

#### 2.4 Product System Card
The **MEP-light™ System Card** establishes a transparent, auditable contract between the development team and business stakeholders ``:
*   **Intended Use Case:** High-level product and brand readiness screening for F&B companies seeking entry into the UAE retail, wholesale, or ethnic food sectors ``.
*   **Explicitly Out-of-Scope:** Calculating detailed financial forecasts, simulating logistics routes, offering formal legal, regulatory, or tax advice, or managing final transaction clearances ``.
*   **System Disclaimers:** Displayed in the footers of screens 6 and 7: *“MEP-light™ is a readiness screening and prioritization intelligence. It clarifies preparedness; it does not predict commercial success, guarantee ROI, or replace expert human judgment. All generated findings must be validated by experts before commercial commitment.”* ``.

---

### 3. The Logic Layer: Stateful Orchestration & Evaluation Engines

The Logic Layer manages the "cognitive architecture" of the application, coordinating state transitions, multi-agent collaborations, and analytical calculations ``.

```
                    [ STATE MACHINE: PROGRESSIVE DISCLOSURE FSM ]
                                         │
        ┌──────────────┬──────────────┬──┴───────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼              ▼
    [ SETUP ] ➔  [ SNAPSHOT ] ➔  [ STRATEGY ] ➔ [ SHORTLIST ] ➔  [ SCORING ] ➔ [ DASHBOARD ]
```

#### 3.1 Multi-Agent Orchestration & Communication Topology
The platform uses an orchestrator-worker architecture to manage asynchronous diagnostic tasks ``. Communication between agents is strictly audited:

```
                           +──────────────────+
                           |   Orchestrator   |
                           +────────┬─────────+
                                    |
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
+──────────────────+      +──────────────────+      +──────────────────+
|   User Intake    |      | Evidence Curator |      |  Risk/Assumption |
|   & Snapshot     |      |    & Scoring     |      |     Roadmap      |
+──────────────────+      +──────────────────+      +──────────────────+
```

1.  **Orchestrator / Decision Manager Agent:** Owns the FSM workflow, verifies data validation gates, routes tasks to sub-agents, and manages context compaction when history exceeds ~135k tokens ``.
2.  **User Intake & Clarification Agent:** Parses user text on Screen 1 and Screen 2, flags missing snapshot inputs, and maps data items to their declared evidence status ``.
3.  **Business Context Agent:** Analyzes company maturity and business type (Startup, SME, Established Brand) to dynamically adjust the weighting parameters applied by the Scoring Agent ``.
4.  **Offering Strategy Agent:** Evaluates offering transferability and maps selected entry models (Core Replication, Localized Adaptation, or Market-Specific Development) to operational adaptation checklists ``.
5.  **Market Research Agent:** Performs targeted, safe web research (when authorized) to retrieve category benchmarks, import tariffs, or competitor signals, returning them with confidence levels and source citations ``.
6.  **Evidence Curator Agent:** Maintains the central evidence ledger, verifying whether scored metrics are supported by direct internal sales, market reports, expert judgment, or represent pure assumptions ``.
7.  **Scoring and Weighting Agent:** Inverts negative scoring scales, calculates category sub-scores, applies the selected company-type weighting model, and generates normalized potential scores ``.
8.  **Confidence & Uncertainty Agent:** Aggregates confidence inputs, monitors the certainty guardrail, triggers evidence discrepancy warnings, and applies tier-capping logic ``.
9.  **Risk & Assumption Agent:** Generates interactive assumption cards, maps operational risks to severity and likelihood scales, and suggests target mitigations ``.
10. **Entry Pathway Agent:** Recommends tailored entry models (e.g., Distributor-led, Partner-led validation) based on the prioritized product-market-channel combination ``.
11. **Roadmap Planning Agent:** Generates the actionable 30-60-90 day validation roadmap, linking identified evidence gaps directly to immediate validation tasks ``.
12. **UX / Report Composition Agent:** Formats the comparative dashboard and executive summaries using strategic, non-promotional, and cautious consulting language ``.

#### 3.2 Deterministic FSM Navigation States
To enforce data validation and prevent invalid navigation, screen transitions are locked to a strict client-side Finite State Machine (FSM) ``. Users cannot access downstream dashboards until all required inputs in the preceding states are validated. Caching of state ensures full backward compatibility with data preservation during navigation ``.

```typescript
// Deterministic State Machine Configuration for UI Navigation (XState)
const mepStateMachine = createMachine({
  id: 'mepWizard',
  initial: 'decision_setup',
  states: {
    decision_setup: {
      on: { 
        VALIDATE_SETUP: { 
          target: 'company_snapshot',
          cond: (context) => !!context.decisionMode && !!context.horizon && !!context.strategicObjective 
        } 
      }
    },
    company_snapshot: {
      on: {
        PREVIOUS: 'decision_setup',
        VALIDATE_SNAPSHOT: {
          target: 'product_strategy',
          cond: (context) => !!context.companyName && !!context.sector && context.capabilities.length > 0
        }
      }
    },
    product_strategy: {
      on: {
        PREVIOUS: 'company_snapshot',
        VALIDATE_STRATEGY: {
          target: 'potential_markets',
          cond: (context) => !!context.selectedStrategyModel && !!context.offeringName
        }
      }
    },
    potential_markets: {
      on: {
        PREVIOUS: 'product_strategy',
        VALIDATE_SHORTLIST: {
          target: 'metric_scoring',
          cond: (context) => context.shortlistMarkets.length >= 3 && context.shortlistMarkets.length <= 5
        }
      }
    },
    metric_scoring: {
      on: {
        PREVIOUS: 'potential_markets',
        VALIDATE_SCORING: {
          target: 'comparative_dashboard',
          cond: (context) => context.shortlistMarkets.every(m => m.scoresCompleted === true)
        }
      }
    },
    comparative_dashboard: {
      on: {
        PREVIOUS: 'metric_scoring',
        TRANSITION_READINESS: 'entry_readiness_workspace'
      }
    },
    entry_readiness_workspace: {
      on: {
        PREVIOUS: 'comparative_dashboard',
        RESET_WIZARD: 'decision_setup'
      }
    }
  }
});
```

#### 3.3 Core Scoring Mathematics & Negative Dimension Inversion
The logic engine processes numeric inputs (1 to 5 scale) on Screen 5 using the following mathematical models:

*   **Inversion of Negative Dimensions:** Competitive Intensity and Regulatory Complexity must reduce attractiveness and feasibility. This is computed using ``:
    $$\text{Adjusted Score} = 6 - \text{Raw Score}$$
*   **Weighted Category Calculations:** Opportunity, Fit, and Feasibility are calculated from raw and adjusted indicators using ``:
    $$\text{Opportunity} = (\text{Market Attractiveness} \times 0.70) + (\text{Adjusted Competitive Score} \times 0.30)$$
    $$\text{Offering Fit} = (\text{Offering Fit} \times 0.65) + (\text{Brand \& Trust Transferability} \times 0.35)$$
    $$\text{Feasibility} = (\text{Channel Access} \times 0.35) + (\text{Adjusted Regulatory Complexity} \times 0.30) + (\text{Operational Feasibility} \times 0.35)$$
    $$\text{Strategic} = \text{Strategic Value}$$
    $$\text{Financial} = \text{Financial Logic}$$
*   **Normalized Expansion Potential (SME Weighting Model):** Calculated using the SME weights: Opportunity (25%), Offering Fit (20%), Feasibility (25%), Strategic Value (10%), and Financial Logic (20%) ``:
    $$\text{Expansion Potential} = (\text{Opportunity} \times 0.25) + (\text{Fit} \times 0.20) + (\text{Feasibility} \times 0.25) + (\text{Strategic} \times 0.10) + (\text{Financial} \times 0.20)$$
    $$\text{Expansion Potential Score (0-100 scale)} = \text{Expansion Potential} \times 20$$
*   **Evidence Confidence Scoring:** Independently aggregates the confidence inputs for the nine dimensions to calculate an *Evidence Confidence Score (0-100)* ``.
*   **The Certainty Guardrail (Decoupled Safeguard):** 
    $$\text{If } \text{Expansion Potential Score} \ge 70 \text{ AND } \text{Evidence Confidence Score} < 50:$$
    The system triggers an **"Evidence Discrepancy Alert"**, caps its classification at **Tier B: Promising but Not Ready**, and replaces its recommended action with a "Promising Hypothesis - Requires Validation" badge to prevent overconfident strategic claims ``.

---

### 4. The Physical Layer: LLMOps Reference Architecture & Infrastructure

The Physical Layer manages data storage, security, model gateways, RAG indexing, and deployment pipelines ``.

```
                              [ API ROUTER (FastAPI) ]
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [ PERSISTENCE ]                  [ RAG ENGINE ]               [ SECURITY GUARDRAILS ]
 PostgreSQL / pgvector           Qdrant / Chunking             PII Filtering / Llama Guard
```

#### 4.1 Production Reference Architecture
*   **Model Gateway Layer:** Routes user prompts to **Gemini 3.5 Flash** for rapid, low-latency extraction and classification tasks, and handles fallback routing to secure alternate endpoints in case of API rate limiting ``.
*   **Contextual RAG Pipeline:** Ingests official trade documents and F&B regulations (such as UAE MoCCAE and ADAFSA standards) into a **pgvector** or **Qdrant** database ``. Document chunks (500 tokens with 10% overlap) are indexed using semantic embeddings ``. The retrieval engine uses hybrid search (BM25 + vector similarity) to inject exact regulatory citations into the final strategic advisory text on Screen 7, providing clear traceability ``.
*   **Stateful Database Schema (PostgreSQL):** Persists user credentials, session state, diagnostic inputs, scores, and custom consultant annotations ``.

#### 4.2 Security, Guardrails, & Token FinOps
*   **Input/Output Firewalls:** Enforces runtime input sanitization (using tools like Llama Guard) to filter out prompt injections and protect personally identifiable information (PII) before it reaches the models ``.
*   **Safety disclaimers and constraints:** Enforces system-level constraints to prevent the models from outputting toxic text or generating ungrounded regulatory claims ``.
*   **FinOps Circuit Breakers:** Implements token-budget caps (maximum 2 million tokens per session) and a step circuit breaker that automatically halts multi-agent loops if they exceed 10 consecutive turns without resolving, preventing runaway compute costs ``.
*   **Caching Strategy:** Enables context caching for large, static system prompts and regulatory reference structures, reducing input token costs by up to 70% ``.

---

### 5. Evaluation-Driven Development (EDD) & QA Framework

To transition the software from a fragile prototype to a reliable enterprise system, development must be guided by continuous automated evaluation ``.

```
  [ DEFINE OF READY ] ➔ [ EXPLORATORY PROTOTYPING ] ➔ [ AUTOMATED CI EVALUATION ] ➔ [ DEFINE OF DONE ]
```

#### 5.1 Definition of Done (DoD)
A feature is classified as "Done" only when it meets the following criteria ``:
1.  Calculated mathematical scores match the baseline spreadsheet values with 100% precision ``.
2.  The "Certainty Guardrail" accurately caps Tier-A opportunities that fail to meet confidence thresholds ``.
3.  The system passes the regression test suite, maintaining a hallucination rate of <1% across the golden dataset ``.
4.  All tracing, system performance, and token metrics are active and logging structured JSON to the monitoring pipeline ``.

#### 5.2 Golden Scenario Evaluation Suite (Somayeh F&B / Kashkam Profile)
The automated testing suite evaluates the orchestrator using a mock "Golden Dataset" derived from the Somayeh F&B reference case ``:
*   **Input Context:** Company is an established domestic F&B manufacturer with limited export experience, exploring expansion into the UAE retail channel using a "Localized Offering Adaptation" strategy for an innovative snack product ``.
*   **Mock Scored Input:** UAE is scored as: Attractiveness=4, Fit=4, Channel=4, Competition=3, Regulatory=2, Feasibility=4, Brand=4, Strategic=3, Financial=4 ``. Evidence Confidence is set to Medium ``.
*   **Expected Calculations:** 
    *   Adjusted Competition = 3; Adjusted Regulatory = 4 ``.
    *   Opportunity = 3.70; Fit = 4.00; Feasibility = 4.00; Strategic = 3.00; Financial = 4.00 ``.
    *   Calculated Composite Potential Score = 77 (Tier A classification) ``.
    *   Calculated Evidence Confidence = 68 (Medium confidence classification) ``.
*   **Expected Strategic Advice Output:** The recommendation engine must output cautious advisory text prioritizing the UAE as the "Leading Validation Candidate" for a "Partner-Led Controlled Market Validation" entry pathway, while automatically surfacing "Demand" and "Landed-Pricing" as critical assumptions requiring immediate testing ``.

#### 5.3 Automated LLM-as-a-Judge Pipeline
We deploy an automated **LLM-as-a-Judge** pipeline using a larger reasoning model to evaluate the outputs of our production models on every build ``:
*   **Advisory Cautiousness Rubric:** Evaluates whether recommendations use non-guarantee, strategic advisory terminology (e.g., "Leading Validation Candidate" instead of "Best Market") ``.
*   **Citing Accuracy Rubric:** Evaluates whether regulatory claims are directly supported by references to retrieved standards in the pgvector database, flagging any ungrounded assertions ``.
*   **Trajectory & Tool Alignment:** Evaluates if worker agents execute tasks efficiently or enter repetitive loops, tracking tool execution metrics across testing cycles ``.

---

### 📥 Production-Ready Master Prompt for Google Antigravity IDE

*Copy and paste this comprehensive prompt directly into your **Antigravity 2.0 Manager Surface** or **Antigravity IDE Agent Panel** to run the complete build.*

```text
You are the Principal Systems Architect and Lead Full-Stack AI Engineer for MEP-light™. We are ready to transition our client-side prototype at mep.innobase.app into an enterprise-grade, stateful, and secure platform.

Your objective is to restructure our workspace directory, program the stateful backend routes, integrate a secure relational PostgreSQL schema, build a pgvector-based contextual RAG search pipeline, deploy OIDC-based OAuth middleware, and enforce strict scoring mathematics and certainty guardrails.

Please execute the following implementation tasks sequentially inside your secure Linux sandbox:

### 1. Unified Directory and Dependency Setup
Establish a clean, professional multi-tenant project structure:
- `/frontend` - Containing our updated React/TypeScript screens, tailwind styles, and client-side FSM controller.
- `/backend` - Containing our FastAPI routers, JWT authentication, scoring models, and pgvector RAG logic.
- `/data` - Containing our SQL schema migrations, pgvector indices, and curated UAE F&B standards.
- `/tests` - Containing our python pytest files and our automated Golden Dataset evaluation suite.
- `/logs` - Set up to capture structured JSON application traces.
Write a consolidated 'requirements.txt' including: fastapi, uvicorn, sqlalchemy, psycopg2-binary, pgvector, reportlab, python-jose, xstate, and opentelemetry-api.

### 2. Implement a Deterministic Finite State Machine (FSM)
- Refactor the front-end wizard navigation to run on a strict, client-side State Machine (using React or XState).
- Lock transitions so users cannot navigate to downstream screens (Dashboard, Roadmap, Workspace) until all required inputs on preceding screens are validated.
- Ensure full state preservation: Caching state must allow users to navigate backward (e.g., to adjust capabilities or product strategies) and return forward without losing entered values, scores, or manual override notes.
- Map the progress state permanently to a polished step indicator at the top of the wizard.

### 3. Build the Relational PostgreSQL Schema & Session Persistence
Configure a PostgreSQL schema to persist our enterprise strategic diagnostic variables:
- 'client_companies': id (UUID), company_name (default: "Client Company"), sector, capabilities (text), constraints (text), and created_at.
- 'user_sessions': id (UUID), user_id, company_id (FK), active_state, selected_offering (default: "Selected Offering"), selected_strategy, and timestamps.
- 'market_scores': id (UUID), session_id (FK), market_name, raw_scores (attractiveness, fit, channel, competition, regulatory, feasibility, brand, strategic, financial), evidence_basis, and custom notes.
- Integrate a SQLAlchemy session pool inside our FastAPI configuration to handle CRUD operations.

### 4. Code the Strict Logical Scoring Engine & "Certainty Guardrail"
- In the backend ('backend/scoring.py'), write a calculation utility to process numeric metric inputs (1-5 range):
  - Invert negative dimensions (Competitive Intensity & Regulatory Complexity): Adjusted Score = 6 - Raw Score.
  - Calculate categories: Opportunity = (Attractiveness * 0.7) + (Adjusted Competition * 0.3); Fit = (Offering Fit * 0.65) + (Brand Transferability * 0.35); Feasibility = (Channel Access * 0.35) + (Adjusted Regulatory * 0.30) + (Operational Feasibility * 0.35).
  - Apply the SME Weighting Model: Opportunity (25%), Offering Fit (20%), Feasibility (25%), Strategic Value (10%), and Financial Logic (20%). Score = Composite Average * 20 (normalized to a 0-100 scale).
- Code the "Certainty Guardrail": Separately aggregate the confidence inputs into an Evidence Confidence Score (0-100). If a market's Potential is High (>=70) but its Evidence Confidence is Low (<50), trigger an "Evidence Discrepancy Alert", write a CRITICAL alert to the logs, force its classification down to Tier B (Promising but Not Ready), and output a "Promising Hypothesis - Requires Validation" badge.

### 5. Deploy OIDC Authentication & Role-Based Access Control (RBAC)
- Set up an authentication route in 'backend/auth.py' to validate Google Identity Platform ID tokens (JWTs) using Google's public JWKS.
- Implement RBAC FastAPI dependencies to restrict API routes by user role:
  - Viewer: Read-only access to demo modes and dashboard queries.
  - Consultant: Full access to customize sessions, score metrics, input notes, and export PDF briefs.
  - Administrator: Full platform access, including adjusting scoring weights and database schemas.

### 6. Set Up the pgvector Contextual RAG Engine
- In the backend ('backend/rag.py'), write an ingestion and retrieval service.
- Parse and chunk (500 tokens, 10% overlap) the curated UAE F&B standards and trade rules, embed them, and index them inside a pgvector database.
- Create a hybrid search route: When Screen 7 recommendations are generated for the UAE, query the vector database, retrieve the exact standards, and merge them into the advisory text with explicit citation references.

### 7. Build the Branded ReportLab PDF Compiler
- Program 'backend/pdf_exporter.py' using ReportLab to render a print-ready prioritisation report.
- Design a high-end, clean corporate cover page incorporating a subtle wave background, the INNOBASE and MEP-light logos, and a crimson red accent line.
- Populate tables dynamically from the active session's comparative dashboard. Ensure all text values are wrapped in ReportLab 'Paragraph' flowables and XML characters are escaped to prevent compiler crashes.
- Include sections for the Company Snapshot, Comparative Dashboard, Priority Recommendation, Exposed Assumptions, and the structured 30-60-90 Day Validation Roadmap.

### 8. Expand the "Entry Readiness Workspace"
Refactor our final "Product Prep" screen into the comprehensive "Entry Readiness Workspace" divided into 5 modular, interactive checklist tabs:
1. "Regulatory & Compliance" (Middle East additive standards, halal requirements, product registration).
2. "Offering & Localization" (Nutritional facts, allergen disclosures, Arabic translation).
3. "Packaging, Delivery & Operations" (Container transit constraints, temperature logs, shelf life calculation).
4. "Commercial & Pricing" (MoQ matcher, pricing bridge from EXW to CIF, import tariffs, retail markups).
5. "Channel & Partner Readiness" (Distributor vetting, pilot validation criteria).

### 9. Deploy Observability, Structured Logging, and FinOps Controls
- Configure all backend log streams to output as machine-readable JSON containing timestamp, log level, component, session_id, and user_role.
- Instrument our FastAPI endpoints to expose Prometheus metrics tracking scoring latency, PDF compile times, and token consumption rates.
- Set up a token-budget limit (maximum 2M tokens per session) and a cost circuit breaker to halt agentic loops if they exceed 10 consecutive turns.

### 10. Run Automated Golden Dataset Tests
- Write a complete pytest suite under `/tests` to validate our calculations, OIDC token validation routes, pgvector RAG retrievals, and PDF generation streams against the official "Somayeh F&B / UAE" reference scenario.
- Execute the tests, resolve any compiler errors or logic gaps, and generate a 'Walkthrough' detailing your file layouts and runtime commands.
```

---

### 🚀 Technical Implementation Instructions

1.  **Review the Codebase Locally:** Open **Antigravity IDE** and confirm that your workspace folder matches your project layout.
2.  **Load the Master Configuration:** Ensure that your global settings have enabled file modifications and local execution permissions inside your secure sandbox environment ``.
3.  **Execute the Build:** Paste the master prompt into the **Agent Panel** of your Antigravity IDE ``. The agent will autonomously write the backend files, initialize the PostgreSQL tables, index the RAG documents, and configure the React components ``.
4.  **Inspect the Implementation Plan:** The agent will generate a detailed **Task List** and **Implementation Plan** in your **Auxiliary Pane** ``. Review the code diffs and click **Proceed** to execute the builds ``.
5.  **Run the Validation Tests:** Once the build is completed, check the **Walkthrough** and terminal outputs to confirm that your automated tests run with 100% mathematical accuracy ``.
6.  **Publish to Production:** Enable the **`cloudrun-mcp`** server in Antigravity's settings, and type: `"Deploy the production container to Google Cloud Run"` to push your fully upgraded, secure, and stateful MEP-light™ platform to `mep.innobase.app` ``.