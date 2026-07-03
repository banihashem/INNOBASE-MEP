# MEP-light™ — Version Manifest

**Release**: v4.1.0  
**Date**: 2026-07-03  
**Classification**: Internal

---

## Version Artifacts

| Artifact | Value |
|----------|-------|
| **Semantic Version** | 4.1.0 |
| **Git Branch** | master |
| **Git Tag** | v4.1.0 |
| **Git Commit SHA** | *(populated after commit)* |
| **Container Image** | `gcr.io/innobase-mep-light/market-entry-prioritizer:v4.1.0` |
| **Image Digest** | *(populated after build)* |
| **Cloud Run Service** | market-entry-prioritizer |
| **Cloud Run Region** | europe-west2 |
| **Cloud Run Revision** | *(populated after deploy)* |
| **Cloud SQL Instance** | mep-light-db |
| **Database** | mep_production |
| **Migration Version** | 002 (002_fix_id_types) |
| **Migration Checksum** | sha256 of 002_fix_id_types.sql |
| **ADK Version** | 4.1.0 (controlled-deterministic) |
| **ADK Mode** | controlled — feature-flagged, role-gated |
| **Rollback Target** | v4.0.2 / revision market-entry-prioritizer-00022-hdg |
| **Previous Version** | 4.0.2 |
| **Secret Manager** | mep-db-password (version 3, active) |

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

---

## Release History

| Version | Date | Summary |
|---------|------|---------|
| 4.1.0 | 2026-07-03 | Production remediation: password rotation, private DB, ADK controlled, SDLC complete |
| 4.0.2 | 2026-07-03 | Cloud SQL integration, Secret Manager, initial production deployment |
| 3.1.0 | 2026-07-03 | Google OAuth, CORS, user management |
| 3.0.0 | 2026-07-02 | Architecture overhaul, ErrorBoundary, session persistence |
| 2.0.0 | 2026-07-01 | Premium landing page, auth gate |
