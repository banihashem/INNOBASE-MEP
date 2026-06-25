FROM node:22-slim

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy tsx for TypeScript execution (needed as devDependency)
RUN npm install tsx

# Expose the API port
EXPOSE 8080

# Cloud Run uses PORT env var, default to 8080
ENV PORT=8080
ENV API_PORT=8080
ENV NODE_ENV=production

# Start the scoring engine API
CMD ["node", "--import", "tsx", "backend/src/api_server.ts"]
