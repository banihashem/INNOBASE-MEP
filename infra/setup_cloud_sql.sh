#!/bin/bash
# MEP-light™ — Cloud SQL PostgreSQL Setup Script
# 
# Creates and configures a Cloud SQL for PostgreSQL instance
# for MEP-light™ production use.
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Project: innobase-mep-light
#   - Region: europe-west2
#
# Usage:
#   chmod +x infra/setup_cloud_sql.sh
#   ./infra/setup_cloud_sql.sh

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-innobase-mep-light}"
REGION="europe-west2"
INSTANCE_NAME="mep-light-db"
DB_NAME="mep_production"
DB_USER="mep_app"
DB_VERSION="POSTGRES_16"
MACHINE_TYPE="db-custom-1-3840"  # 1 vCPU, 3.75GB RAM
STORAGE_SIZE="10"  # GB, auto-resize enabled
CLOUD_RUN_SA="${CLOUD_RUN_SA:-}" # Cloud Run service account email

echo "══════════════════════════════════════════════════════════════"
echo "  MEP-light™ — Cloud SQL PostgreSQL Setup"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "  Instance: ${INSTANCE_NAME}"
echo "══════════════════════════════════════════════════════════════"

# ─── Step 1: Enable APIs ──────────────────────────────────────────────
echo ""
echo "▸ Step 1: Enabling required APIs..."
gcloud services enable sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    run.googleapis.com \
    --project="${PROJECT_ID}" \
    --quiet

echo "  ✓ APIs enabled"

# ─── Step 2: Create Cloud SQL Instance ────────────────────────────────
echo ""
echo "▸ Step 2: Creating Cloud SQL instance '${INSTANCE_NAME}'..."

if gcloud sql instances describe "${INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "  ℹ Instance '${INSTANCE_NAME}' already exists. Skipping creation."
else
    gcloud sql instances create "${INSTANCE_NAME}" \
        --project="${PROJECT_ID}" \
        --region="${REGION}" \
        --database-version="${DB_VERSION}" \
        --tier="${MACHINE_TYPE}" \
        --storage-size="${STORAGE_SIZE}" \
        --storage-auto-increase \
        --backup \
        --backup-start-time="03:00" \
        --enable-point-in-time-recovery \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=3 \
        --availability-type=zonal \
        --no-assign-ip \
        --network=default \
        --quiet

    echo "  ✓ Cloud SQL instance created"
fi

# ─── Step 3: Create Database ──────────────────────────────────────────
echo ""
echo "▸ Step 3: Creating database '${DB_NAME}'..."

if gcloud sql databases describe "${DB_NAME}" --instance="${INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "  ℹ Database '${DB_NAME}' already exists."
else
    gcloud sql databases create "${DB_NAME}" \
        --instance="${INSTANCE_NAME}" \
        --project="${PROJECT_ID}" \
        --charset=UTF8 \
        --collation=en_US.UTF8 \
        --quiet

    echo "  ✓ Database created"
fi

# ─── Step 4: Create Database User ─────────────────────────────────────
echo ""
echo "▸ Step 4: Creating database user '${DB_USER}'..."

# Generate a strong random password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

gcloud sql users create "${DB_USER}" \
    --instance="${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --password="${DB_PASSWORD}" \
    --quiet 2>/dev/null || echo "  ℹ User may already exist — updating password..."

gcloud sql users set-password "${DB_USER}" \
    --instance="${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --password="${DB_PASSWORD}" \
    --quiet

echo "  ✓ Database user configured"

# ─── Step 5: Store Credentials in Secret Manager ──────────────────────
echo ""
echo "▸ Step 5: Storing credentials in Secret Manager..."

# Store DB password
echo -n "${DB_PASSWORD}" | gcloud secrets create "mep-db-password" \
    --project="${PROJECT_ID}" \
    --data-file=- \
    --replication-policy=automatic \
    --quiet 2>/dev/null \
    || echo -n "${DB_PASSWORD}" | gcloud secrets versions add "mep-db-password" \
        --project="${PROJECT_ID}" \
        --data-file=- \
        --quiet

# Store DB user
echo -n "${DB_USER}" | gcloud secrets create "mep-db-user" \
    --project="${PROJECT_ID}" \
    --data-file=- \
    --replication-policy=automatic \
    --quiet 2>/dev/null \
    || echo "  ℹ mep-db-user secret already exists"

# Store connection name
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
echo -n "${CONNECTION_NAME}" | gcloud secrets create "mep-db-connection" \
    --project="${PROJECT_ID}" \
    --data-file=- \
    --replication-policy=automatic \
    --quiet 2>/dev/null \
    || echo "  ℹ mep-db-connection secret already exists"

echo "  ✓ Credentials stored in Secret Manager"

# ─── Step 6: Grant IAM Roles ─────────────────────────────────────────
echo ""
echo "▸ Step 6: Granting IAM roles..."

# Get Cloud Run service account if not provided
if [ -z "${CLOUD_RUN_SA}" ]; then
    PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
    CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "  Cloud Run SA: ${CLOUD_RUN_SA}"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/cloudsql.client" \
    --quiet

# Grant Secret Manager accessor
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet

echo "  ✓ IAM roles granted"

# ─── Step 7: Run Schema Migration ─────────────────────────────────────
echo ""
echo "▸ Step 7: Running schema migration..."
echo "  ℹ To run the migration, use Cloud SQL proxy or connect directly:"
echo ""
echo "  # Option 1: Cloud SQL Auth Proxy"
echo "  cloud-sql-proxy ${CONNECTION_NAME} &"
echo "  PGPASSWORD='${DB_PASSWORD}' psql -h 127.0.0.1 -U ${DB_USER} -d ${DB_NAME} -f backend/migrations/001_initial_schema.sql"
echo ""
echo "  # Option 2: gcloud sql connect"
echo "  gcloud sql connect ${INSTANCE_NAME} --user=${DB_USER} --database=${DB_NAME} --project=${PROJECT_ID}"
echo "  (then paste the migration SQL)"

# ─── Summary ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✓ Cloud SQL Setup Complete"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Instance:    ${INSTANCE_NAME}"
echo "  Database:    ${DB_NAME}"
echo "  User:        ${DB_USER}"
echo "  Connection:  ${CONNECTION_NAME}"
echo ""
echo "  Environment variables for Cloud Run:"
echo "  ────────────────────────────────────"
echo "  CLOUD_SQL_CONNECTION=${CONNECTION_NAME}"
echo "  DB_NAME=${DB_NAME}"
echo "  DB_USER=${DB_USER}"
echo "  DB_PASSWORD=<from Secret Manager: mep-db-password>"
echo ""
echo "  Deploy command:"
echo "  ────────────────"
echo "  gcloud run deploy market-entry-prioritizer \\"
echo "    --add-cloudsql-instances=${CONNECTION_NAME} \\"
echo "    --set-secrets=DB_PASSWORD=mep-db-password:latest \\"
echo "    --update-env-vars=CLOUD_SQL_CONNECTION=${CONNECTION_NAME},DB_NAME=${DB_NAME},DB_USER=${DB_USER} \\"
echo "    --project=${PROJECT_ID} \\"
echo "    --region=${REGION}"
echo ""
