# MEP-light™ — Release Notes

**Version**: 4.1.1  
**Date**: 2026-07-03  
**Classification**: Internal

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
