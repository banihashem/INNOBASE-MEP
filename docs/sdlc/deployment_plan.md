# MEP-light™ — Deployment Plan

**Version**: 4.0 # Production Deployment Plan (Phase 5)
**Date**: 2026-07-03  
**Status**: Execution complete (PRODUCTION-CLOSED-PASS)  

---

## Pre-Deployment Checklist

| # | Item | Status | Gate |
|---|------|--------|------|
| 1 | All tests pass (`npm run test:phase4`) | ✅ 166/166 | Blocking |
| 2 | Database ADR approved | ✅ Cloud SQL PostgreSQL | Blocking |
| 3 | DEMO_MODE production guard implemented | ✅ process.exit(1) | Blocking |
| 4 | Auth regression tests pass | ✅ 18/18 | Blocking |
| 5 | Governance tests pass | ✅ 8/8 | Blocking |
| 6 | DB integration tests pass | ✅ 27/27 | Blocking |
| 7 | Dockerfile updated for dual-runtime | ✅ supervisord | Non-blocking |
| 8 | cloudbuild.yaml updated | ✅ test-first gates | Non-blocking |
| 9 | Cloud SQL instance provisioned | ❌ Pending | **Blocking** |
| 10 | Schema migration executed | ❌ Pending | **Blocking** |
| 11 | Secrets created in Secret Manager | ❌ Pending | **Blocking** |

---

## Deployment Steps

### Step 1: Provision Cloud SQL (one-time)
```bash
./infra/setup_cloud_sql.sh
```

### Step 2: Run Schema Migration
```bash
gcloud sql connect mep-light-db --user=mep_app --database=mep_production \
  --project=innobase-mep-light < backend/migrations/001_initial_schema.sql
```

### Step 3: Create Secrets
```bash
echo -n "<db-password>" | gcloud secrets create mep-db-password \
  --data-file=- --project=innobase-mep-light

echo -n "mep_app" | gcloud secrets create mep-db-user \
  --data-file=- --project=innobase-mep-light
```

### Step 4: Build and Deploy
```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_CLIENT_ID=<client-id> \
  --project=innobase-mep-light
```

### Step 5: Post-Deployment Verification
```bash
# Health check
curl https://mep.innobase.app/api/health

# Database health (must report postgresql)
curl https://mep.innobase.app/api/v2/db/health

# Auth verification (browser login)
# Visit https://mep.innobase.app and sign in with ehsan.banihashem@gmail.com
```

---

## Rollback Procedure

### Immediate Rollback (< 5 minutes)
```bash
# Revert to previous revision
gcloud run services update-traffic market-entry-prioritizer \
  --to-revisions=<previous-revision>=100 \
  --region=europe-west2 \
  --project=innobase-mep-light
```

### Full Rollback
```bash
# 1. Redeploy previous image
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:v3.2.0 \
  --region=europe-west2 \
  --project=innobase-mep-light

# 2. Database rollback (if schema was applied)
# Connect and run the rollback SQL
gcloud sql connect mep-light-db --user=mep_app --database=mep_production \
  --project=innobase-mep-light
# DROP TABLE IF EXISTS agent_runs, agent_artifacts, ...;
```

---

## Canary Strategy

1. Deploy new revision with `--no-traffic`
2. Route 10% traffic → verify health and error rates
3. Route 50% traffic → monitor for 30 minutes
4. Route 100% traffic → full cutover
5. Keep previous revision as rollback target for 48 hours
