# MEP-light™ Demo Scenario v0.2 — Cure Evidence Report
# DEVELOPER-CURE-EVIDENCE — NOT INDEPENDENT QA

## Candidate Identity

| Field | Value |
|-------|-------|
| Branch | `feature/demo-scenario-v0.2-cure-01` |
| Initial Cure Commit | `0ac38da` fix(demo): cure v0.2 scoring UX, TS gate, narrative, identity marker |
| Precision Commit | `1a91492` fix(cure): TS precision + narrative consistency + cure regression tests |
| Evidence Commit | `bb6a5a5` docs(sdlc): cure-v0.2-01 evidence report + SHA-256 manifest |
| Docs Reconciliation | `90575b5` docs(sdlc): cure-01 final reconciliation |
| **STAGING_SOURCE_CANDIDATE** | **`3661d6b`** (`3661d6b740a32751f9207046aa3a881cd230d351`) fix(build): make v0.2 runtime marker commit-exact |
| Original v0.2 HEAD | `cf7233c` |
| Date | 2026-07-12 |
| Executor | Cure technical executor (not independent QA) |
| Runtime marker | `{ version: "4.3.7", sha: "3661d6b", label: "demo-scenario-v0.2-cure-01", runtimeMode: "production" }` |

## Defects Cured (This Commit)

### §4.1 — Session Create Payload Typing
- **Before**: `Record<string, unknown>` intersection — overly permissive
- **After**: Precise typed interface matching exact backend POST handler destructure (api_server.ts:1254)
- **Fields**: `id, title, companyName, offeringName, inputData, stateSnapshot, currentStep, completionPercent, reviewStatus, status`

### §4.2 — Toast `key` Prop Handling
- **Before**: `key?: React.Key` explicitly in `ToastItemViewProps` — non-idiomatic for React 19
- **After**: Converted to `React.FC<ToastItemViewProps>` which handles `key` automatically in React 19's built-in types

### §4.3 — Test Assertion Type Widening
- **Before**: `as string` casts in auth regression tests
- **After**: `let` declarations for proper type widening without assertion

### §4.4 — ErrorBoundary (pre-existing)
- Already resolved in `0ac38da` — `declare` statements verified, no `@ts-ignore`/`@ts-nocheck`

### §5.3.1 — Narrative Constraint Section Mode Leak
- **Before**: `buildOrgContextSummary` constraints section hardcoded "the expansion decision" regardless of mode
- **After**: Uses `entryOrExpansion` variable consistently — "the entry decision" / "the expansion decision"

## Test Results — Complete Matrix

| Suite | Command | Pass/Total | Status |
|-------|---------|------------|--------|
| TypeScript | `npx tsc --noEmit` | 0 errors | ✅ PASS |
| Scoring Engine | `npm run test` | 117/117 | ✅ PASS |
| Product Prep | `npm run test:prep` | 23/23 | ✅ PASS |
| Golden Scenario | `npm run test:golden` | 20/20 | ✅ PASS |
| Persistence | `npm run test:persistence` | 35/35 | ✅ PASS |
| Auth Regression | `npm run test:auth` | 28/28 | ✅ PASS |
| Bundle Regression | `npm run test:bundle` | 8/8 | ✅ PASS |
| Demo v0.2 | `npm run test:demo-v0.2` | 83/83 | ✅ PASS |
| RBAC | `npm run test:rbac` | 37/37 | ✅ PASS |
| Governance (Python) | `npm run test:governance` | 8/8 | ✅ PASS |
| Session Patch | `npx tsx tests/session_patch_autosave.test.ts` | 21/21 | ✅ PASS |
| Bundle Identity | `npx tsx tests/bundle_no_demo_identity.test.ts` | 5/5 | ✅ PASS |
| **Cure Regression** | `node --import tsx tests/cure_regression_v0.2.test.ts` | **87/87** | ✅ PASS |
| Python Parity | `python -m pytest tests/python/test_scoring.py ...test_pdf.py` | 133/133 | ✅ PASS |
| Vite Build | `npm run build` | 1706 modules, 1.48s | ✅ PASS |
| TypeScript | `npx tsc --noEmit` | 0 errors | ✅ PASS |
| `git diff --check` | whitespace | clean | ✅ PASS |
| **TS/Node subtotal** | | **464** | ✅ ALL PASS |
| **Governance** | | **8** | ✅ ALL PASS |
| **Python Total** | | **133** | ✅ ALL PASS |
| **Grand Total** | | **464 + 8 + 133 = 605** | ✅ ALL PASS |

## Cure Regression Coverage (87 assertions)

| Section | Assertions | Coverage Area |
|---------|-----------|---------------|
| §5.1 | 13 | Adverse dimension labels, inversion math, guidance text |
| §5.2 | 9 | User-adjusted badge, persistence, regeneration guard |
| §5.3 | 10 | Narrative entry/expansion mode consistency |
| §5.4 | 14 | Low-confidence flow, no dead-ends, discrepancy alerts |
| §5.5 | 16 | Runtime identity marker contract, runtimeMode, bundle safety |
| §5.6 | 7 | ErrorBoundary declare statements, lifecycle, no suppressions |
| §5.7 | 18 | Build SHA resolution, CI override, fail-fast, bundle SHA verification |


## Changed Files (from cf7233c baseline)

```
 backend/src/data_models.ts               |   2 +
 src/App.tsx                              |  12 ++
 src/components/CompanySnapshotScreen.tsx  |   5 +-
 src/components/ErrorBoundary.tsx         |   6 +-
 src/components/ScoringEvidenceScreen.tsx  |  26 +--
 src/components/Toast.tsx                 |  14 +-
 src/env.d.ts                             |  14 ++
 src/landing.css                          | 107 ---
 src/lib/apiClient.ts                     |  14 +-
 src/lib/narrative.ts                     |  20 ++-
 tests/auth_regression.test.ts            |  10 +-
 tests/cure_regression_v0.2.test.ts       | 271 +++
 vite.config.ts                           |   5 +
 13 files changed, 367 insertions(+), 139 deletions(-)
```

## Security Statements

> **SEPARATE SECURITY ACTIVITY REQUIRED — DEPLOYMENT HOLD ACTIVE**
>
> The following items require separate security review before any deployment:
> - Unauthenticated migration execution endpoint
> - Decode-only JWT behavior

> **POTENTIAL SECRET EXPOSURE REQUIRES HUMAN SECURITY OWNER REVIEW**
>
> Potentially affected credential categories:
> - Gemini/API-key category
> - Google OAuth client-credential category
>
> No values are displayed, inspected, rotated, revoked, or modified.

> No secrets, credentials, API keys, or tokens were introduced, exposed, or hardcoded in any source file, environment declaration, or build constant. The `__BUILD_SHA__` and `__BUILD_LABEL__` constants contain only public commit metadata.

## Working Tree State

```
$ git status --short
(clean)
```
