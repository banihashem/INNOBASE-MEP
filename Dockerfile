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
# PRODUCTION GUARD: Fail if GOOGLE_CLIENT_ID is empty — prevents placeholder bake-in.
RUN if [ -z "$GOOGLE_CLIENT_ID" ]; then \
      echo "FATAL: GOOGLE_CLIENT_ID build arg is empty. Cannot build production frontend without a valid Google OAuth Client ID." && \
      echo "Usage: docker build --build-arg GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com ." && \
      exit 1; \
    fi
RUN echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> .env
RUN npm run build

# POST-BUILD GUARD: Verify the built bundle does NOT contain placeholder Client ID or demo identity
# NOTE: "placeholder" alone is too broad (matches HTML placeholder attrs). Use specific pattern.
RUN if grep -r "placeholder.apps.googleusercontent.com" dist/assets/*.js 2>/dev/null; then \
      echo "FATAL: Production bundle contains placeholder Client ID — real ID was not injected." && exit 1; \
    fi
RUN if grep -r "consultant@innobase.app" dist/assets/*.js 2>/dev/null; then \
      echo "FATAL: Production bundle contains demo identity 'consultant@innobase.app'." && exit 1; \
    fi
RUN if grep -r "demo-user-id" dist/assets/*.js 2>/dev/null; then \
      echo "FATAL: Production bundle contains demo sub 'demo-user-id'." && exit 1; \
    fi

# ─── Stage 2: Install Python dependencies ────────────────────────────
FROM python:3.12-slim AS python-builder

WORKDIR /python-deps
COPY backend/python/requirements.txt .
RUN pip install --no-cache-dir --target=/python-deps/site-packages -r requirements.txt

# ─── Stage 3: Production server (multi-runtime) ──────────────────────
FROM node:22-slim

# Install runtime dependencies (Python for future ADK, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
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

# ─── Entrypoint ──────────────────────────────────────────────────────
COPY infra/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# ─── Health check ─────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# ─── Expose and start ────────────────────────────────────────────────
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
ENV ADK_ENABLED=false

# Start the Express.js API server directly.
# ADK controlled-deterministic workflow runs in-process within Node.js.
CMD ["/app/entrypoint.sh"]

