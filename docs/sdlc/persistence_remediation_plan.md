# Persistence Remediation Plan

## Root Cause Analysis
The primary reason for the assessment persistence failure (D-1) is that the frontend relies exclusively on `usePersistedState.ts` which serializes the entire assessment state to `localStorage` with a debounced timer. The backend API `/api/v2/sessions` endpoints exist and are partially wired but are not used by the primary assessment creation/resume flows as the authoritative source of truth. Consequently:
- Refreshing the browser drops any state not re-hydrated from `localStorage`.
- Resuming on a different device or incognito window is impossible because the data never reached PostgreSQL.
- `/api/v2/db/health` correctly shows 0 sessionCount because the server has not recorded the session creation or progression.

## Remediation Architecture
1. **Hybrid Schema Approach**: To achieve immediate reliable state rehydration while maintaining the normalized schema, we will add a `state_snapshot JSONB` column to the `assessment_sessions` table.
2. **Server-Side API Upgrades**: 
   - `GET /api/v2/sessions/:id` will return the `state_snapshot`.
   - `PATCH /api/v2/sessions/:id` will accept the serialized state and save it to the `state_snapshot` column.
3. **Frontend Integration**:
   - `usePersistedState` will be updated to also call `apiClient.patchSession()` on its debounce interval.
   - Creating a new session will call `POST /api/v2/sessions`.
   - Resuming a session will call `GET /api/v2/sessions/:id`.
4. **Privacy Fix**: `localStorage` will be cleared upon sign-out to prevent data leaks on shared devices.
