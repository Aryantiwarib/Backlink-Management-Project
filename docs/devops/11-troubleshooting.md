# LINKORA DevOps Incident Response & Troubleshooting Playbook

**Document ID**: `docs/devops/11-troubleshooting.md`  
**Phase**: Phase 13 — Operations & Troubleshooting Documentation  
**Status**: Active & Implemented  
**Author**: Antigravity DevOps Team  
**Date**: November 2026  

---

## 1. Quick Emergency Triage Matrix

| Symptom | Probable Cause | Immediate Remediation |
| :--- | :--- | :--- |
| **Port 5002 already in use (`EADDRINUSE`)** | Dangling local Node.js process holding port | Run `kill -9 $(lsof -t -i:5002)` |
| **MongoDB Atlas connection timeout / Bad auth** | IP whitelist restriction or incorrect password in `.env` | Add current IP to Atlas Network Access; verify `server/.env` `MONGODB_URI` |
| **CORS preflight blocked (`Method PATCH not allowed`)** | Origin not whitelisted or PATCH omitted in headers | Check `app.js` CORS middleware; verify `CLIENT_URL` matches request Origin |
| **Playwright staging test failure in CI** | Target staging server slow to boot or unreachable | Check staging build logs; verify `STAGING_BACKEND_URL` and `STAGING_CLIENT_URL` |
| **Docker build fails during `npm ci`** | Out-of-sync `package-lock.json` | Run `npm install` locally to update lockfile and re-commit |
| **Trivy flags HIGH/CRITICAL vulnerability in CI** | Outdated npm package with reported CVE | Run `npm audit fix` or upgrade package version in `package.json` |

---

## 2. Docker & Container Troubleshooting

### 2.1 Backend Container Crashes on Startup
```bash
# Inspect container exit logs
docker compose logs server

# Common Cause: MongoDB service not yet ready
# Fix: Ensure depends_on has condition: service_healthy in docker-compose.yml
```

### 2.2 Permissions Error in Container
```text
Error: EACCES: permission denied, open '/app/logs/...'
```
- **Cause**: The container runs as unprivileged user `node` (UID 1000), but host volume or copied files are owned by `root`.
- **Fix**: Ensure `COPY --chown=node:node` is used in `server/Dockerfile`.

### 2.3 Frontend SPA Routes Return 404 on Page Refresh
- **Cause**: Nginx does not route client-side pushState URLs to `index.html`.
- **Fix**: Verify `client/nginx.conf` contains:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

---

## 3. Testing & CI Pipeline Troubleshooting

### 3.1 Unit / Integration Tests Hang Indefinitely
- **Cause**: Open database connections or background timers preventing Node.js event loop from closing.
- **Fix**: Use `node --test --test-force-exit` as configured in `server/package.json`.

### 3.2 Playwright Missing Browsers in GitHub Actions
```text
browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/...
```
- **Fix**: Ensure workflow includes:
  ```yaml
  - name: Install Playwright Browsers
    run: npx playwright install --with-deps chromium
  ```

---

## 4. Production Outage & Rollback Playbook

When an unrecoverable failure occurs in production:

### Step 1: Immediate Triage
1. Check `/api/health` to determine if backend process is alive.
2. Check Sentry dashboard for exception stack traces.
3. Check cloud hosting logs (Render, Railway, Cloudflare).

### Step 2: Instant Rollback
- **Option A (Cloud Dashboard)**: Click "Rollback to previous deploy" in your cloud hosting control panel.
- **Option B (Git Revert)**:
  ```bash
  git checkout main
  git pull origin main
  git revert HEAD -m 1
  git push origin main
  ```
  The production CD pipeline will automatically build and deploy the last stable commit.

### Step 3: Post-Mortem & Fix
1. Create a `fix/*` or `hotfix/*` branch.
2. Reproduce the bug with an automated test in `server/tests/`.
3. Fix the issue, verify all tests pass locally (`npm test`), and submit a Pull Request to `develop`.
