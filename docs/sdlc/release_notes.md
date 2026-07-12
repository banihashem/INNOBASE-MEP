# MEP-light™ — Release Notes

**Version**: 4.3.7  
**Date**: 2026-07-11  
**Classification**: Production  
**Client-Facing Label**: MEP-light Beta Demo v1.6

---

## v4.3.7 — Demo Refinement Sprint (PRODUCTION)

**Branch**: `feature/demo-refinement-sprint`  
**Date**: 2026-07-12  
**Status**: DEMO-REFINEMENT-PRODUCTION-DEPLOYED-PASS  
**Independent Smoke**: PRODUCTION-SMOKE-PASS (2026-07-11)  
**Tag**: `v4.3.7-demo-refinement`

### Summary
Demo Participant role RBAC implementation with AI-assisted scoring, user adjustment tracking, admin governance security, and full-stack + PostgreSQL verification pass.

### Changes
- **New RBAC role**: `demo_participant` — auto-provisioned on first login
- **Product Mode**: `free-demo` mode ensures strict client-facing limits for external users
- **Client-Facing Label**: `MEP-light Beta Demo v1.6` (Obsolete Version 1.4.0 string correctly removed from Export Brief)
- **AI-assisted scoring**: "Generate Draft Scores" button populates scores from prior inputs
- **User adjustment markers**: "User Adjusted" badges on manually modified dimensions
- **Server-side persistence & Persistence/PATCH 503 Correction**: Auto-save enabled for free-demo sessions, the previous PATCH HTTP 503 regression was corrected and has not returned.
- **Migration 005**: Idempotent `demo_participant` role addition with dynamic constraint discovery. It was applied successfully via Cloud Run Job during deployment and is fully operational.
- **Admin governance (SECURITY)**:
  - Administrator account (`ehsan.banihashem@gmail.com`) protection verified; Administrator cannot change own role (self-demotion prevention)
  - Last remaining Administrator cannot be demoted or deleted (last-admin preservation)
  - Audit events logged for blocked self-role-change and last-admin-change attempts
- **Deployment Identity**: Cloud Run Service `market-entry-prioritizer` on revision `market-entry-prioritizer-00041-dqw` (Region: `europe-west2`)

### Demo Access Restrictions
- Step 5 heading successfully corrected to `Strategic Metric Scoring`
- Step 8 / Entry Readiness Workspace (UI locked)
- PDF export (403) and Full Report download (locked)
- Consultant Notes / Annotation Pad (UI hidden)
- Human Review (controls unavailable)
- Admin endpoints: user management, stats, role changes (403)

### Known Non-Blocking Follow-ups
1. **Demo Step 5 to Step 6 behavior**: Document the observed behavior for demo accounts when the confidence cap prevents or limits "Continue" from Step 5 to Step 6. Clarify whether this limitation is intentional, what UX or product documentation is required, and whether an explanatory message should be added in a future change. Do not change workflow behavior.
2. **Migration endpoint security review**: Review and either secure, disable, remove, or formally close the potential public endpoint: `/api/v2/db/run-migration/:name`. Database migrations should be performed only through the governed deployment pipeline or an authorized Cloud Run Job. Migration execution should not be exposed as an unrestricted public API. This requires a separate security/code activity.

---

## v4.3.6 — PDF Export Auth Remediation (Production Closure)

### 🟢 Critical Fix: PDF Export 401 Authorization

- **Root Cause**: The `POST /api/export-pdf` call in the frontend `App.tsx` was using a raw `fetch` call and failing to attach the `Authorization: Bearer <token>` header, leading to a `401 Unauthorized` response when invoked in production, even if the user was fully authenticated and the assessment was approved.
- **Fix**: Refactored the client-side `handleDownloadPDF` method to use `apiClient.exportPdf(payload)`. This leverages the shared `fetchWithRetry` utility, automatically attaching the JWT from `sessionStorage`.
- **UI Improvements**:
  - Implemented robust UI error handling for PDF export failures via toast notifications.
  - Added a `"DRAFT — NOT HUMAN REVIEWED"` watermark to the `ExportBriefModal` that is displayed when the `reviewStatus` is pending/not approved.
- **Tests**: Created a new `tests/pdf_auth.test.ts` suite to verify PDF export endpoint auth gating.

### Verification
- Independent UAT confirmed PDF export succeeds (200 OK) with real assessment data for fully authenticated, approved sessions.
- Unauthenticated requests correctly return 401. Empty bodies return 400.
- All production persistence and health checks pass. **Production is closed.**

---

## v4.3.5 — Production Persistence Fix

### 🟢 Critical Fix: Persistence & State Rehydration

- **Root Cause**: Backend was returning a 500 error because `mep_local.db` schema didn't match the PostgreSQL `state_snapshot` column. Furthermore, a React StrictMode edge case in `LandingPage.tsx` caused an infinite loading loop due to redundant Google Sign-in triggers. Finally, frontend session IDs were incorrectly passed as `undefined` in the resume path.
- **Fix**: Wiped and correctly resynced `mep_local.db` schema. Adjusted GIS loading state to handle React 18 StrictMode without getting stuck. Fixed `SessionManager.tsx` to properly extract and use session IDs when resuming state.
- **Result**: `SessionManager` now properly creates, saves, and lists sessions. Data hydrates correctly from the backend across page reloads.

