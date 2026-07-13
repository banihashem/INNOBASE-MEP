# MEP-light™ — Risk Register

**Version**: 4.3.7
**Date**: 2026-07-13
**Classification**: Internal

---

## Active Risks

| ID | Risk | Severity | Likelihood | Status | Mitigation |
|----|------|----------|------------|--------|------------|
| R-001 | **DB Password Exposure** | High | Occurred | ✅ Remediated | Password rotated, old versions disabled, Secret Manager v3 active |
| R-002 | **Cloud SQL Public IP** | Medium | Low | ⚠️ Mitigated | No authorized networks, Cloud Run uses Auth Proxy. Private IP migration in progress |
| R-003 | **Over-privileged Service Account** | Medium | Low | ⚠️ Accepted | Default compute SA has `roles/editor`. Follow-up: create dedicated SA with minimal roles |
| R-004 | **Cold Start Latency** | Low | Medium | ✅ Mitigated | `min-instances=1` configured to eliminate user-visible 503s |
| R-005 | **ADK Workflow Scope** | Low | Low | ✅ Controlled | ADK in `controlled-deterministic` mode, no LLM, role-gated, human review gate |
| R-006 | **Cloud Run Direct URL Exposure** | Low | Low | ⚠️ Documented | `*.run.app` URL is publicly accessible alongside `mep.innobase.app` |
| R-007 | **Single Admin Dependency** | Low | Low | ⚠️ Accepted | Single admin seed email. Follow-up: add backup admin provisioning |

---

## Closed Risks

| ID | Risk | Resolution Date | Resolution |
|----|------|----------------|------------|
| R-001 | DB Password Exposure | 2026-07-03 | Password rotated, Secret Manager updated |
| R-008 | UUID/TEXT Type Mismatch | 2026-07-03 | Migration 002_fix_id_types applied |
| R-009 | Missing DB Tables | 2026-07-03 | All 15 tables verified in mep_production |
| R-010 | SQLite Fallback in Production | 2026-07-03 | Production startup guard prevents SQLite |
| R-011 | Demo Mode Bypass | 2026-07-03 | DEMO_MODE=true triggers process.exit(1) in production |
| R-012 | **Placeholder Client ID in Bundle** | 2026-07-03 | Build-time + post-build guards added; placeholder fallback removed (v4.1.1) |
| R-013 | **PDF Export Unauthenticated** | 2026-07-03 | JWT auth + role-based access added to /api/export-pdf (v4.1.1) |
| R-014 | **Demo Identity in Production** | 2026-07-03 | `consultant@innobase.app` fallback removed; gated behind `import.meta.env.DEV` (v4.1.1) |

---

## Risk Assessment Criteria

| Severity | Definition |
|----------|------------|
| Critical | Service-wide outage or data breach |
| High | Security vulnerability or data integrity risk |
| Medium | Operational concern requiring attention |
| Low | Minor issue with minimal impact |

| Likelihood | Definition |
|------------|------------|
| Almost Certain | Expected to occur in normal operations |
| Likely | More likely than not |
| Possible | Could occur under certain conditions |
| Unlikely | Would require unusual circumstances |
| Rare | Exceptional circumstances only |
