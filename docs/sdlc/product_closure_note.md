# MEP-light™ — Product Closure Note (v4.3.7)

**Date**: 2026-07-11  
**Version**: 4.3.7  
**Status**: DEMO-REFINEMENT-PRODUCTION-DEPLOYED-PASS  
**Independent Smoke**: PRODUCTION-SMOKE-PASS (2026-07-11)  
**Tag**: v4.3.7-demo-refinement

---

## Release Summary

MEP-light™ v4.3.7 is the Demo Refinement Sprint production release. It introduces the Demo Participant role and free-demo product mode, enabling external users to experience a 7-step market entry assessment workflow without access to consultant-grade features.

## What's New

### Demo Participant Role
- New RBAC role: `demo_participant` — auto-provisioned on first Google OAuth login
- Product mode: `free-demo` — isolated from consultant/admin workflows
- Client-facing label: **MEP-light Beta Demo v1.6**

### 7-Step Demo Experience
- Steps 1–7 fully functional for Demo Participant
- Step 8 (Entry Readiness Workspace) locked with upgrade prompt
- Full PDF/Report export locked with upgrade prompt
- Human Review approval/flagging unavailable
- Consultant Workspace / Annotation Pad hidden

### Scoring & Evidence
- Generate Draft Scores: deterministic pre-loaded scores for UAE/Iraq/Germany
- User Adjusted badge: visible when manual score changes are made
- Evidence confidence: deterministic recomputation from per-dimension evidence sources
- Custom markets supported (no pre-loaded scores)

### Admin Governance (Security)
- Self-demotion prevention: Administrator cannot change own role
- Last-admin preservation: last Administrator cannot be demoted or deleted
- Audit logging for blocked governance actions

### Session Persistence
- Autosave via PATCH /api/v2/sessions/:id (2s debounce)
- Refresh persistence via stateSnapshot
- Session resume from SessionManager modal
- Loading state prevents "No previous sessions" flicker

### Infrastructure
- Migration 005: idempotent demo_participant role addition
- Production Cloud Build includes migration step
- apply_migrations.js uses DB_NAME env var (supports staging + production)

## What's Preserved
- Administrator capabilities: full access, Admin Panel, PDF export, Human Review
- Consultant capabilities: full access, PDF export, Step 8, Annotation Pad
- Scoring engine: mathematical accuracy (117/117 tests)
- OAuth: Google Sign-In, real JWT validation
- ADK: controlled-deterministic mode, role-gated

## Test Evidence
- 117 unit tests (scoring engine)
- 37 RBAC code-path tests
- 43 full-stack HTTP RBAC tests (run against production)
- 5 bundle identity tests
- 21 session persistence tests
- **Total: 223 tests, 0 failures**

## Known Non-Blocking Follow-ups
- `v4.3.7` and `CONSULTANT MODE` strings exist in compiled JS but are behind `appMode !== "free-demo"` ternary gates — never rendered for Demo Participant
- Consider merging `feature/demo-refinement-sprint` into `main` after stabilization period
- **Step 5→6 progression**: Document intended behavior for demo accounts when evidence confidence caps keep the "Continue" button disabled. If Overall Confidence remains "Low" (e.g., no per-dimension evidence sources selected), the step-progression gate may block advancement to Step 6. Determine whether demo accounts should auto-unlock Step 6 after Generate Draft Scores, or whether the confidence-based gate should apply equally to all modes.
