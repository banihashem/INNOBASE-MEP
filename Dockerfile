# ══════════════════════════════════════════════════════════════════════
# MEP-light™ — Production Dockerfile
#
# Multi-runtime container:
#   - Node.js 22 / Express.js (Primary HTTP Gateway, port 8080)
#   - Python 3.12 / FastAPI (ADK Agent Service, port 8000)
#
# Build args:
#   GOOGLE_CLIENT_ID — Google OAuth Client ID (baked into Vite at build time)
#
# Environment variables (runtime):
#   NODE_ENV=production
#   PORT=8080
#   DATABASE_URL or CLOUD_SQL_CONNECTION + DB_USER + DB_PASSWORD
#   ADK_ENABLED=false (initially)
#   SEED_ADMIN_EMAIL=<admin email>
# ══════════════════════════════════════════════════════════════════════

# ─── Stage 1: Build React frontend ───────────────────────────────────
FROM node:22-slim AS frontend-builder

ARG GOOGLE_CLIENT_ID=""

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Write GOOGLE_CLIENT_ID into .env so Vite's loadEnv() picks it up during build.
RUN echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> .env
RUN npm run build

# ─── Stage 2: Install Python dependencies ────────────────────────────
FROM python:3.12-slim AS python-builder

WORKDIR /python-deps
COPY backend/python/requirements.txt .
RUN pip install --no-cache-dir --target=/python-deps/site-packages -r requirements.txt

# ─── Stage 3: Production server (multi-runtime) ──────────────────────
FROM node:22-slim

# Install Python 3.12 and supervisord for dual-process management
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Node.js dependencies ────────────────────────────────────────────
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
RUN npm install tsx

# ─── Python dependencies (pre-built) ─────────────────────────────────
COPY --from=python-builder /python-deps/site-packages /usr/local/lib/python3.12/site-packages

# ─── Application code ────────────────────────────────────────────────
COPY --from=frontend-builder /app/dist ./dist
COPY backend/ ./backend/

# ─── Database migrations ─────────────────────────────────────────────
# Migrations are included but NOT auto-run; execute via:
#   gcloud sql connect ... < backend/migrations/001_initial_schema.sql
COPY backend/migrations/ ./backend/migrations/

# ─── Supervisord configuration ───────────────────────────────────
# Runs both Express.js and FastAPI in the same container
COPY infra/supervisord.conf /etc/supervisor/conf.d/mep.conf

# ─── Health check ─────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# ─── Expose and start ────────────────────────────────────────────────
EXPOSE 8080 8000
ENV PORT=8080
ENV NODE_ENV=production
ENV ADK_ENABLED=false

# Use supervisord for dual-process management.
# When ADK_ENABLED=false, only Express starts.
# When ADK_ENABLED=true, both Express and FastAPI start.
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/mep.conf"]
