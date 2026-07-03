# MEP-light™ — SQLite to Cloud SQL Migration Plan

**Version**: 4.0 | **Date**: 2026-07-03 | **Status**: Ready for execution

---

## Current State
- **TypeScript**: In-memory `Map` (users) + SQLite `/tmp/mep-data/mep.db` (sessions) — volatile
- **Python**: SQLite `./data/mep_local.db` — not connected in production
- **Critical defect**: All data lost on Cloud Run cold start/restart

## Target State
- Cloud SQL for PostgreSQL 16 in `europe-west2`
- 13-entity schema with indexes, triggers, and audit trail
- Node.js connects via `pg` + Unix socket
- Python connects via `pg8000` + Cloud SQL connector

## Migration Steps

| # | Step | Owner | Duration | Risk |
|---|------|-------|----------|------|
| 1 | Provision Cloud SQL instance | Human | 10 min | Low |
| 2 | Create database + user | Human | 5 min | Low |
| 3 | Store credentials in Secret Manager | Human | 5 min | Low |
| 4 | Run `001_initial_schema.sql` | Human | 2 min | Low |
| 5 | Deploy new Docker image | CI/CD | 15 min | Medium |
| 6 | Verify `/api/v2/db/health` → postgresql | Human | 1 min | Low |

## Data Migration
**No data migration required.** The existing `/tmp` SQLite database is volatile and contains no persistent production data. This is a clean-start migration.

## Rollback
Revert Cloud Run to previous revision. The application will fall back to SQLite in dev mode (production guard prevents SQLite in prod).
