# MEP-light™ Demo Scenario v0.2 — Requirement Traceability & Gap Matrix

> **Status:** Deployed. Originally developed as v0.2 candidate + Cure-01, now deployed to
> Production (`market-entry-prioritizer-00042-s4m`) and Staging (`mep-light-demo-refinement-staging-00011-c4d`).
> Authoritative source: `efd61c6eaad22cfdc075a1044c3975b762bb9330` on
> `feature/demo-scenario-v0.2-step5-generated-state-cure`.

## Source of truth

| Item | Value |
|------|-------|
| Specification | `MEP-light_Demo_Scenario_v0.2.docx` |
| DOCX SHA-256 | `8f33266cb1d607cf60fe6d584b1e00eeba0d186134955266d83d4987377c097b` |
| Baseline commit | `c25a037a9745c505b6608a6b7f993bcce5272663` (v4.3.7 initial closure) |
| Feature branch | `feature/demo-scenario-v0.2` |
| Cure branch | `feature/demo-scenario-v0.2-cure-01` |
| Final branch | `feature/demo-scenario-v0.2-step5-generated-state-cure` |
| Authoritative commit | `efd61c6eaad22cfdc075a1044c3975b762bb9330` |
| Client-facing label (retained) | `MEP-light Beta Demo v1.6` |

**Baseline status legend:** `SATISFIED` (v4.3.7 already meets spec), `PARTIAL`, `MISSING`, `CONFLICT`.
**Final verdict** is set to `PASS` only after functional implementation + local tests.

---

## A. Implementation Checklist (25 items)

| # | Requirement | Prio | Baseline | Implementation location | Verdict |
|---|-------------|------|----------|--------------------------|---------|
| 1 | Simplify landing page, remove exaggerated claims | P0 | PARTIAL | `LandingPage.tsx` (short desc, CTA, disclaimer 3rd sentence) | PASS |
| 2 | Remove "Trusted by" + floating UAE/Germany/Canada cards | P0 | SATISFIED | already removed; dead CSS cleaned | PASS |
| 3 | Footer branding = INNOBASE | P0 | PARTIAL | `LandingPage.tsx` footer (drop overclaim + Charter) | PASS |
| 4 | Two decision modes only | P0 | SATISFIED | `DecisionSetupScreen.tsx` | PASS |
| 5 | Rename → "Entry / Expansion Horizon" (12/24/36) | P1 | SATISFIED | `DecisionSetupScreen.tsx` | PASS |
| 6 | Revise Strategic Objective placeholder | P0 | SATISFIED | `DecisionSetupScreen.tsx` | PASS |
| 7 | Dynamic Decision Statement (default + template + Step 2 enrichment) | P0 | PARTIAL | `DecisionSetupScreen.tsx` + `App.tsx` props | PASS |
| 8 | Rename → "Company Snapshot" + subtitle | P1 | MISSING | `CompanySnapshotScreen.tsx` | PASS |
| 9 | Active sector options only (+ coming-soon) | P1 | CONFLICT | `CompanySnapshotScreen.tsx` + `App.tsx` default | PASS |
| 10 | Improve market-size/capabilities/constraints placeholders | P1 | PARTIAL | `CompanySnapshotScreen.tsx` | PASS |
| 11 | Org Context Summary synthesizes (not concatenates) + default msg | P0 | PARTIAL | `CompanySnapshotScreen.tsx` | PASS |
| 12 | Rename → "Offering Strategy Selection" | P0 | SATISFIED | `ProductStrategyScreen.tsx` | PASS |
| 13 | Rename field → "Core Offering(s)" + placeholder | P0 | MISSING | `ProductStrategyScreen.tsx` | PASS |
| 14 | No default strategy selection | P0 | SATISFIED | `ProductStrategyScreen.tsx` / `App.tsx` | PASS |
| 15 | Market Context Notes market-specific (or remove) | P1 | PARTIAL | `MarketShortlistScreen.tsx` + `App.tsx` + `types.ts` (dedicated notes) | PASS |
| 16 | Rename → "Strategic Metric Scoring" | P1 | SATISFIED | `ScoringEvidenceScreen.tsx` | PASS |
| 17 | AI-assisted draft scoring w/ review + adjust | P0 | PARTIAL | `src/lib/draftScoring.ts` (new, input-derived) + `App.tsx` + `ScoringEvidenceScreen.tsx` | PASS |
| 18 | Reduce evidence sources to 3 | P1 | SATISFIED (FE) / stale (BE) | `types.ts` (FE ok) + `backend/src/data_models.ts` aligned | PASS |
| 19 | Hide/lock Consultant Workspace in free demo | P0 | SATISFIED | `App.tsx:963` + server gates | PASS |
| 20 | Rename → "Diagnostic Weight Framework" (+ Model suffix) | P0 | PARTIAL | `ComparativeDashboardScreen.tsx` | PASS |
| 21 | Weight framework only for Leading Validation Candidate | P1 | PARTIAL | `ComparativeDashboardScreen.tsx` ("Weighting applied to:") | PASS |
| 22 | Disable Download Report in free demo | P0 | SATISFIED | `RoadmapScreen.tsx` (+ hyphen label) | PASS |
| 23 | Lock Step 8 as Full/Pro | P0 | PARTIAL | `RoadmapScreen.tsx` (Next Phase preview + 7 modules) | PASS |
| 24 | Use "MEP-light Beta Demo v1.6" | P0 | SATISFIED | centralized `CLIENT_FACING_LABEL` const | PASS |
| 25 | Cautious language: Leading Validation Candidate, not Best Market | P0 | SATISFIED | dashboard/roadmap copy | PASS |

