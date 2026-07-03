#!/bin/bash
# ─── MEP-light™ Container Entrypoint ─────────────────────────────────
# Runs the Express.js API server directly (no supervisord needed).
# ADK controlled-deterministic workflow executes in-process within Node.js.

set -e

echo "[entrypoint] MEP-light™ v4.1.1 starting..."
echo "[entrypoint] NODE_ENV=${NODE_ENV}"
echo "[entrypoint] ADK_ENABLED=${ADK_ENABLED}"
echo "[entrypoint] PORT=${PORT:-8080}"

# Start the Express.js API server
exec node --import tsx backend/src/api_server.ts
