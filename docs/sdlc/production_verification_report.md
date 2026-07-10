# MEP-light™ — Production Verification Report (v4.3.7)

**Date**: 2026-07-11  
**Version**: 4.3.7  
**Tag**: v4.3.7-demo-refinement  
**Status**: PRODUCTION-VERIFIED-PASS / PRODUCTION-SMOKE-PASS

---

## Deployment Summary

| Item | Value |
|------|-------|
| **Service** | market-entry-prioritizer |
| **Region** | europe-west2 |
| **Previous Revision** | market-entry-prioritizer-00040-x7z |
| **New Revision** | market-entry-prioritizer-00041-dqw |
| **Previous Digest** | `sha256:c9ce8cb2...cdc7a0e` |
| **New Digest** | `sha256:581d4fc7...be4016f` |
| **Production URL** | https://mep.innobase.app |
| **Build Duration** | 4m28s |
| **Build Status** | SUCCESS |

---

## Health Checks (Post-Deploy)

| Endpoint | Status | Key Details |
|----------|--------|-------------|
| `/api/health` | 200 ✓ | version=4.3.7, status=healthy |
| `/api/v2/db/health` | 200 ✓ | dbType=postgresql, 6 users, 17 sessions, productionReady=true |
| `/api/v2/auth/config-status` | 200 ✓ | googleClientId=configured, productionGuard=OK, seedAdmin=configured |
| `/api/v2/adk/health` | 200 ✓ | version=4.3.7, mode=controlled-deterministic |

---

## RBAC Verification (43/43 PASS)

### Demo Participant (innobaseae@gmail.com)
- [x] POST /api/score → 200
- [x] Session CRUD: create(201), list(200), get(200), patch(200), resume(200)
- [x] Blocked from user list (403)
- [x] Blocked from user stats (403)
- [x] Blocked from user creation (403)
- [x] Blocked from self-role-change (403)
- [x] Blocked from PDF export (401/403)
- [x] Blocked from session review (403)
- [x] Blocked from other user's sessions (403)

### Administrator (ehsan.banihashem@gmail.com)
- [x] Role = Administrator (NOT demoted)
- [x] Can list users (200)
- [x] Can get user stats (200)
- [x] Can create session (201)
- [x] Self-demotion blocked (403)
- [x] Last-admin guard active (403)

### Consultant
- [x] Can create session (201)
- [x] Role change blocked for non-admin (403)

### Security
- [x] Malformed requests don't 5xx
- [x] No-auth returns 401 (not 5xx)
- [x] No GOOGLE_CLIENT_SECRET leaked
- [x] No DATABASE_URL leaked
- [x] No GEMINI_API_KEY leaked

---

## Migration Status

| Migration | Status |
|-----------|--------|
| 005_add_demo_participant_role | Applied via Cloud Run Job during production deploy |
| demo_participant role constraint | Active (users.role CHECK includes demo_participant) |
| Existing users preserved | ✓ 6 users, 17 sessions intact |
| Ehsan = Administrator | ✓ Confirmed |

---

## Browser Smoke (Production Landing Page)

- [x] Landing page loads correctly
- [x] Version label: "MEP-light Beta Demo v1.6" visible
- [x] No "CONSULTANT MODE" visible
- [x] No "Version 1.4.0" visible
- [x] No "Product Strategy" visible
- [x] Google Sign-In button present and functional

---

## Rollback Plan

| Item | Value |
|------|-------|
| **Rollback Revision** | market-entry-prioritizer-00040-x7z |
| **Rollback Digest** | `sha256:c9ce8cb27bd6d9dc37696701eb819ec089be3bf3cf5a0316d099551c8cdc7a0e` |
| **Rollback Command** | `gcloud run services update-traffic market-entry-prioritizer --to-revisions=market-entry-prioritizer-00040-x7z=100 --region=europe-west2` |
| **DB Rollback** | See migration 005 rollback plan in SQL file |

---

## Independent Production Smoke (2026-07-11)

**Result**: PRODUCTION-SMOKE-PASS  
**Verified by**: Independent UAT  

- [x] Production URL loads: https://mep.innobase.app
- [x] Demo Participant login (innobaseae@gmail.com) works
- [x] role = demo_participant
- [x] productMode = free-demo
- [x] label = MEP-light Beta Demo v1.6
- [x] POST /api/v2/sessions → 201
- [x] PATCH /api/v2/sessions/:id → 200
- [x] Refresh persistence passes
- [x] Step 5 heading = Strategic Metric Scoring
- [x] Export Brief shows MEP-light Beta Demo v1.6
- [x] Step 8 locked
- [x] Download Report — Full Version locked
- [x] Human Review approve/flag unavailable
- [x] Consultant/Admin UI unavailable
- [x] No rollback recommended
