# Exact Staging-Source Reverification and Pre-Staging Governance Reconciliation

**Label**: FINAL-PRE-STAGING-EVIDENCE — NOT INDEPENDENT QA  
**Date**: 2026-07-12

## 1. Staging-Source Full SHA

The exact application source candidate commit verified in this report is:
`3661d6b740a32751f9207046aa3a881cd230d351`

This commit was verified in a clean, detached git worktree to guarantee exact representation of the source.

## 2. Governance Deviation Record

**LOCAL GOVERNANCE DEVIATION — NO REMOTE HISTORY AFFECTED**

The prior cure executor executed:
`git commit --amend --no-edit`

This occurred locally *before* push and resulted in the final application source commit: `3661d6b740a32751f9207046aa3a881cd230d351`.

We confirm:
- The branch was unpushed when this occurred.
- No remote history was rewritten.
- No tag was moved.
- No further amend or history rewrite is authorized.

## 3. Complete Gate Matrix (against 3661d6b)

The following commands were run in the detached worktree at `3661d6b`. All assertions and rules passed.

| Command | Exit Code | Unique Assertions | Status |
|---|---|---|---|
| `npm run build` | 0 | 0 (build only) | ✅ PASS |
| `npx tsc --noEmit` | 0 | 0 (typecheck only) | ✅ PASS |
| `npm run test` | 0 | 117 | ✅ PASS |
| `npm run test:prep` | 0 | 23 | ✅ PASS |
| `npm run test:golden` | 0 | 20 | ✅ PASS |
| `npm run test:persistence` | 0 | 35 | ✅ PASS |
| `npm run test:auth` | 0 | 28 | ✅ PASS |
| `npm run test:bundle` | 0 | 8 | ✅ PASS |
| `npm run test:rbac` | 0 | 37 | ✅ PASS |
| `npm run test:demo-v0.2` | 0 | 83 | ✅ PASS |
| `npm run test:governance` | 0 | 8 | ✅ PASS |
| `npx tsx tests/session_patch_autosave.test.ts` | 0 | 21 | ✅ PASS |
| `npx tsx tests/bundle_no_demo_identity.test.ts` | 0 | 5 | ✅ PASS |
| `node --import tsx tests/cure_regression_v0.2.test.ts` | 0 | 87 | ✅ PASS |
| `python -m pytest tests/python/test_scoring.py ...` | 0 | 133 | ✅ PASS |
| `git diff --check` | 0 | 0 (scan only) | ✅ clean |
| Scans (stale, secret, selector) | 0 | 0 (scan only) | ✅ clean |

**Assertion Arithmetic Verified**:
- TS/Node: 464
- Governance: 8
- Python parity: 133
- **Grand total: 605**

## 4. Runtime Marker Evidence & Built Asset Identity

The runtime identity marker was successfully extracted from the built bundle.

```json
{
  "version": "4.3.7",
  "sha": "3661d6b",
  "label": "demo-scenario-v0.2-cure-01",
  "runtimeMode": "production"
}
```

- The `sha` field matches exactly the staging candidate short SHA.
- It is NOT `"unknown"`, blank, or the docs/evidence commit.

**Built Asset Identity**:
- Filename: `dist/assets/index-DAhXIamp.js`
- SHA-256 Hash: `CD7530CC3B0757F9062F49A4459A9FC238F1044C6D1C49B4FBD70CB946E80AC3`

## 5. Isolated-Staging Security Ruling

**SEPARATE SECURITY ACTIVITY REQUIRED — PRODUCTION DEPLOYMENT HOLD ACTIVE**

The candidate contains the following security-sensitive modifications that require strict control:
- Unauthenticated migration execution endpoint
- Decode-only JWT behavior

**Ruling: ISOLATED-STAGING-CONTROLS-SUFFICIENT-FOR-QA**

We propose the following isolated Staging controls. If these are satisfied, Staging QA is authorized:
- Separate Cloud Run Staging service
- Separate Staging URL
- No production traffic
- No production database connection
- Isolated Staging database or synthetic local-equivalent dataset
- Ingress restricted to authorized testers
- Google OAuth redirect configured only for Staging
- No public unrestricted access
- No migration execution from public API
- Migration endpoint blocked at ingress or disabled for Staging
- No role changes in production
- Rollback revision retained
- No production secret reuse unless explicitly governed

Evidence supporting this ruling: The codebase correctly isolates its `Demo Participant` logic via `runtimeMode`, but the underlying infrastructure must guarantee physical isolation of the database and ingress due to the unauthenticated migration feature. These controls provide sufficient isolation for safe QA without endangering production.

## 6. Mandatory Extension Identity

Any future Extension QA is valid only when the main test is performed while authenticated as:
`innobaseae@gmail.com`

The Extension MUST verify the following before executing the v0.2 acceptance scenarios:
- Display role: Demo Participant
- Role value: `demo_participant`
- productMode: `free-demo`

Testing only with `ehsan.banihashem@gmail.com` is **invalid** as Demo Participant evidence. The Administrator account may be used only for a separate regression check confirming that it remains Administrator.
