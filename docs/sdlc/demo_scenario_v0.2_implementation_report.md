# MEP-light™ Demo Scenario v0.2 — Implementation Report

> **Status: Deployed.** Originally developed as v0.2 candidate + Cure-01, now deployed to
> Production (`market-entry-prioritizer-00042-s4m`) and Staging (`mep-light-demo-refinement-staging-00011-c4d`).
> Authoritative source: `efd61c6eaad22cfdc075a1044c3975b762bb9330`.

| | |
|---|---|
| Specification | `MEP-light_Demo_Scenario_v0.2.docx` (SHA-256 `8f33266cb1d607cf60fe6d584b1e00eeba0d186134955266d83d4987377c097b`) |
| Baseline commit | `c25a037a9745c505b6608a6b7f993bcce5272663` (v4.3.7 initial closure) |
| Feature branch | `feature/demo-scenario-v0.2` (v0.2 implementation) |
| Cure branch | `feature/demo-scenario-v0.2-cure-01` (cure + evidence) |
| Final branch | `feature/demo-scenario-v0.2-step5-generated-state-cure` |
| Authoritative commit | `efd61c6eaad22cfdc075a1044c3975b762bb9330` |
| Client-facing label | `MEP-light Beta Demo v1.6` (retained; centralized) |

## 1. Architecture & UX changes

The v0.2 work is a **refinement layer** on the already-substantial v4.3.7 demo. The 7-step
free flow, Demo Participant role, RBAC gating, and "Generate Draft Scores" concept already
existed; v0.2 makes the demo lighter, evidence-aware, sector-adaptive, and spec-exact.

**New shared libraries (pure, unit-tested, no React):**
- `src/lib/scoring.ts` — single source of truth for demo dashboard math, replacing the math
  previously duplicated between `App.tsx` and `ComparativeDashboardScreen.tsx`. Adds
  `letterGrade()` (spec 9.4), `SECTOR_WEIGHTS` + `resolveSectorWeights()` (spec §13),
  `recommendedAction()`, and `computeMarketResult()`. Base weights reproduce v4.3.7 math exactly.
- `src/lib/draftScoring.ts` — input-derived draft-score generator (spec §8.2) with strict
  schema validation and a fail-safe error type.
- `src/lib/narrative.ts` — pure `buildDecisionStatement()` (spec §4.3/4.4) and
  `buildOrgContextSummary()` (spec §5.4), extracted from the screen components for testability.

**Per-step changes:**
- **Landing** (`LandingPage.tsx`, `landing.css`): added spec short description; surfaced the
  `Start Demo Assessment` CTA as visible copy (kept the functional Google button intact);
  corrected the hero disclaimer to the exact spec text; removed the cryptic **Charter** footer
  line and the "Proprietary Enterprise Strategy Tool" overclaim; softened "Enterprise Security"
  → "Security & Privacy". (The old "Trusted by" section and floating UAE/Germany/Canada cards
  were already removed in v4.3.7; residual dead CSS for the Charter line was deleted.)
- **Step 1 — Decision Setup** (`DecisionSetupScreen.tsx`): title "Decision Setup"; spec default
  statement before input; spec dynamic template after Step 1 (business name + entry/expansion +
  "[N]-month period"); **Step 2 enrichment** (capabilities/constraints/sector passed from
  `App.tsx`) synthesized, not concatenated; the raw objective is no longer spliced into the
  statement. Added a **Desired Output** multi-select (`decisionSetup.desiredOutput`).
