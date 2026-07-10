# MEP-light™ — Version Manifest

**Release**: v4.3.6  
**Date**: 2026-07-04  
**Classification**: Production

---

## Version Artifacts

| Artifact | Value |
|----------|-------|
| **Semantic Version** | 4.3.6 |
| **Git Branch** | main |
| **Git Tag** | v4.3.6 |
| **Git Commit SHA** | `7b8acbbe1987afc0ab3736ad688fe99fc0624546` |
| **Container Image** | `gcr.io/innobase-mep-light/market-entry-prioritizer:v4.3.6` |
| **Image Digest** | `sha256:c9ce8cb27bd6d9dc37696701eb819ec089be3bf3cf5a0316d099551c8cdc7a0e` |
| **Cloud Run Service** | market-entry-prioritizer |
| **Cloud Run Region** | europe-west2 |
| **Cloud Run Revision** | `market-entry-prioritizer-00040-x7z` |
| **Primary Production URL** | `https://mep.innobase.app` |
| **Cloud Run Service URL** | `https://market-entry-prioritizer-52156375400.europe-west2.run.app` |
| **Cloud SQL Instance** | mep-light-db |
| **Database** | mep_production |
| **Migration Version** | 002 (002_fix_id_types) |
| **Migration Checksum** | sha256 of 002_fix_id_types.sql |
| **ADK Version** | 4.3.6 (controlled-deterministic) |
| **ADK Mode** | controlled — feature-flagged, role-gated |
| **Rollback Target** | v4.3.5 / revision market-entry-prioritizer-00039-j6b |
| **Previous Version** | 4.3.5 |
| **Secret Manager** | mep-db-password (version 4, active; v1-3 disabled) |

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
| 5 | 005_add_demo_participant_role | pending (not yet deployed) |

---

## Release History

| Version | Date | Summary |
|---------|------|---------|
| 4.3.6+demo | 2026-07-10 | Demo refinement sprint: demo_participant role, AI-assisted scoring, admin governance (self-demotion/last-admin), PostgreSQL migration verified (branch: feature/demo-refinement-sprint, NOT DEPLOYED) |
| 4.3.6 | 2026-07-04 | Final production PDF export auth remediation |
| 4.3.5 | 2026-07-04 | Final production persistence fix (SessionManager hydrate & auth loop fix) |
| 4.1.1 | 2026-07-03 | P0 auth hotfix: placeholder Client ID removal, demo identity removal, PDF auth, build guards |
| 4.1.0 | 2026-07-03 | Production remediation: password rotation, private DB, ADK controlled, SDLC complete |
| 4.0.2 | 2026-07-03 | Cloud SQL integration, Secret Manager, initial production deployment |
| 3.1.0 | 2026-07-03 | Google OAuth, CORS, user management |
| 3.0.0 | 2026-07-02 | Architecture overhaul, ErrorBoundary, session persistence |
| 2.0.0 | 2026-07-01 | Premium landing page, auth gate |
