# MEP-light™ Demo Scenario v0.2 — Test & Verification Report

> **Status: Unreleased / Demo Scenario v0.2 candidate.** Local verification only.
> No cloud resource was mutated; production remains on v4.3.7 / revision
> `market-entry-prioritizer-00041-dqw`.

## 1. Commands, counts & results

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run lint` (`tsc --noEmit`) | 20 **pre-existing** errors; **0 new** (baseline HEAD = 23; v0.2 fixed 3). See §4. |
| Scoring engine (regression) | `npm run test` | **117 / 117** ✅ |
| Product prep | `npm run test:prep` | **23 / 23** ✅ |
| Golden scenario | `npm run test:golden` | **20 / 20** ✅ |
| Persistence (SQLite) | `npm run test:persistence` | **35 / 35** ✅ |
| Auth regression (gate) | `npm run test:auth` | **28 / 28** ✅ |
| Bundle regression (gate) | `npm run test:bundle` | **8 / 8** ✅ |
| Built-bundle identity scan | `npx tsx tests/bundle_no_demo_identity.test.ts` | **5 / 5** ✅ |
| Session PATCH/autosave | `npx tsx tests/session_patch_autosave.test.ts` | **21 / 21** ✅ |
| Demo Participant RBAC (gate) | `npm run test:rbac` | **37 / 37** ✅ |
| **v0.2 unit tests (new)** | `npm run test:demo-v0.2` | **83 / 83** ✅ |
| Governance agent (Python) | `npm run test:governance` | **8 / 8** ✅ |
| Python scoring parity | `pytest tests/python/test_scoring.py test_guardrail.py test_golden_somayeh.py test_auth.py test_rag.py test_pdf.py` | **133 passed** ✅ |
| Production build (local) | `npm run build` | ✅ built (1705 modules, ~1.6s) |
| `git diff --check` | (see §5) | clean |
| Prohibited/stale copy scan | grep of `src/` | clean (see §3) |

**Totals:** 359 TS/node assertions + 133 Python = **492 passing**.

## 2. New v0.2 unit coverage (`tests/demo_scenario_v0.2.test.ts`, 83 assertions)

- Letter-grade tier mapping incl. **77 → A-**, boundaries, frontend↔backend parity.
- Sector weight profiles sum to 1.0; `resolveSectorWeights` fallback.
- **Adverse-dimension inversion** (higher Competitive/Regulatory → lower potential, higher risk).
- **Potential / confidence / risk separation** (evidence quality does not change potential).
- Recommended Action is cautious (no unconditional "enter this market"; low-confidence → hypothesis).
- **Input-derived draft scoring**: all 9 dims integer ∈ [1,5]; distinct per market; risk/budget
  signals move the right dimensions; evidence confidence from evidence-state completeness.
- **Strict schema validation**: rejects missing dimensions (`DraftScoreError`); clamps + rounds.
- **Dynamic decision statement**: default before input; mapping (entry/expansion, "[N]-month
  period"); **does not concatenate the raw objective**; Step 2 enrichment appended.
- **Org summary synthesis**: default message; rejects empty/name-only; **not a raw concatenation**
  of field values; advisory prose materially expands beyond inputs.
- Legacy `Unknown → To Validate` evidence-state mapping.

## 3. Prohibited / stale client-copy scan

`src/` scanned for: `deterministic`, `Best Market`, `Trusted by`, `Version 1.4.x`, `Charter`,
floating `landing-float`/`landing-proof` class usage, `Proprietary Enterprise`. **All clear.**
(Internal engine code comments referencing "Charter compliance"/"deterministic" remain — these are
internal architecture notes, never surfaced in client-facing copy.)

## 4. Typecheck detail

Baseline HEAD `tsc --noEmit` = **23** errors (measured via `git stash`): `App.tsx` 3,
`ErrorBoundary.tsx` 12, `RoadmapScreen.tsx` 2, `Toast.tsx` 1, `auth_regression.test.ts` 4,
`rbac_demo.test.ts` 1. Working tree = **20** (fixed the 3 toast-callable bugs in `App.tsx` and
`RoadmapScreen.tsx`). No error occurs in any file created or heavily edited by v0.2. These are
long-standing issues (React class-component typing, a `key` prop spread, and `apiClient.sessions.create`
payload typing) unrelated to this feature; the repo's enforced gates are the `test:*` scripts.

## 5. End-to-end scenario verification

No browser/DOM automation harness exists locally (no Playwright/Puppeteer/jsdom). The seven
mandated E2E scenarios were verified at the logic/integration and rendered-output level:

| # | Scenario | How verified |
|---|----------|--------------|
| 1 | New Entry, 3 markets, Consumer Goods & Retail | `computeMarketResult` + sector weights unit tests; Step 4/6 rendered evidence |
| 2 | Existing Expansion, 5 pathways, Food & Beverage | decision-statement expansion mapping + F&B sector weight tests; 3–5 validation test |
| 3 | Mobility & Logistics, user-adjusted score, resume after refresh | `userAdjusted` persistence (`session_patch_autosave`, `persistence`); draft regenerate-confirm logic |
| 4 | SaaS, low evidence confidence, Step 5→6 guidance | confidence-decoupling / discrepancy + recommendedAction("hypothesis") unit tests; no silent dead-end (continuation always enabled) |
| 5 | Legacy v4.3.7 session hydration | `loadSession` backward-compat mapping (`shortlistedMarkets`, `appMode`, `Unknown`); persistence tests |
| 6 | Demo Participant direct-access denial (Step 8 / full report) | `test:rbac` (Step 8 lock, PDF lock, notes hidden) + server 403 checks (`test:auth`) |
| 7 | Administrator regression (local/mocked auth) | `test:auth` (admin-seed detection), `test:rbac` (admin preserved) |

## 6. Visual evidence index

Rendered-HTML captures (react-dom/server static markup — faithful copy/structure, not pixel
screenshots) in `docs/sdlc/evidence/demo_scenario_v0.2/`:

- `step1-decision-setup.html` · `step2-company-snapshot.html` · `step3-offering-strategy.html` ·
  `step4-potential-markets.html` · `step5-strategic-metric-scoring.html` ·
  `step6-comparative-dashboard.html`
- `SHA256SUMS.txt` — SHA-256 manifest (includes the DOCX hash).

Rendered evidence was string-verified to contain the spec copy (e.g. "Company Snapshot", "Core
Offering(s)", "Market Context Notes -", "Regulatory / Institutional Complexity", "These are draft
scores generated…", "Diagnostic Weight Framework", "Weighting applied to:", "Leading Validation
Candidate", "Expansion Potential Score") and the dashboard tier column renders letter grades
**A- / B / B-** for the demo dataset.

**Limitation:** Landing and Step 7 (Roadmap) import auth/`apiClient` (vite-only globals) and pixel
screenshots require a browser harness not present locally — QA should capture those from a running
dev server (`npm run dev` + the Express API). The evidence set contains **no** secrets, tokens,
cookies, OAuth values, DB URLs, or personal session data.

## 7. Failures encountered & cures

| Failure | Cause | Cure |
|---------|-------|------|
| `test:rbac`: PDF label assertion | Spec §10.4 changed em-dash → hyphen (`Download Report - Full Version`) | Updated the assertion string to the spec label (behavior check preserved) |
| `test:rbac`: disclaimer text assertion | Disclaimer reworded to v0.2 wording | Appended a regulatory/legal/investment safety clause to `StrategicDisclaimer`; updated assertion to new spec phrasing (still checks does/not/predict/regulatory) |
| `session_patch_autosave`: PDF label | Same hyphen change | Updated assertion to hyphen label |
| `tsc`: `toast(...)` not callable (App + Roadmap) | Latent pre-existing toast-API misuse in code my edits touched | Corrected to the object API (`useToast()` + `.error/.info`) — fixes 3 pre-existing errors |

No test was masked or weakened; assertions were updated only where the spec legitimately changed
the copy, and the underlying RBAC/behavior checks were retained.

## 8. No-cloud-mutation attestation

No production/staging deploy, no Cloud Run service/revision/traffic change, no cloud build
submission, no production/staging migration, no Cloud Run Job, no role mutation, no push, no tag,
and no read/write of cloud state were performed. Migrations were neither created nor run (none
required). All verification ran against local, isolated resources only.