- **Step 2 — Company Snapshot** (`CompanySnapshotScreen.tsx`): title "Company Snapshot" + spec
  subtitle; **active sectors only** (Consumer Goods & Retail / Food & Beverage / Mobility &
  Logistics / SaaS & Digital Platforms) with the four future sectors shown **disabled "Coming
  soon"**; spec 5.2 placeholders; spec 5.4 default summary message; evidence-quality labels
  Confirmed/Estimated/**To Validate** (canonical `EvidenceState` value; legacy `Unknown`
  normalized on hydration + display).
- **Step 3 — Offering Strategy Selection** (`ProductStrategyScreen.tsx`): field **"Core
  Offering(s)"** + spec placeholder; **"Active Strategy Profile"** heading with the selected
  strategy shown below (not embedded); equal visual treatment for the three implication fields.
- **Step 4 — Potential Markets** (`MarketShortlistScreen.tsx`): spec instruction; **duplicate**
  + empty-label validation; 3–5 hard cap; **per-market notes** ("Market Context Notes - [name]")
  keyed in a dedicated `marketNotes` map (editable in the free demo); starter examples
  de-privileged — labelled "Starter example" and **removable** (removal tracked in
  `removedDefaultIds`).
- **Step 5 — Strategic Metric Scoring** (`ScoringEvidenceScreen.tsx`): dimension #5 relabelled
  **"Regulatory / Institutional Complexity"**; dimensions reordered to spec §8.4 with the
  canonical DOCX definitions as tooltips; the exact spec §8.2 **disclaimer** now shown as a
  persistent element; evidence-source instruction added.
- **Step 6 — Strategic Comparative Dashboard** (`ComparativeDashboardScreen.tsx`): **letter-grade
  tier column (77 → A-)**; "Expansion Potential / Evidence Confidence / Risk Exposure" headers;
  new **Recommended Action** column (cautious, per-option); weight-framework heading
  "Diagnostic Weight Framework - [Sector] Model" with "Weighting applied to: [Leading Validation
  Candidate]" and real sector weights; spec 9.3 dynamic explanations.
- **Step 7 — Validation & 90-Day Roadmap** (`RoadmapScreen.tsx`): 30-60-90 objectives/actions
  and **exact decision gates** (Continue, revise, or pause. / Launch pilot or delay. / Scale,
  adapt, pause, or test another option.); **five** assumption cards incl. "Internal capability",
  each with a **why-it-matters** field; `Download Report - Full Version` disabled for Demo
  Participant (hyphen label); **locked Step 8 preview** "Next Phase - Entry Readiness Workspace"
  listing the seven full/Pro modules; three CTAs (Request Full Assessment / Book Market Expansion
  Sprint / Contact INNOBASE).
- **Export Brief** (`ExportBriefModal.tsx`): 30-60-90 gate copy synced; version label centralized;
  removed the "Proprietary Enterprise Strategy Tool" footer overclaim.

## 2. Data / API changes & backward compatibility

- **Types** (`src/types.ts`): `EvidenceState` gains `"To Validate"` (legacy `"Unknown"` kept as
  alias + normalized via `evidenceStateLabel()`); `DecisionSetup.desiredOutput?: string[]`;
  `AppState` reconciled to runtime shape + `marketNotes`; new constants `CLIENT_FACING_LABEL`,
  `ACTIVE_SECTORS`, `COMING_SOON_SECTORS`, `DESIRED_OUTPUT_OPTIONS`, `FULL_PRO_MODULES`,
  `INNOBASE_CONTACT_EMAIL`.
- **Persistence**: `App.tsx` state snapshot extended with `marketNotes` + `removedDefaultIds`
  (persisted through the existing `state_snapshot` JSON blob — **no schema migration required**;
  the authoritative Express backend stores state as an opaque JSON blob).
- **Backward-compatible hydration** (`loadSession`): maps legacy `shortlistedMarkets` →
  `selectedMarketIds`; normalizes legacy `appMode` `demo`→`free-demo`, `consultant`→`facilitated`;
  defaults new fields for old sessions. Legacy v4.3.7 sessions hydrate without loss or crash.
- **Session API contract**: `POST/PATCH /api/v2/sessions` unchanged. No migration created (none
  needed). No public migration endpoint invoked.
- **Backend** (`backend/src/`): `EvidenceBasis` reduced to the 3 spec values; `LetterGrade` type +
  `letterGrade()` added to `scoring_engine.ts`; `ScoringResult.letterGrade` populated. The coarse
  `TierClassification` (Tier A/B/C/D) is retained for confidence decoupling — the 117-test scoring
  regression is unaffected.

## 3. Scoring, evidence-confidence & risk logic

- **Adverse dimensions** (Competitive Intensity, Regulatory / Institutional Complexity) are
  inverted (`6 - raw`) before aggregation, so higher raw ≠ rewarded. Unit-tested.
- **Potential / Evidence Confidence / Risk Exposure** are computed **independently** and displayed
  separately (spec 9.1). Evidence confidence reflects evidence quality/source completeness only;
  it does not change potential. Unit-tested for separation.
- **Tier 77 → A-**: `letterGrade()` bands (>=80 A · 75-79 A- · 70-74 B+ · 60-69 B · 50-59 B- ·
  40-49 C · <40 D) match the spec 9.4 example exactly (77→A-, 68/65/61→B, 54→B-). Frontend and
  backend parity unit-tested.
- **Sector weighting**: per-sector category weights (each summing to 1.0) tilt the composite per
  spec §13 emphasis; default/unknown sector preserves the exact v4.3.7 weights.
- **Draft scoring** is derived from captured inputs (capabilities, constraints, offering strategy,
  sector, market notes, evidence states) via a deterministic rule set — **no external model call,
  no secrets, no invented facts** ("AI-assisted / rule-generated", consistent with
  `demo_refinement_logic.md`). Output is validated against a strict 1–5 schema; generation is
  wrapped in try/catch with a retryable failure path; regeneration confirms before overwriting
  user-adjusted values.

## 4. Role / access enforcement

Client gating (`appMode === "free-demo"`) plus authoritative **server-side** capability checks in
`backend/src/api_server.ts` remain intact for Demo Participant: PDF/full-report export (403),
human-review actions (403), ADK workflows (Consultant/Admin), and admin endpoints (403). Step 8 is
unreachable in the free demo (the only entry path is disabled for `free-demo`, and `StepProgress`
hides the preparation step). Consultant Workspace/annotation pad is hidden for Demo Participant.
Administrator identity (`ehsan.banihashem@gmail.com`) and the seed logic are untouched. No real
role mutation performed; RBAC verified via source-level and logic tests (`test:rbac`, `test:auth`).

## 5. Migrations

**None created — none required.** New Step 1–7 fields ride through the existing `state_snapshot`
JSON blob. No Cloud Run Job, no cloud migration, no ephemeral DB migration was executed.

## 6. Unresolved decisions / follow-ups

1. **Step 7 CTA destination** (Request Full Assessment / Book Market Expansion Sprint / Contact
   INNOBASE): no approved external contact endpoint exists in the repo. Implemented as a
   **config-driven** integration point (`INNOBASE_CONTACT_EMAIL`, empty by default). When empty,
   the CTAs are presentational and **make no delivery claim**. A future governed change may set an
   approved INNOBASE address to enable a `mailto:`. **Destination is unresolved by design.**
2. **Pre-existing security finding (out of scope, flagged):** `GET /api/v2/db/run-migration/:name`
   in `api_server.ts` is **unauthenticated** and can execute on-disk migration SQL against the
   PostgreSQL pool. Per directive §7.9 this is a separate security follow-up and was **not touched**
   by v0.2. It should be gated/removed under a governed change. (Related: session routes use a
   decode-only JWT; also pre-existing.)
3. **Pixel screenshots** could not be captured locally (no browser/DOM harness). Faithful
   rendered-HTML evidence of Steps 1–6 was produced instead (see the test report).
4. **`tsc --noEmit`** has 20 **pre-existing** errors (ErrorBoundary class-component react-types,
   Toast `key`, `apiClient.sessions.create` payload typing, and test-file literal comparisons).
   v0.2 changes add **none** and fixed 3 latent toast-API bugs. This repo's real gates are the
   `test:*` scripts, all of which pass.

## 7. Test results (summary — see `demo_scenario_v0.2_test_report.md`)

All local gates pass: `test` 117 · `test:prep` 23 · `test:golden` 20 · `test:persistence` 35 ·
`test:auth` 28 · `test:bundle` 8 · `test:rbac` 37 · `test:demo-v0.2` 83 · `test:governance` 8
(**359** TS/node) + **133** Python (scoring/guardrail/golden/auth/rag/pdf parity). Production build
succeeds. Prohibited/stale client-copy scan is clean.
