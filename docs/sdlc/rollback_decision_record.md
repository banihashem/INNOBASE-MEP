# MEP-light™ — Rollback Decision Record

**Date**: 2026-07-03  
**Decision**: Forward-fix (v4.1.1), NOT rollback  

---

## Context

A P0 authentication blocker was discovered in the production deployment (v4.1.0). No user could log in to the application at `https://mep.innobase.app`.

## Decision

**Forward-fix** was chosen over rollback because:

1. **No known-good auth revision exists**: The placeholder Client ID issue has been present since the first production deployment. Rolling back to v4.0.2 or any earlier revision would still have the same authentication problem.

2. **Backend infrastructure is healthy**: PostgreSQL is connected, database migrations are applied, ADK is running in controlled-deterministic mode, health endpoints pass. The issue is isolated to the frontend bundle.

3. **Fix is surgical and well-understood**: The root cause is definitively identified (empty build arg → placeholder fallback → demo identity → 401 loop). The fix is a targeted code change, not an architectural refactor.

4. **Testing is comprehensive**: 28/28 auth regression tests pass, 117/117 scoring tests pass, and new build-time guards prevent recurrence.

## Rollback Target (if needed post-deploy)

If the forward-fix deployment fails:

```bash
gcloud run services update-traffic market-entry-prioritizer \
  --to-revisions=market-entry-prioritizer-00027-2bc=100 \
  --region=europe-west2
```

**Note**: This rollback target (v4.1.0 / revision 00027-2bc) has the same auth bug. It only serves as a "keep the lights on" fallback while further investigation occurs.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Forward-fix introduces new bug | Low | Medium | Comprehensive test suite, build guards |
| OAuth console misconfigured | Medium | High | Manual verification checklist provided |
| Client ID still not passed to Cloud Build | Low | None | Build fails immediately if empty |
