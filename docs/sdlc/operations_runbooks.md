# MEP-light™ — Operations Runbooks

**Version**: 4.3.7
**Date**: 2026-07-13
**Classification**: Internal
**Canonical Current State**: See [CURRENT_STATE.md](CURRENT_STATE.md)

---

## 1. Deployment Runbook

### Standard Deployment

```bash
# 1. Build and push image
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_GOOGLE_CLIENT_ID=<CLIENT_ID>,_ADK_ENABLED=controlled"

# 2. Verify deployment
curl -s https://mep.innobase.app/api/health | jq .
curl -s https://mep.innobase.app/api/v2/db/health | jq .
curl -s https://mep.innobase.app/api/v2/adk/health | jq .
```

### Manual Deploy (bypass Cloud Build)

```bash
# Build locally and push
docker build -t gcr.io/innobase-mep-light/market-entry-prioritizer:v4.1.0 .
docker push gcr.io/innobase-mep-light/market-entry-prioritizer:v4.1.0

# Deploy to Cloud Run
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:v4.1.0 \
  --region=europe-west2 \
  --set-secrets=DB_PASSWORD=mep-db-password:latest \
  --update-env-vars=NODE_ENV=production,ADK_ENABLED=controlled
```

---

## 2. Rollback Runbook

### Quick Rollback (Traffic Shift)

```bash
# List recent revisions
gcloud run revisions list --service=market-entry-prioritizer --region=europe-west2 --limit=5

# Shift all traffic to a previous revision
gcloud run services update-traffic market-entry-prioritizer \
  --region=europe-west2 \
  --to-revisions=<REVISION_NAME>=100
```

### Full Redeploy Rollback

```bash
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:<PREVIOUS_TAG> \
  --region=europe-west2
```

See [rollback_plan.md](rollback_plan.md) for detailed scenarios.

---

## 3. Database Runbook

### Health Check

```bash
curl -s https://mep.innobase.app/api/v2/db/health | jq .
# Expected: {"ok": true, "dbType": "postgresql", "productionReady": true}
```

### Schema Check

```bash
curl -s https://mep.innobase.app/api/v2/db/tables | jq .
# Expected: {"schemaComplete": true, "totalTables": 15}
```

### Running Migrations

```bash
# 1. Temporarily add your IP to authorized networks
MY_IP=$(curl -s https://api.ipify.org)
gcloud sql instances patch mep-light-db --authorized-networks=$MY_IP/32

# 2. Get password from Secret Manager
gcloud secrets versions access latest --secret=mep-db-password --out-file=/tmp/pw.txt

# 3. Connect with psql
PGPASSWORD=$(cat /tmp/pw.txt) psql -h 35.189.72.143 -U mep_app -d mep_production -f backend/migrations/XXX.sql

# 4. Remove authorized networks
gcloud sql instances patch mep-light-db --clear-authorized-networks

# 5. Clean up password file
rm /tmp/pw.txt
```

---

## 4. Password Rotation Runbook

```bash
# 1. Generate new password (alphanumeric, 40 chars)
NEW_PW=$(openssl rand -base64 30 | tr -dc 'a-zA-Z0-9' | head -c 40)

# 2. Update Cloud SQL
gcloud sql users set-password mep_app --instance=mep-light-db --password="$NEW_PW"

# 3. Update Secret Manager
echo -n "$NEW_PW" | gcloud secrets versions add mep-db-password --data-file=-

# 4. Disable old version
gcloud secrets versions list mep-db-password
gcloud secrets versions disable <OLD_VERSION> --secret=mep-db-password

# 5. Redeploy Cloud Run to pick up new secret
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:latest \
  --region=europe-west2

# 6. Verify
curl -s https://mep.innobase.app/api/v2/db/health | jq .
```

---

## 5. ADK Runbook

### Enable/Disable ADK

```bash
# Enable controlled mode
gcloud run services update market-entry-prioritizer \
  --region=europe-west2 \
  --update-env-vars=ADK_ENABLED=controlled

# Disable ADK
gcloud run services update market-entry-prioritizer \
  --region=europe-west2 \
  --update-env-vars=ADK_ENABLED=false
```

### Check ADK Health

```bash
curl -s https://mep.innobase.app/api/v2/adk/health | jq .
```

---

## 6. Monitoring & Alerting

### Key Metrics

| Metric | Healthy Range | Alert Threshold |
|--------|--------------|-----------------|
| `/api/health` response code | 200 | ≠ 200 for > 3 min |
| `/api/v2/db/health` ok field | true | false for > 5 min |
| Cloud Run instance count | 1-3 | > 3 sustained |
| Response latency (p95) | < 500ms | > 2s for > 5 min |
| Error rate | < 1% | > 5% for > 5 min |

### Cloud Logging Queries

```
# Application errors
resource.type="cloud_run_revision"
resource.labels.service_name="market-entry-prioritizer"
severity>=ERROR

# ADK workflow events
resource.type="cloud_run_revision"
jsonPayload.component="adk"

# Auth failures
resource.type="cloud_run_revision"
jsonPayload.event_type="auth"
jsonPayload.level="warn"
```

---

## 7. Incident Response

### Severity Levels

| Level | Response Time | Example |
|-------|--------------|---------|
| P1 | Immediate | Service down, data breach |
| P2 | < 1 hour | Auth failing, DB connection lost |
| P3 | < 4 hours | Cold start issues, ADK failures |
| P4 | Next business day | UI bugs, non-critical issues |

### P1 Checklist

1. Check Cloud Run service status: `gcloud run services describe market-entry-prioritizer --region=europe-west2`
2. Check recent revisions: `gcloud run revisions list --service=market-entry-prioritizer --region=europe-west2 --limit=5`
3. Check Cloud SQL status: `gcloud sql instances describe mep-light-db`
4. Review error logs (see queries above)
5. If necessary, rollback to last known good revision
