# Stage 1: Build React frontend
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
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
