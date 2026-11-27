# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Install Production Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools if any native modules need compilation
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 2: Production Application Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install lightweight init system and curl for health check
RUN apk add --no-cache dumb-init curl

# Enforce production environment
ENV NODE_ENV=production
ENV PORT=5002

# Copy installed production dependencies from deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy package manifests
COPY --chown=node:node package.json ./

# Copy application source code (tests and secrets are excluded via .dockerignore)
COPY --chown=node:node . .

# Run under unprivileged user 'node' (built into official Node Alpine image)
USER node

# Expose backend REST API port
EXPOSE 5002

# Container health check against Linkora's built-in /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:5002/api/health || exit 1

# dumb-init forwards signals (SIGTERM/SIGINT) properly to Node.js
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
