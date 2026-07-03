# MEP-light™ — Security Review

**Version**: 4.1.1  
**Date**: 2026-07-03  
**Classification**: Internal  
**Status**: Post-Incident Security Assessment (v4.1.1 Auth Remediation)

---

## Security Incident: Database Password Exposure

| Item | Detail |
|------|--------|
| **Incident** | Database password appeared in agent execution logs/transcript |
| **Date Detected** | 2026-07-03 |
| **Severity** | High |
| **Status** | ✅ Remediated |
| **Actions Taken** | Password rotated, Secret Manager version 3 created, versions 1-2 disabled, Cloud Run redeployed, old password invalidated |
| **Verification** | Old password no longer accepted by Cloud SQL |

---

## 1. Authentication Security

| # | Control | Implementation | Status |
|---|---------|---------------|--------|
| 1 | OIDC Provider | Google Identity (accounts.google.com) | ✅ Verified |
| 2 | JWT Verification | JWKS-based RS256 signature verification | ✅ Verified |
| 3 | Token Expiry | Server-side `exp` check | ✅ Verified |
| 4 | Issuer Validation | Only `accounts.google.com` / `https://accounts.google.com` | ✅ Verified |
| 5 | DEMO_MODE Guard | `process.exit(1)` if DEMO_MODE=true in production | ✅ Verified |
| 6 | Admin Seed | Single admin email via `SEED_ADMIN_EMAIL` env var | ✅ Verified |
| 7 | Session Tokens | Google-managed, no custom JWT issuance | ✅ Verified |
| 8 | Demo mode disabled | DEMO_MODE not set in production env vars | ✅ Verified |
| 9 | `/users/me` verified | Returns real user from Google JWT, not fallback | ✅ Verified |
| 10 | Audience validation | JWT `aud` claim checked against expected Client ID | ✅ Added (v4.1.1) |
| 11 | Demo identity removed | `consultant@innobase.app` removed from production code | ✅ Remediated (v4.1.1) |
| 12 | Build-time Client ID guard | Dockerfile fails if GOOGLE_CLIENT_ID is empty | ✅ Added (v4.1.1) |
| 13 | Sign-out loop prevention | UserProfileMenu prevents infinite 401→signOut cycle | ✅ Added (v4.1.1) |

---

## 1b. Security Incidents: Authentication Blocker (v4.1.1)

| Item | Detail |
|------|--------|
| **Incident** | Production frontend contained placeholder Google Client ID |
| **Date Detected** | 2026-07-03 |
| **Severity** | P0 — Complete auth failure |
| **Status** | ✅ Remediated (code), ⏳ Pending deploy |
| **Root Cause** | `_GOOGLE_CLIENT_ID` Cloud Build substitution defaulted to empty string |
| **Impact** | No user could log in; demo identity `consultant@innobase.app` was served |
| **Actions Taken** | Removed placeholder fallback, removed demo identity from production code, added build-time guards, added audience validation |
| **Reference** | `docs/sdlc/incident_auth_login_blocker.md` |

| Item | Detail |
|------|--------|
| **Incident** | `/api/export-pdf` endpoint had no authentication |
| **Date Detected** | 2026-07-03 |
| **Severity** | Medium |
| **Status** | ✅ Remediated |
| **Actions Taken** | Added JWT auth requirement + role-based access (Consultant/Administrator) |

---

## 2. Database Security

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | DB password exposure occurred | ✅ Remediated | Password rotated, old versions disabled |
| 2 | Password rotated | ✅ Complete | Secret Manager v3 active, v1-2 disabled |
| 3 | Public IP identified | ⚠️ Mitigated | Public IP present but no authorized networks; Cloud Run connects via Cloud SQL Auth Proxy (Unix socket) |
| 4 | Authorized networks empty | ✅ Verified | `gcloud sql instances describe` confirms empty |
| 5 | Secret Manager used | ✅ Verified | `DB_PASSWORD` sourced from `mep-db-password:latest` |
| 6 | Cloud SQL Client role | ✅ Verified | Service account has `roles/cloudsql.client` |
| 7 | Secret accessor role | ✅ Verified | Service account has `roles/secretmanager.secretAccessor` on `mep-db-password` |
| 8 | No secrets in Git | ✅ Verified | `.gitignore` excludes `.env*`, `data/`, `*.db` |
| 9 | No secrets in logs | ✅ Verified | Structured logging does not output credentials |
| 10 | SQLite disabled in production | ✅ Verified | Production startup guard exits if no PostgreSQL config |