## B. Updated Success Criteria (spec §14)

| Criterion | Baseline | Verdict |
|-----------|----------|---------|
| Frame new-entry vs expansion | SATISFIED | PASS |
| Capture business & synthesize org context summary | PARTIAL | PASS |
| Clarify offering strategy + complexity | SATISFIED | PASS |
| Compare 3–5 markets/pathways | SATISFIED | PASS |
| Generate draft scores users can review/adjust | PARTIAL | PASS |
| Separate potential / evidence confidence / risk | SATISFIED | PASS |
| Identify Leading Validation Candidate (not best market) | SATISFIED | PASS |
| Assumptions, risks, data gaps, 30-60-90 roadmap | PARTIAL | PASS |
| End free demo cleanly + invite to full/pro | PARTIAL | PASS |

## C. Additional functional requirements (spec §6–§13 / directive)

| Requirement | Baseline | Location | Verdict |
|-------------|----------|----------|---------|
| Public disclaimer exact text | CONFLICT | `LandingPage.tsx`, `StrategicDisclaimer.tsx` | PASS |
| Desired Output choices (Step 1) | MISSING | `DecisionSetup.desiredOutput` + Step 1 UI | PASS |
| Evidence tags Confirmed/Estimated/To Validate downstream | PARTIAL | `types.ts` enum + PDF payload | PASS |
| Duplicate-market validation | MISSING | `MarketShortlistScreen.tsx` | PASS |
| Dimension label "Regulatory / Institutional Complexity" | PARTIAL | `ScoringEvidenceScreen.tsx` | PASS |
| Tier 77 → A- (letter-grade display) | CONFLICT | `src/lib/scoring.ts` + `scoring_engine.ts` `letterGrade()` | PASS |
| Recommended Action per option (cautious) | MISSING | `ComparativeDashboardScreen.tsx` | PASS |
| Dynamic category explanations (spec 9.3) | PARTIAL | `ComparativeDashboardScreen.tsx` | PASS |
| Sector-specific weighting | MISSING | `src/lib/scoring.ts` `SECTOR_WEIGHTS` | PASS |
| 30-60-90 decision gates exact copy | CONFLICT | `RoadmapScreen.tsx`, `ExportBriefModal.tsx` | PASS |
| 5 assumption cards incl. Internal capability + why-it-matters | PARTIAL | `RoadmapScreen.tsx` | PASS |
| Step 8 CTAs (Request Full Assessment / Book Sprint / Contact) | MISSING | `RoadmapScreen.tsx` (config-driven mailto) | PASS |
| Backward-compat legacy session hydration | PARTIAL | `App.tsx` loadSession normalizer | PASS |

## D. Explicitly out of scope (documented, not implemented)

| Finding | Reason |
|---------|--------|
| Unauthenticated `GET /api/v2/db/run-migration/:name` (api_server.ts:194) | Directive §7.9: separate security follow-up, out of this feature; not touched by v0.2 edits. **Flagged** as a real vulnerability in the implementation report. |
| Decode-only JWT on session routes (`extractJwtUser`) | Pre-existing; not introduced/worsened by v0.2. Documented. |
| Python backend legacy role model (Viewer/Consultant/Admin, no demo_participant) | Legacy/secondary runtime; authoritative backend is TS Express. Documented. |

---

## Non-regression targets (must remain intact)

Google auth · Administrator identity (`ehsan.banihashem@gmail.com`) · Demo Participant restrictions (`innobaseae@gmail.com`) · `productMode=free-demo` (`appMode`) · PostgreSQL persistence + resume · `POST/PATCH /api/v2/sessions` · no PATCH 503 · controlled ADK workflow · Step 8 / full report / consultant / Human Review gating · legacy v4.3.7 sessions hydrate without loss.