### Verification
- Production UAT confirmed Session ID correctly increments and backend persists state on Step transitions.
- PDF Review gate correctly returns `401 Unauthorized` without credentials.

---

## v4.1.1 — P0 Authentication Blocker Remediation

### 🔴 Critical Fix: Production Login

- **Root Cause**: Google OAuth Client ID was not injected into the Docker build, causing the frontend to use a placeholder value and fall back to a demo identity.
- **Fix**: Removed placeholder fallback entirely. If `GOOGLE_CLIENT_ID` is missing at build time, the Dockerfile now **fails immediately** instead of producing a broken bundle.
- **Demo Identity Removed**: `consultant@innobase.app` / `Strategy Consultant` / `demo-user-id` are no longer reachable in production builds. Demo mode is gated behind `import.meta.env.DEV && VITE_DEMO_MODE=true`.

### Security

- **PDF Export**: `/api/export-pdf` now requires JWT authentication and Consultant/Administrator role (was previously unauthenticated).
- **JWT Audience Validation**: Backend now validates JWT `aud` claim matches the expected `GOOGLE_CLIENT_ID`.
- **Sign-out Loop Prevention**: `UserProfileMenu` prevents infinite 401→signOut→mount→401 cycles.
- **Build Guards**: Dockerfile fails if `GOOGLE_CLIENT_ID` is empty; post-build step scans `dist/` for forbidden strings.
- **Cloud Build Validation**: Added validation step that fails if `_GOOGLE_CLIENT_ID` substitution is empty.

### API Changes

- `GET /api/v2/auth/config-status` — Safe diagnostic endpoint returning auth configuration metadata (no secrets exposed)
- `POST /api/export-pdf` — Now requires `Authorization: Bearer <jwt>` header (401/403 without)
- `GET /api/health` — Version updated to 4.1.1

### Tests

- Auth regression tests expanded from 15 to 28 assertions (AUTH-REG-011 through AUTH-REG-014)
- New `tests/bundle_no_demo_identity.test.ts` — scans production bundle for forbidden demo strings

### Documentation

- New: `incident_auth_login_blocker.md`, `rollback_decision_record.md`
- Updated: `security_review.md`, `risk_register.md`, `release_notes.md`, `version_manifest.md`

---

## v4.1.0 — Production Readiness Remediation

### Security

- **Password Rotation**: Database password rotated after exposure in logs. Secret Manager version 3 active, versions 1-2 disabled.
- **Authorized Networks**: Cleared all Cloud SQL authorized networks. No direct public IP access.
- **VPC Private Access**: Private services access configured for Cloud SQL (migration to private-only IP in progress).
- **Secret Scanning**: All committed artifacts verified free of secrets.
- **Gitignore Hardened**: Added exclusions for `data/`, `logs/`, `scripts/`, `*.db`, `*.sqlite`.

### Database

- **Migration 002**: Fixed UUID/TEXT type mismatch — application-generated string IDs now work correctly with PostgreSQL.
- **Schema Verified**: All 15 tables confirmed present in `mep_production`.
- **CRUD Tested**: Insert/read/delete verified against production Cloud SQL.
- **Health Endpoint Fixed**: `/api/v2/db/health` now returns `ok: true` after migration fix.

### ADK (Agent Development Kit)

- **Controlled Deterministic Mode**: ADK activated in `controlled` mode (no LLM calls).
- **Assessment Workflow**: 6-phase deterministic pipeline (session load → evidence review → scoring → assumptions/risks → governance → human review gate).
- **Agent Run Persistence**: All agent runs recorded in `agent_runs` table.
- **Agent Artifacts**: Workflow summaries stored in `agent_artifacts` table.
- **Governance Checks**: 5-rule governance validation on all outputs.
- **Human Review Gate**: Mandatory before any client-facing export.
- **Role-Gated**: Only Consultant and Administrator users can trigger ADK workflows.

### Operations

- **Min Instances**: Set to 1 to eliminate cold-start 503 errors.
- **Structured Logging**: All components emit structured JSON logs.
- **Audit Events**: Database-persisted audit trail for all security-relevant actions.
- **Version Bump**: API version updated to 4.1.0.

### API Changes

- `GET /api/v2/adk/health` — ADK service health check
- `POST /api/v2/adk/assess` — Run controlled assessment workflow (Consultant/Admin only)
- `GET /api/v2/adk/runs` — List agent runs (Consultant/Admin only)
- `GET /api/v2/db/tables` — List all database tables with schema completeness check

### Documentation

- New: `version_manifest.md`, `rollback_plan.md`, `product_closure_note.md`
- Updated: `security_review.md`, `risk_register.md`, `operations_runbooks.md`, `production_verification_report.md`

---

## v4.0.2 — Cloud SQL Integration

- Cloud SQL PostgreSQL 16 provisioned (europe-west2)
- Secret Manager integration for DB password
- Cloud Run deployment with Cloud SQL connector
- Initial production migration (001_initial_schema)

## v3.1.0 — Google OAuth & User Management

- Google JWKS-based JWT verification
- Admin seed provisioning
- CORS restriction to known origins
- User management API (CRUD)

## v3.0.0 — Architecture Overhaul

- AuthProvider with ErrorBoundary
- Session persistence
- Structured telemetry
- API hardening

## v2.0.0 — Landing Page & Auth Gate

- Premium landing page with Google login
- Session-gated access

## v1.6.0 — User Management

- Database-backed user store
- Enterprise Python backend (FastAPI)
