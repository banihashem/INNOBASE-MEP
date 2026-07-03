# MEP-light™ — P0 Incident Report: Authentication Login Blocker

**Incident ID**: INC-2026-0703-AUTH  
**Severity**: P0 — Production user cannot log in  
**Status**: REMEDIATED (code fix), PENDING DEPLOY  
**Date Opened**: 2026-07-03  
**Date Fixed (Code)**: 2026-07-03  

---

## Executive Summary

The production MEP-light™ application at `https://mep.innobase.app` had a complete authentication failure that prevented any user from logging in. The root cause was a **missing Google OAuth Client ID in the Docker build**, causing the frontend to use a placeholder value and fall back to a demo identity that was then rejected by the production backend.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| ~11:00 | v4.1.0 deployed to Cloud Run via Cloud Build |
| ~11:38 | Database migration 001 applied |
| ~13:00 | Database migration 002 applied |
| 14:36 | Incident investigation begins — human report: cannot log in |
| 14:37 | Health endpoints confirmed healthy (API, DB, ADK) |
| 14:37 | `/api/v2/db/health` returns `userCount: 0` — no user has ever logged in |
| 14:37 | `/api/export-pdf` returns 200 without authentication |
| 14:38 | **Root cause identified**: Production bundle contains placeholder Client ID |
| 14:38 | Confirmed: `consultant@innobase.app`, `Strategy Consultant`, `demo-user-id` in bundle |
| 14:41 | Implementation plan created and approved |
| 14:41 | Code fixes begin (6 files, 2 test files) |
| 14:44 | All tests pass (28/28 auth, 117/117 scoring) |

---

## Root Cause

### Primary Cause: Empty `GOOGLE_CLIENT_ID` at Docker Build Time

The `cloudbuild.yaml` substitution `_GOOGLE_CLIENT_ID` defaulted to an **empty string**. This value was passed as a Docker build arg, which resulted in an empty `GOOGLE_CLIENT_ID` in the `.env` file during the Vite build step.

The frontend code in `auth.tsx` had a fallback:
```typescript
// OLD — VULNERABLE
export const GOOGLE_CLIENT_ID = (typeof __GOOGLE_CLIENT_ID__ !== 'undefined' && __GOOGLE_CLIENT_ID__)
  ? __GOOGLE_CLIENT_ID__
  : "52156375400-placeholder.apps.googleusercontent.com";
```

When `__GOOGLE_CLIENT_ID__` was empty (falsy), the placeholder was used. The function `isGoogleAuthConfigured()` correctly detected the placeholder and returned `false`, but the downstream code in `LandingPage.tsx` then **fell through to a demo identity fallback** instead of showing an error:

```typescript
// OLD — VULNERABLE
const demoUser: UserProfile = {
  email: "consultant@innobase.app",
  name: "Strategy Consultant",
  picture: "",
  sub: "demo-user-id",
};
```

This demo JWT was then sent to the backend, which:
1. Failed JWKS signature verification (not a real Google token)
2. Fell back to decode-only mode (graceful degradation)
3. Accepted the decoded token but with a non-real identity
4. `UserProfileMenu.tsx` called `/api/v2/users/me` which returned 401
5. The 401 handler called `signOut()`, creating an **infinite loop**

### Contributing Factors

1. **No build-time validation**: The Dockerfile did not check if `GOOGLE_CLIENT_ID` was empty
2. **No post-build scanning**: No check that the built bundle didn't contain the placeholder
3. **Demo identity reachable in production**: The fallback code was not gated behind `import.meta.env.DEV`
4. **PDF export unprotected**: `/api/export-pdf` had no authentication requirement
5. **No audience validation**: JWT `aud` claim was not checked against expected Client ID

---

## Fix Summary (v4.1.1)

| File | Change |
|------|--------|
| `src/lib/auth.tsx` | Removed placeholder fallback; empty string if unconfigured |
| `src/components/LandingPage.tsx` | Removed demo identity; gated behind `import.meta.env.DEV` + `VITE_DEMO_MODE` |
| `src/components/UserProfileMenu.tsx` | Added sign-out loop prevention via ref guards |
| `backend/src/api_server.ts` | Added PDF auth, audience validation, config-status endpoint |
| `Dockerfile` | Build-time and post-build guards for Client ID |
| `cloudbuild.yaml` | Validation step requiring `_GOOGLE_CLIENT_ID` |

---

## Verification

- 28/28 auth regression tests passed
- 117/117 scoring engine tests passed
- Bundle identity test created (post-build scanning)
- Local build verification pending with correct Client ID

---

## Prevention Measures

1. **Build-time guard**: Dockerfile now fails if `GOOGLE_CLIENT_ID` is empty
2. **Post-build guard**: Dockerfile scans dist/ for forbidden strings
3. **Cloud Build guard**: Validation step fails if `_GOOGLE_CLIENT_ID` is empty
4. **Code guard**: No demo identity is reachable in production builds
5. **Test guard**: `bundle_no_demo_identity.test.ts` ensures no demo strings in bundle
6. **Audit trail**: PDF export now records audit events with user identity
