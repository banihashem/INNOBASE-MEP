# MEP-light™ — Rollback Plan

**Version**: 4.1.0  
**Date**: 2026-07-03  
**Classification**: Internal

---

## Rollback Strategy

### Current Production
| Item | Value |
|------|-------|
| Active Version | v4.1.0 |
| Rollback Target | v4.0.2 |
| Rollback Revision | market-entry-prioritizer-00022-hdg |
| Current Revision | *(populated after deploy)* |

---

## Cloud Run Rollback

### Immediate Rollback (< 1 minute)

Route 100% traffic to the previous revision:

```bash
gcloud run services update-traffic market-entry-prioritizer \
  --region=europe-west2 \
  --to-revisions=market-entry-prioritizer-00022-hdg=100
```

### Full Redeploy Rollback

```bash
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:v4.0.2 \
  --region=europe-west2
```

---

## Database Rollback

### Migration Backward Compatibility

| Migration | Backward Compatible | Notes |
|-----------|-------------------|-------|
| 002_fix_id_types | ✅ Yes | Changed UUID→TEXT. Old code inserting UUIDs still works with TEXT columns. |
| 001_initial_schema | N/A | Initial schema, no rollback needed |

### Database Migration Rollback (if needed)

Migration 002 is **backward compatible** — the TEXT type accepts both UUID-formatted strings and application-generated string IDs. Rolling back the application to v4.0.2 will still work because:

1. The old code generates `user_${timestamp}_${random}` strings
2. TEXT columns accept any string value
3. No data transformation occurred (only type widening)

If a destructive rollback is needed:

```sql
-- WARNING: Only if absolutely necessary
-- This reverts TEXT columns back to UUID (may fail if non-UUID data exists)
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;
-- ... (all other tables)
DELETE FROM schema_migrations WHERE version = 2;
```

---

## Secret Manager Rollback

If the new password causes issues:

1. Secret version 3 (current) can be disabled
2. A new version 4 must be created with a fresh password
3. Cloud SQL user password must be updated to match
4. **Never re-enable old versions** — treat all prior passwords as compromised

---

## Rollback Decision Matrix

| Scenario | Action | Time | Risk |
|----------|--------|------|------|
| Application bug | Traffic shift to prior revision | < 1 min | Low |
| Database schema issue | No DB rollback needed (backward compatible) | N/A | None |
| Secret/auth failure | Generate new password, update Secret Manager + Cloud SQL | ~5 min | Low |
| Infrastructure failure | Redeploy prior image version | ~3 min | Low |
| Complete disaster | Full redeploy from Git tag v4.0.2 | ~10 min | Medium |

---

## Rollback Verification

After any rollback, verify:

1. `/api/health` returns `status: "healthy"`
2. `/api/v2/db/health` returns `ok: true`
3. Login works at `https://mep.innobase.app`
4. Session persistence works
5. No secrets in logs
