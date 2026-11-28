# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Build Client Application
# -----------------------------------------------------------------------------
FROM node:26-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_BACKEND_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci

# Copy application source code
COPY . .

# Build production bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve with High-Performance Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration for SPA routing & security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
