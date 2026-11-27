# LINKORA Docker Containerization & Local Orchestration Guide

**Document ID**: `docs/devops/03-docker-setup.md`  
**Phase**: Phase 2 — Docker Containerization  
**Status**: Active & Implemented  
**Author**: Antigravity DevOps Team  
**Date**: November 2026  

---

## 1. Overview & Architectural Goals

LINKORA containerization provides an isolated, reproducible, and production-grade environment across development, CI/CD runners, staging, and production servers.

### Key Objectives
1. **Zero Environment Drift**: Guarantee that Node.js versions, dependencies, and OS libraries match between local development and cloud production.
2. **Minimal Attack Surface**: Multi-stage builds produce ultra-lightweight Alpine images containing only production runtime artifacts.
3. **Least Privilege Security**: The backend container runs under the unprivileged `node` user (UID 1000) rather than `root`.
4. **Signal Forwarding & Zombie Process Prevention**: `dumb-init` acts as PID 1 to gracefully propagate `SIGTERM`/`SIGINT` signals to the Node.js application.
5. **Integrated Health Monitoring**: Docker `HEALTHCHECK` instructions continuously probe `/api/health` (Backend) and `/healthz` (Frontend).

---

## 2. Multi-Stage Docker Architecture

```mermaid
flowchart TD
    subgraph Client_Build ["Client Multi-Stage Dockerfile (client/Dockerfile)"]
        CB1[Stage 1: node:20-alpine AS builder] -->|npm ci & vite build| CB2[Static HTML/JS/CSS in /app/dist]
        CB3[Stage 2: nginx:1.27-alpine AS runner]
        CB2 -->|COPY --from=builder| CB4[/usr/share/nginx/html]
        CB5[client/nginx.conf] -->|COPY| CB6[/etc/nginx/conf.d/default.conf]
        CB3 --> CB4
        CB3 --> CB6
    end

    subgraph Server_Build ["Server Multi-Stage Dockerfile (server/Dockerfile)"]
        SB1[Stage 1: node:20-alpine AS deps] -->|npm ci --omit=dev| SB2[Production node_modules]
        SB3[Stage 2: node:20-alpine AS runner]
        SB2 -->|COPY --from=deps| SB4[/app/node_modules]
        SB5[server/ source code] -->|COPY --chown=node:node| SB6[/app]
        SB3 -->|apk add dumb-init curl| SB7[dumb-init init system]
        SB3 -->|USER node| SB8[Non-root User Execution]
        SB3 --> SB4
        SB3 --> SB6
    end
```

---

## 3. Container Specifications

### 3.1 Frontend (`client/Dockerfile`)
- **Stage 1 (`builder`)**: Uses `node:20-alpine`, installs build tools, and executes `npm run build`. Build arguments `VITE_API_URL` and `VITE_BACKEND_URL` allow dynamic API base configuration during image creation.
- **Stage 2 (`runner`)**: Uses `nginx:1.27-alpine`. Discards all Node.js devDependencies and build tooling, copying only compiled HTML/JS/CSS assets into `/usr/share/nginx/html`.
- **Nginx Capabilities (`client/nginx.conf`)**:
  - React Router SPA fallback (`try_files $uri $uri/ /index.html`).
  - Gzip compression for static text, scripts, stylesheets, and SVGs.
  - Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`.
  - Long-term caching for immutable hashed assets (`/assets/` cache 1 year).
  - Health check endpoint at `/healthz` (returns `200 "healthy\n"`).

### 3.2 Backend (`server/Dockerfile`)
- **Stage 1 (`deps`)**: Uses `node:20-alpine` with build essentials (`python3`, `make`, `g++`) to compile any native dependencies cleanly, running `npm ci --omit=dev`.
- **Stage 2 (`runner`)**: Uses `node:20-alpine`.
  - Adds `dumb-init` to handle Unix signals and reap zombie child processes.
  - Adds `curl` to support health check polling.
  - Executes as unprivileged user: `USER node`.
  - Sets `NODE_ENV=production` and `PORT=5002`.
  - Health check probes `http://127.0.0.1:5002/api/health` every 30s.

### 3.3 Security & Secret Isolation (`.dockerignore`)
Both root, client, and server `.dockerignore` files prevent accidental leakage of sensitive files into image layers:
- Local `.env` and `.env.*` files are excluded.
- Local `node_modules/` are excluded (ensuring clean in-container installation).
- `.git/` history and development test files are excluded from production images.

---

## 4. Multi-Service Orchestration (`docker-compose.yml`)

The root `docker-compose.yml` configures the complete LINKORA stack on an isolated Docker bridge network (`linkora-network`):

| Service | Image / Build Context | Internal Port | Host Port | Role | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mongodb` | `mongo:7.0` | `27017` | `27017` | Persistent Database | None (Healthcheck: `mongosh ping`) |
| `server` | `./server` (Dockerfile) | `5002` | `5002` | Express REST API | Depends on `mongodb` (`service_healthy`) |
| `client` | `./client` (Dockerfile) | `80` | `5173` | React Nginx UI | Depends on `server` |

---

## 5. Operations & CLI Commands

### 5.1 Starting the Complete Stack
```bash
# Build images and start all services in detached mode
docker compose up -d --build

# View real-time logs across all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f server
docker compose logs -f client
```

### 5.2 Checking Container Health & Status
```bash
# List running containers and health states
docker compose ps

# Sample output:
# NAME                IMAGE          STATUS                    PORTS
# linkora-mongodb     mongo:7.0      Up 2 minutes (healthy)    0.0.0.0:27017->27017/tcp
# linkora-server      ...            Up 2 minutes (healthy)    0.0.0.0:5002->5002/tcp
# linkora-client      ...            Up 2 minutes (healthy)    0.0.0.0:5173->80/tcp
```

### 5.3 Stopping & Cleaning Up
```bash
# Gracefully stop all containers
docker compose stop

# Stop and remove containers and networks
docker compose down

# Stop, remove containers, and purge database volume (destructive)
docker compose down -v
```

### 5.4 Rebuilding Individual Services
```bash
# Rebuild only the backend after code changes
docker compose build server && docker compose up -d server

# Rebuild only the frontend after UI changes
docker compose build client && docker compose up -d client
```
