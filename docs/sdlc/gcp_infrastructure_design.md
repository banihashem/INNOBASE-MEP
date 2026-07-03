# MEP-light™ — GCP Infrastructure Design

**Version**: 4.0  
**Date**: 2026-07-03  
**Status**: Pending provisioning  

---

## Architecture Diagram

```
                    ┌──────────────────────────────────┐
                    │        Cloudflare Edge            │
                    │   mep.innobase.app → Worker →     │
                    └──────────────┬───────────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────────┐
                    │     Cloud Run (europe-west2)      │
                    │  market-entry-prioritizer          │
                    │                                    │
                    │  ┌──────────────────────────────┐ │
                    │  │  Express.js (Port 8080)       │ │
                    │  │  Primary HTTP Gateway         │ │
                    │  │  + Static React SPA            │ │
                    │  │  + /api/* endpoints            │ │
                    │  └───────────┬────────────────────┘ │
                    │              │ proxy /api/v2/adk/*   │
                    │  ┌───────────▼────────────────────┐ │
                    │  │  FastAPI/Python (Port 8000)    │ │
                    │  │  ADK Agent Service             │ │
                    │  │  + /api/v2/score               │ │
                    │  │  + /api/v2/rag/*               │ │
                    │  │  + /api/v2/adk/*               │ │
                    │  └───────────┬────────────────────┘ │
                    └──────────────┼──────────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │   Cloud SQL for PostgreSQL 16     │
                    │   Instance: mep-light-db          │
                    │   Region: europe-west2            │
                    │   DB: mep_production              │
                    │                                    │
                    │   Features:                        │
                    │     • pgvector extension           │
                    │     • Automated backups (daily)    │
                    │     • PITR enabled                 │
                    │     • Auto-resize storage          │
                    └──────────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │   Secret Manager                  │
                    │                                    │
                    │   Secrets:                         │
                    │     • mep-db-password             │
                    │     • mep-db-user                 │
                    │     • mep-db-connection           │
                    │     • google-client-id            │
                    │     • gemini-api-key              │
                    └──────────────────────────────────┘
```

---

## Resource Inventory

### Cloud Run Service

| Parameter | Value |
|-----------|-------|
| **Service Name** | `market-entry-prioritizer` |
| **Region** | `europe-west2` |
| **CPU** | 1 vCPU |
| **Memory** | 512 Mi |
| **Concurrency** | 80 |
| **Min Instances** | 0 (scale to zero) |
| **Max Instances** | 3 |
| **Cloud SQL Connection** | `innobase-mep-light:europe-west2:mep-light-db` |
| **Container Port** | 8080 |

### Cloud SQL Instance

| Parameter | Value |
|-----------|-------|
| **Instance Name** | `mep-light-db` |
| **Database Version** | PostgreSQL 16 |
| **Region** | `europe-west2` |
| **Machine Type** | `db-custom-1-3840` (1 vCPU, 3.75 GB) |
| **Storage** | 10 GB SSD (auto-resize) |
| **Availability** | Zonal (upgrade to Regional for HA later) |
| **Backup** | Daily at 03:00 UTC, 7-day retention |
| **PITR** | Enabled |
| **Maintenance** | Sunday 03:00 UTC |
| **Extensions** | uuid-ossp, vector (pgvector) |

### Secret Manager Secrets

| Secret Name | Purpose |
|-------------|---------|
| `mep-db-password` | Database password for `mep_app` user |
| `mep-db-user` | Database username |
| `mep-db-connection` | Cloud SQL instance connection name |
| `google-client-id` | Google OAuth Client ID for OIDC |
| `gemini-api-key` | Gemini API key for ADK agents |

### IAM Bindings

| Service Account | Role | Purpose |
|----------------|------|---------|
| Cloud Run default SA | `roles/cloudsql.client` | Cloud SQL connectivity |
| Cloud Run default SA | `roles/secretmanager.secretAccessor` | Secret Manager access |
| Cloud Run default SA | `roles/storage.objectViewer` | Cloud Storage (future reports) |

---

## Network Architecture

### Cloud Run ↔ Cloud SQL Connectivity