---

## 3. Network Security

| # | Control | Status | Notes |
|---|---------|--------|-------|
| 1 | CORS restricted | ✅ | Only `mep.innobase.app`, `localhost:3000`, `localhost:5173` |
| 2 | Public IP status | ⚠️ | Public IP exists but no authorized networks allow direct access |
| 3 | Cloud Run connection | ✅ | Via Cloud SQL Auth Proxy (Unix socket), no public IP needed |
| 4 | Cloud Run direct URL | ⚠️ | `*.run.app` URL is accessible; traffic routed through custom domain via Cloudflare |
| 5 | VPC connector | 🔄 | Private services access setup in progress |

### Public IP Risk Assessment

The Cloud SQL instance has a public IP (`35.189.72.143`) but:
- **Authorized networks are empty** — no external IPs can connect directly
- **SSL mode is `ALLOW_UNENCRYPTED_AND_ENCRYPTED`** — should be tightened
- **Cloud Run connects via Cloud SQL Auth Proxy** using Unix sockets, which does not use the public IP
- **Risk**: Low with current controls. The public IP alone does not grant access without authorized network entries.
- **Recommendation**: Complete private IP migration and remove public IP for defense-in-depth

---

## 4. Authorization (RBAC)

| # | Control | Status |
|---|---------|--------|
| 1 | Role check on admin endpoints | ✅ |
| 2 | Role check on session ownership | ✅ |
| 3 | ADK routes require Consultant+ | ✅ |
| 4 | ADK assessment workflow admin/consultant gated | ✅ |
| 5 | Governance check available to all authenticated | ✅ |
| 6 | Report export human-gated | ✅ |
| 7 | Agent tools schema-validated | ✅ |

---

## 5. ADK Security

| # | Control | Status |
|---|---------|--------|
| 1 | ADK feature-flagged (`ADK_ENABLED`) | ✅ |
| 2 | ADK endpoints role-gated (Consultant/Admin) | ✅ |
| 3 | All agent outputs marked as DRAFT | ✅ |
| 4 | Human review gate enforced | ✅ |
| 5 | No final recommendation bypass | ✅ |
| 6 | Governance checks on all outputs | ✅ |
| 7 | Agent runs persisted for audit | ✅ |
| 8 | No LLM calls in current mode (deterministic) | ✅ |

---

## 6. Service Account Assessment

| Finding | Status | Notes |
|---------|--------|-------|
| Default compute SA used | ⚠️ Known Risk | `52156375400-compute@developer.gserviceaccount.com` |
| `roles/editor` assigned | ⚠️ Over-privileged | Recommended: Create dedicated SA with minimal roles |
| `roles/cloudsql.client` | ✅ Required | |
| `roles/secretmanager.secretAccessor` | ✅ Required (on secret) | |
| `roles/logging.logWriter` | ✅ Required | |
| `roles/artifactregistry.writer` | ✅ Required for builds | |

### Recommended Follow-up
Create a dedicated service account `mep-light-sa@innobase-mep-light.iam.gserviceaccount.com` with only:
- `roles/cloudsql.client`
- `roles/logging.logWriter`
- `roles/secretmanager.secretAccessor` (on `mep-db-password` only)

---

## 7. Incident and Rollback Path

| Scenario | Response |
|----------|----------|
| Password compromise | Rotate via Secret Manager, redeploy Cloud Run |
| Unauthorized access attempt | Review Cloud Run and audit logs |
| ADK workflow abuse | Disable via `ADK_ENABLED=false`, redeploy |
| Service outage | Traffic shift to prior revision |
| Data breach | Incident response per organizational policy |

Documented in: [rollback_plan.md](rollback_plan.md)

---

## 8. Compliance Summary

| Requirement | Status |
|-------------|--------|
| No secrets in code | ✅ |
| No secrets in logs | ✅ |
| No secrets in docs | ✅ |
| Secret Manager for credentials | ✅ |
| Google OAuth for authentication | ✅ |
| RBAC for authorization | ✅ |
| Audit logging | ✅ |
| Structured observability | ✅ |
| CORS restricted | ✅ |
| Production guards (DEMO_MODE, SQLite) | ✅ |
| No demo identity in production bundle | ✅ (v4.1.1) |
| PDF export requires authentication | ✅ (v4.1.1) |
| JWT audience validation | ✅ (v4.1.1) |
| Build-time Client ID validation | ✅ (v4.1.1) |
