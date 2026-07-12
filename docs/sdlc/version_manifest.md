# MEP-light™ — Version Manifest

**Release**: v4.3.7  
**Date**: 2026-07-11  
**Classification**: Production  
**Client-Facing Label**: MEP-light Beta Demo v1.6

---

## Unreleased — Demo Scenario v0.2 candidate

> **Not released, not deployed, not tagged.** Local development activity on branch
> `feature/demo-scenario-v0.2`, held for independent QA. The accepted v4.3.7 production
> release below is **unchanged** (revision `market-entry-prioritizer-00041-dqw`).

| Field | Value |
|-------|-------|
| Work item | MEP-light Demo Scenario v0.2 (spec SHA-256 `8f33266cb1d607cf60fe6d584b1e00eeba0d186134955266d83d4987377c097b`) |
| Base commit | `c25a037a9745c505b6608a6b7f993bcce5272663` (v4.3.7 closure) |
| Product version | **unchanged (4.3.7)** — no version bump; no new tag selected |
| Client-facing label | **unchanged** (`MEP-light Beta Demo v1.6`), now centralized in `CLIENT_FACING_LABEL` |
| Development identifier | `demo-scenario-v0.2` (branch name; non-release convention) |
| Migration | none created / none required |
| Local verification | 492 tests pass; production build OK; see `demo_scenario_v0.2_test_report.md` |
| Requires before any deploy | separate **Human GO** for push / staging / migration / production / tag |

---

## Version Artifacts

| Artifact | Value |
|----------|-------|
| **Product Version** | 4.3.7 |
| **Client-Facing Label** | MEP-light Beta Demo v1.6 |
| **Product Mode** | free-demo |
| **Role Name and Value** | Demo Participant (`demo_participant`) |
| **Final Production Release Commit SHA** | `320fcc1e3a6f8ff3aecafa69d8207b04feb85d53` |
| **Tag Name** | v4.3.7-demo-refinement |
| **Exact Tag Target SHA** | `320fcc1e3a6f8ff3aecafa69d8207b04feb85d53` |
| **Docs-Only Closure Commit SHA** | *Will be recorded in Git history after this update* |
| **Full Image Reference** | `gcr.io/innobase-mep-light/market-entry-prioritizer@sha256:581d4fc7f9bb5a7d0b9b1b9b37104b314393b03c7b4100ff2d871f5a9be4016f` |
| **Full Image Digest** | `sha256:581d4fc7f9bb5a7d0b9b1b9b37104b314393b03c7b4100ff2d871f5a9be4016f` |
| **Cloud Run Service** | market-entry-prioritizer |
| **Cloud Run Region** | europe-west2 |
| **Current Production Revision** | `market-entry-prioritizer-00041-dqw` |
| **Rollback Revision** | `market-entry-prioritizer-00040-x7z` |
| **Production URL** | `https://mep.innobase.app` |
| **Final Release Verdict** | DEMO-REFINEMENT-PRODUCTION-DEPLOYED-PASS |
| **Final Smoke Verdict** | PRODUCTION-SMOKE-PASS |
| **Migration 005 State** | Applied successfully via Cloud Run Job during deploy (No execution during closure) |
| **ADK Version** | 4.3.7 (controlled-deterministic) |
| **ADK Mode** | controlled — feature-flagged, role-gated |

---

## Deployment Configuration

| Setting | Value |
|---------|-------|
| NODE_ENV | production |
| ADK_ENABLED | controlled |
| SEED_ADMIN_EMAIL | ehsan.banihashem@gmail.com |
| DEMO_MODE | *not set* (guard blocks in production) |
| Cloud SQL Connection | innobase-mep-light:europe-west2:mep-light-db |
| DB_NAME | mep_production |
| DB_USER | mep_app |
| DB_PASSWORD | Secret Manager `mep-db-password:latest` |
| Min Instances | 1 |
| Max Instances | 3 |
| Memory | 512Mi |
| CPU | 1 |
| Concurrency | 80 |
| Port | 8080 |

---

## Migration History

| Version | Name | Applied |
|---------|------|---------|
| 1 | 001_initial_schema | 2026-07-03T11:38:56Z |
| 2 | 002_fix_id_types | 2026-07-03T13:00:34Z |
| 3 | 003_assessment_state_persistence | 2026-07-10 |
| 4 | 004_fix_session_columns | 2026-07-10 |
| 5 | 005_add_demo_participant_role | 2026-07-11 (production deploy v4.3.7) |

---

## Release History

| Version | Date | Summary |
|---------|------|---------|
| 4.3.7 | 2026-07-11 | Demo Refinement production release: Demo Participant role, free-demo mode, RBAC hardening, session persistence, 7-step demo, User Adjusted badge, evidence confidence, migration 005 |
| 4.3.6 | 2026-07-04 | Final production PDF export auth remediation |
| 4.3.5 | 2026-07-04 | Final production persistence fix (SessionManager hydrate & auth loop fix) |
| 4.1.1 | 2026-07-03 | P0 auth hotfix: placeholder Client ID removal, demo identity removal, PDF auth, build guards |
| 4.1.0 | 2026-07-03 | Production remediation: password rotation, private DB, ADK controlled, SDLC complete |
| 4.0.2 | 2026-07-03 | Cloud SQL integration, Secret Manager, initial production deployment |
| 3.1.0 | 2026-07-03 | Google OAuth, CORS, user management |
| 3.0.0 | 2026-07-02 | Architecture overhaul, ErrorBoundary, session persistence |
| 2.0.0 | 2026-07-01 | Premium landing page, auth gate |
