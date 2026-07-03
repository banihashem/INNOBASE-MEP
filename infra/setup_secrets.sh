#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# MEP-light™ — Secret Manager Setup
#
# Creates the required secrets for Cloud SQL database credentials.
# Run after Cloud SQL instance is provisioned (setup_cloud_sql.sh).
#
# Usage: ./infra/setup_secrets.sh <db-password>
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-innobase-mep-light}"
DB_PASSWORD="${1:-}"

if [ -z "$DB_PASSWORD" ]; then
  echo "Usage: $0 <db-password>"
  echo "  Creates Secret Manager entries for MEP database credentials."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  MEP-light™ — Secret Manager Setup"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Enable Secret Manager API
echo "→ Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"

# Create database password secret
echo "→ Creating secret: mep-db-password..."
echo -n "$DB_PASSWORD" | gcloud secrets create mep-db-password \
  --data-file=- \
  --project="$PROJECT_ID" \
  --replication-policy="automatic" \
  --labels="app=mep-light,component=database" \
  2>/dev/null || {
    echo "  Secret already exists, creating new version..."
    echo -n "$DB_PASSWORD" | gcloud secrets versions add mep-db-password \
      --data-file=- \
      --project="$PROJECT_ID"
  }

# Create database user secret
echo "→ Creating secret: mep-db-user..."
echo -n "mep_app" | gcloud secrets create mep-db-user \
  --data-file=- \
  --project="$PROJECT_ID" \
  --replication-policy="automatic" \
  --labels="app=mep-light,component=database" \
  2>/dev/null || echo "  Secret already exists."

# Grant Cloud Run service account access
echo "→ Granting Secret Manager access to Cloud Run service account..."
SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
  --project="$PROJECT_ID" \
  --filter="email:compute@developer.gserviceaccount.com" \
  --format="value(email)" 2>/dev/null | head -1)

if [ -n "$SERVICE_ACCOUNT" ]; then
  gcloud secrets add-iam-policy-binding mep-db-password \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" 2>/dev/null || true

  gcloud secrets add-iam-policy-binding mep-db-user \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" 2>/dev/null || true

  echo "  ✓ Granted access to $SERVICE_ACCOUNT"
else
  echo "  ⚠ Could not find default compute service account."
  echo "  Manually grant roles/secretmanager.secretAccessor to your Cloud Run SA."
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✓ Secret Manager setup complete"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Secrets created:"
echo "  • mep-db-password"
echo "  • mep-db-user"
echo ""
echo "To use in Cloud Run deployment:"
echo "  --set-secrets=DB_PASSWORD=mep-db-password:latest"
