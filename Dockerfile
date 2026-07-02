# Stage 1: Build React frontend
FROM node:22-slim AS builder

# Build arg: Google Client ID must be baked into the Vite bundle at build time.
# Pass via: docker build --build-arg GOOGLE_CLIENT_ID=<your-client-id> .
ARG GOOGLE_CLIENT_ID=""

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Write GOOGLE_CLIENT_ID into .env so Vite's loadEnv() picks it up during build.
# This is required because __GOOGLE_CLIENT_ID__ is a compile-time define.
RUN echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> .env

RUN npm run build

# Stage 2: Production server
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
RUN npm install tsx

# Copy dist from builder
COPY --from=builder /app/dist ./dist
# Copy backend source
COPY backend/ ./backend/

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--import", "tsx", "backend/src/api_server.ts"]
