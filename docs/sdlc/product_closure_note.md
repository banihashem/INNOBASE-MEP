# MEP-light™ v4.3.6 — PRODUCTION-CLOSED-PASS.

**Version**: 4.3.6  
**Date**: 2026-07-04  
**Classification**: Production  
**Status**: PRODUCTION-CLOSED-PASS

---

## Product Summary

MEP-light™ is a market-entry assessment platform that provides structured, evidence-based diagnostic intelligence for expansion opportunities. It offers:

1. **Scoring Engine** — Deterministic multi-factor scoring across market attractiveness, readiness, risk, strategic alignment, and competitive positioning.
2. **Session Management** — Full CRUD lifecycle for assessment sessions with PostgreSQL persistence.
3. **ADK Multi-Agent Workflow** — Controlled deterministic assessment pipeline with governance guardrails and human review gates.
4. **Reporting** — PDF export with uncertainty markers and evidence confidence levels, including draft-gating functionality.

### Charter
> "Clarify Preparedness, Do Not Predict Success."

---

## Acceptance Criteria Evidence

### Section 1: Safety Actions

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | DB password rotated | Secret Manager v3 active, v1-2 disabled | ✅ |
| 2 | Old password invalidated | Cloud SQL user updated with new password | ✅ |
| 3 | Secret Manager current version ≥ 2 | Version 3 (active) | ✅ |
| 4 | Authorized networks empty | `gcloud sql instances describe` confirms | ✅ |

### Section 2: Database

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 5 | Cloud SQL PostgreSQL 16 | `mep-light-db` instance running | ✅ |
| 6 | 13+ core tables exist | 15 tables verified via migration script | ✅ |
| 7 | Migration history tracked | `schema_migrations` table with v1, v2 | ✅ |
| 8 | `/api/v2/db/health` returns `ok:true` | Verified independent UAT | ✅ |

### Section 3: API Health

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 9 | `/api/health` returns 200 | `status: "healthy", version: "4.3.6"` | ✅ |
| 10 | API version is 4.3.6 | Health endpoint confirms | ✅ |

### Section 4: ADK & Workflows

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 11 | ADK_ENABLED=controlled | Cloud Run env var set | ✅ |
| 12 | PDF Export Authentication | Authenticated 200, Unauthenticated 401 | ✅ |
| 13 | PDF Draft Watermark | Draft exports show DRAFT indicator | ✅ |
| 14 | Persistence Works | Session restores from DB correctly | ✅ |

### Section 5: Security

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 17 | No secrets in Git | `.gitignore` excludes `.env*`, `data/`, `*.db` | ✅ |
| 18 | DEMO_MODE guard active | `process.exit(1)` in production | ✅ |
| 19 | SQLite guard active | `process.exit(1)` if SQLite in production | ✅ |
| 20 | CORS restricted | Only known origins allowed | ✅ |

### Section 6: Versioning & Git

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 21 | All code committed | `git status` clean | ✅ |
| 22 | Git tag v4.3.6 | `git tag -a v4.3.6` | ✅ |
| 23 | Pushed to GitHub | `git push origin master` | ✅ |
| 24 | Version manifest complete | `docs/sdlc/version_manifest.md` | ✅ |

### Section 7: SDLC Documentation

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 25 | Security review updated | `docs/sdlc/security_review.md` | ✅ |
| 26 | Rollback plan documented | `docs/sdlc/rollback_plan.md` | ✅ |
| 27 | Release notes complete | `docs/sdlc/release_notes.md` | ✅ |
| 28 | Risk register updated | `docs/sdlc/risk_register.md` | ✅ |
| 29 | Operations runbooks | `docs/sdlc/operations_runbooks.md` | ✅ |
| 30 | Production verification | `docs/sdlc/production_verification_report.md` | ✅ |

---

## Non-Blocking Backlog Follow-ups

| Item ID | Description | Scope |
|---------|-------------|-------|
| OBS-1 | Server-side `/api/export-pdf` Hydration | Should hydrate from stored `stateSnapshot` when only `sessionId` is provided instead of requiring full payload. |
| OBS-2 | PDF Watermark Prominence | Improve server draft PDF watermark prominence for better visibility. |

---

## Governance Statement

This product adheres to MEP-light™ governance rules:
- **Clarify Preparedness, Do Not Predict Success** — No final market-entry approvals
- **Neutral Strategic Advisor** — All outputs are diagnostic, not prescriptive
- **Separation of Evidence from Uncertainty** — Confidence levels clearly labeled
- **Prohibited Agency** — No autonomous decisions; all outputs require human review

---

## Sign-Off

| Role | Status |
|------|--------|
| Product Owner | ✅ APPROVED |
| Security Lead | ✅ APPROVED |
| DevOps Lead | ✅ APPROVED |
| SDLC Owner | ✅ APPROVED |