**Method**: Cloud SQL Unix Socket via `--add-cloudsql-instances` flag

```bash
gcloud run deploy market-entry-prioritizer \
  --add-cloudsql-instances=innobase-mep-light:europe-west2:mep-light-db \
  --set-secrets=DB_PASSWORD=mep-db-password:latest \
  --update-env-vars=\
    CLOUD_SQL_CONNECTION=innobase-mep-light:europe-west2:mep-light-db,\
    DB_NAME=mep_production,\
    DB_USER=mep_app \
  --project=innobase-mep-light \
  --region=europe-west2
```

**How it works**:
1. Cloud Run automatically creates a Unix socket at `/cloudsql/innobase-mep-light:europe-west2:mep-light-db`
2. The TypeScript `db_client.ts` connects via `pg` with `host: /cloudsql/...`
3. The Python `database.py` connects via Cloud SQL Python Connector
4. No public IP needed on Cloud SQL instance
5. Traffic stays within Google's network — encrypted, low-latency

### Cloudflare ↔ Cloud Run

Unchanged from current architecture:
- `mep.innobase.app` CNAME → Cloud Run
- Cloudflare Worker proxies requests
- TLS termination at Cloudflare edge

---

## Environment Variables

| Variable | Production Value | Local Dev Value |
|----------|-----------------|-----------------|
| `NODE_ENV` | `production` | `development` |
| `PORT` | `8080` | `3001` |
| `DATABASE_URL` | _(not used, Cloud SQL socket)_ | `postgresql://localhost/mep_local` |
| `CLOUD_SQL_CONNECTION` | `innobase-mep-light:europe-west2:mep-light-db` | _(empty)_ |
| `DB_NAME` | `mep_production` | `mep_local` |
| `DB_USER` | `mep_app` | `postgres` |
| `DB_PASSWORD` | _(from Secret Manager)_ | `localdev` |
| `GOOGLE_CLIENT_ID` | _(from Secret Manager)_ | _(same)_ |
| `GEMINI_API_KEY` | _(from Secret Manager)_ | _(same)_ |
| `ADK_ENABLED` | `false` (initially) | `true` (for dev) |
| `SEED_ADMIN_EMAIL` | `ehsan.banihashem@gmail.com` | `ehsan.banihashem@gmail.com` |

---

## Cost Estimate

| Resource | Monthly Estimate |
|----------|-----------------|
| Cloud Run | ~$0–15 (scale to zero) |
| Cloud SQL (db-custom-1-3840) | ~$25–35 |
| Secret Manager | ~$0.06 (5 secrets × ~12 accesses/day) |
| Cloud Storage (future) | ~$0.02–1 |
| Cloudflare | Free tier |
| **Total** | **~$25–50/month** |

---

## Deployment Procedure

### Initial Setup
```bash
# 1. Run infrastructure setup
./infra/setup_cloud_sql.sh

# 2. Connect to Cloud SQL and run migrations
gcloud sql connect mep-light-db --user=mep_app --database=mep_production \
  --project=innobase-mep-light
# Then paste: backend/migrations/001_initial_schema.sql

# 3. Build and deploy
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_CLIENT_ID=<your-client-id> \
  --project=innobase-mep-light

# 4. Update Cloud Run with Cloud SQL connection
gcloud run deploy market-entry-prioritizer \
  --image=gcr.io/innobase-mep-light/market-entry-prioritizer:latest \
  --add-cloudsql-instances=innobase-mep-light:europe-west2:mep-light-db \
  --set-secrets=DB_PASSWORD=mep-db-password:latest \
  --update-env-vars=CLOUD_SQL_CONNECTION=innobase-mep-light:europe-west2:mep-light-db,DB_NAME=mep_production,DB_USER=mep_app \
  --region=europe-west2 \
  --project=innobase-mep-light

# 5. Verify
curl https://mep.innobase.app/api/v2/db/health
```

### Subsequent Deployments
```bash
gcloud run deploy market-entry-prioritizer \
  --source=. \
  --region=europe-west2 \
  --project=innobase-mep-light
```
