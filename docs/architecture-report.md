# App Architecture Report: SSA Intelligence

## 1. Overview

| Field | Value |
|-------|-------|
| **App Name** | SSA Intelligence |
| **Purpose** | AI-powered research brief and news intelligence platform. Generates structured company research reports using Claude and delivers curated news digests. Multi-tenant with group-based visibility. |
| **Primary Users** | Internal consulting analysts at SSA & Company |
| **Access Scope** | Internal only (behind oauth2-proxy, restricted to @ssaandco.com domain) |
| **Built By / Maintained By** | *Emory Wise, Patryk Mazinski* |
| **First Deployed** | *Jan 5, 2026* |
| **Current Status** | Active (regular commits, CI passing, production deployment on Render) |

---

## 2. Tech Stack

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React (SPA, hash-based routing) | 19.2.1 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS + custom brand theme (primary #003399) | 3.4.17 |
| Build Tool | Vite (`@vitejs/plugin-react`) | 6.2.0 |
| Icons | lucide-react | 0.563.0 |
| Charts | recharts | 3.7.0 |
| WebGL | ogl (animated background threads effect) | 1.0.11 |
| Testing | vitest | 4.0.18 |

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Express (TypeScript) | 4.21.2 |
| Runtime | Node.js | 20 |
| LLM Client | @anthropic-ai/sdk | 0.74.0 |
| ORM | Prisma | 6.19.2 |
| PDF Rendering | Playwright (server-side Chromium) | 1.58.2 |
| DOCX Export | docx | 9.5.1 |
| PDF Generation | pdfkit + pdf-lib | 0.17.2 / 1.17.1 |
| Markdown | marked | 15.0.12 |
| RSS Parsing | rss-parser | 3.13.0 |
| Scheduler | node-cron | 3.0.3 |
| Redis Client | ioredis (optional, not actively used) | 5.9.3 |
| Validation | zod | 3.24.1 |
| Rate Limiting | express-rate-limit | 7.4.2 |
| JSON Repair | jsonrepair | 3.13.0 |
| CORS | cors | 2.8.6 |

### Database

| Component | Detail |
|-----------|--------|
| Engine | PostgreSQL 15+ (16-alpine in local dev) |
| Hosting | Render managed Postgres |
| ORM | Prisma 6.19.2 |
| Migrations | Prisma Migrate (`prisma migrate deploy` pre-deploy) |
| Connection | Direct via `DATABASE_URL` connection string |
| Schema Notes | Multi-tenant (group-based visibility via junction tables), soft-cancel on jobs, audit-style `CostEvent` table, automatic `BugReport` records with error fingerprinting, versioned prompt overrides, user activity tracking |

---

## 3. Authentication & Authorization

### Authentication

- **Method**: Proxy-header based via oauth2-proxy (external reverse proxy handles SSO)
- **Flow**: User hits app &rarr; oauth2-proxy intercepts &rarr; redirects to identity provider (likely Microsoft Entra ID) &rarr; on success, proxy forwards request with headers (`x-forwarded-user`, `x-auth-request-email`, `x-forwarded-groups`) &rarr; backend `authMiddleware` extracts headers and upserts user &rarr; user context injected into request
- **Session Management**: Handled entirely by oauth2-proxy (cookie-based session at proxy layer). Backend is stateless &mdash; every request re-reads proxy headers. No JWT or session store on the backend side (JWT_SECRET exists but is for invite token signing only).
- **Domain Restriction**: Restricted to `@ssaandco.com` emails

### Authorization

- **Model**: Role-based (ADMIN vs MEMBER) + group-based visibility scoping
- **Roles**:
  - `MEMBER` &mdash; Standard user; can create research, view news, access own/group-shared content
  - `ADMIN` &mdash; Can manage users, groups, invites, prompts, pricing, bug reports, trigger news refresh
  - Super Admin (via `SUPER_ADMIN_EMAIL` env var) &mdash; Elevated privileges for user management
- **Enforcement**: Express middleware (`requireActiveUser`, `requireAdmin`, `requireSuperAdmin`) + Prisma query filters (`buildVisibilityWhere`) that restrict results to user's own PRIVATE jobs or GROUP-scoped jobs shared with their groups
- **User Lifecycle**: New users auto-provisioned as PENDING on first proxy-authenticated request &rarr; must accept an admin-generated invite (256-bit token, 7-day TTL) to become ACTIVE

---

## 4. External Services & Integrations

| Service | Purpose | Direction | Connection | Auth |
|---------|---------|-----------|------------|------|
| Anthropic Claude API | LLM calls for research generation, news categorization | Outbound | REST via `@anthropic-ai/sdk` | API key |
| Google News RSS | Layer 1 news fetching | Outbound | RSS via `rss-parser` | None (public) |
| AltAssets RSS | PE/Private Equity news | Outbound | RSS via `rss-parser` | None (public) |
| PR Newswire RSS | Financial services & M&A news | Outbound | RSS via `rss-parser` (2 feeds) | None (public) |
| logo.dev | Company logo images | Outbound (frontend) | Public CDN URL | Public token |
| oauth2-proxy | Authentication gateway | Inbound | Proxy headers | Trusted headers |

---

## 5. Infrastructure Patterns

### Background Jobs & Scheduling

- **Research Job Queue**: In-process queue using PostgreSQL advisory locks (`pg_try_advisory_lock`) for single-threaded execution. Jobs transition: queued &rarr; running &rarr; completed. Queue watchdog runs every 30s. Configurable concurrency (`MAX_CONCURRENT_JOBS`, default 3).
- **News Scheduler**: `node-cron` daily at 05:00 UTC (midnight EST). Two-phase: auto-archive articles older than 72h &rarr; refresh news for configured call diets.
- **No external queue system** &mdash; all job state tracked in PostgreSQL.

### File Storage

- **Brand assets**: Static files in `backend/assets/` (SSA logo, footer wave PNG). Loaded via `fs.readFileSync()`, converted to base64 data URIs for PDF/DOCX embedding.
- **Exports**: PDF, DOCX, and Markdown generated on-the-fly in memory and streamed to HTTP response &mdash; no persistent file storage.

### Real-Time Communication

- **None**. Job progress tracked via HTTP polling (`GET /api/research/jobs/:id`). Frontend polls every 2-5 seconds during active jobs.

### Caching

- **In-memory pricing cache**: 5-minute TTL for LLM model pricing rates.
- **Claude prompt caching**: Optional ephemeral cache via Anthropic API (`CLAUDE_CACHE_ENABLED`, default false).
- **No external cache layer** &mdash; Redis is in dependencies but not actively used.

---

## 6. Environment Variables & Secrets

### Core Application

| Variable | Category | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Database | PostgreSQL connection string |
| `NODE_ENV` | Config | Environment: development / production / test |
| `PORT` | Config | Server listen port (default: 3000) |
| `CORS_ORIGIN` | Config | Comma-separated allowed origins |
| `LOG_LEVEL` | Config | Logging level: error / warn / info / debug |
| `DEBUG` | Config | Enable detailed debug logging |

### Authentication

| Variable | Category | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Secret | Secret for invite token signing |
| `SUPER_ADMIN_EMAIL` | Config | Super-admin email for elevated access |
| `APP_URL` | Config | Base URL for generating invite links |
| `ADMIN_EMAILS` | Config | Comma-separated admin email addresses |
| `AUTH_EMAIL_DOMAIN` | Config | Allowed email domain (e.g., `ssaandco.com`) |
| `ALLOWED_DOMAINS` | Config | Allowed domains for auto-provisioning |

### LLM Configuration

| Variable | Category | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Secret | Anthropic Claude API key |
| `CLAUDE_MODEL` | Config | LLM model name (default: `claude-sonnet-4-5`) |
| `MAX_TOKENS` | Config | Max tokens per LLM call (default: 16000) |
| `CLAUDE_CACHE_ENABLED` | Flag | Enable prompt caching (default: false) |

### Job Queue

| Variable | Category | Description |
|----------|----------|-------------|
| `MAX_CONCURRENT_JOBS` | Config | Max parallel research jobs (default: 3) |
| `MAX_SECTION_RETRIES` | Config | Max retry attempts per section (default: 3) |
| `RETRY_DELAY_MS` | Config | Base retry delay in ms (default: 5000) |

### Rate Limiting

| Variable | Category | Description |
|----------|----------|-------------|
| `RATE_LIMIT_GET_WINDOW_MS` | Config | GET rate limit window (default: 300000) |
| `RATE_LIMIT_GET_MAX` | Config | GET rate limit max (default: 2000) |
| `RATE_LIMIT_GENERATE_WINDOW_MS` | Config | Generate rate limit window (default: 900000) |
| `RATE_LIMIT_GENERATE_MAX` | Config | Generate rate limit max (default: 10) |
| `RATE_LIMIT_EXPORT_WINDOW_MS` | Config | Export rate limit window (default: 3600000) |
| `RATE_LIMIT_EXPORT_MAX` | Config | Export rate limit max (default: 20) |
| `RATE_LIMIT_WRITE_WINDOW_MS` | Config | Write rate limit window (default: 900000) |
| `RATE_LIMIT_WRITE_MAX` | Config | Write rate limit max (default: 60) |

### External Services

| Variable | Category | Description |
|----------|----------|-------------|
| `LOGO_DEV_TOKEN` | Token | Public logo.dev API token |

### Development Only

| Variable | Category | Description |
|----------|----------|-------------|
| `DEV_MODE` | Flag | Enable dev mode features |
| `DEV_IMPERSONATE_EMAIL` | Config | Dev-only: impersonate user email |
| `DEV_ADMIN_EMAIL` | Config | Dev-only: admin email override |
| `VITE_API_BASE_URL` | Config | Frontend API proxy target |
| `VITE_LOGO_DEV_TOKEN` | Token | Frontend fallback logo.dev token |

---

## 7. Deployment & Infrastructure

| Component | Detail |
|-----------|--------|
| **Hosting Platform** | Render (Web Service + Managed PostgreSQL) |
| **Deployment Method** | Git push &rarr; auto-deploy on push to main via Docker build |
| **Config Files** | `render.yaml` (Blueprint), `Dockerfile` (multi-stage), `backend/docker-compose.yml` (local dev) |
| **Build** | Multi-stage Docker: backend `npm ci && prisma generate && npm run build`, frontend `npm ci && npm run build` |
| **Pre-deploy** | `prisma migrate deploy` (pending migrations) |
| **Start** | `node /app/backend/dist/src/index.js` |
| **Environments** | Production (Render) + Local development (docker-compose) |
| **Domain** | *[Needs manual input]* |
| **SSL/TLS** | Managed by Render (automatic HTTPS) |
| **Architecture** | Monolith &mdash; single Docker container serves backend API + frontend static files |
| **Base Image** | `mcr.microsoft.com/playwright:v1.58.2-jammy` (Chromium for PDF rendering) |

### CI/CD

- GitHub Actions: 3 parallel jobs (backend unit tests, backend integration tests with PostgreSQL 16 service, frontend tests)
- Runs on push/PR to main
- Dependabot configured for automated dependency PRs with documented review process

### Operational Features

- **Health Check**: `GET /health` returns status, timestamp, uptime, environment, model, DB connectivity
- **Graceful Shutdown**: SIGTERM/SIGINT waits for running research jobs (60s timeout), stops accepting connections (10s timeout), disconnects Prisma
- **Error Handling**: Global Express error handler; React `ErrorBoundary` on frontend; automatic `BugReport` creation on pipeline failures with error classification and fingerprinting

---

## 8. Deployment Readiness Assessment

| Capability | Status | Notes |
|------------|--------|-------|
| Health Check Endpoint | Present | `GET /health` with DB connectivity check |
| Error Handling | Present | Global handler + `BugReport` auto-creation |
| Logging | Partial | `console.*` with prefixed tags, configurable `LOG_LEVEL`, but no structured logging library |
| Monitoring / Alerting | Missing | No APM (Sentry, Datadog, etc.). Bug report system provides partial pipeline observability |
| Secrets Management | Present | All secrets externalized via env vars. `render.yaml` uses `sync: false` for sensitive values |
| Input Validation | Present | Zod schemas + inline validation in route handlers. Claude output validated via Zod + `jsonrepair` |
| Rate Limiting | Present | `express-rate-limit` with configurable per-category limits |
| CORS | Present | Restricted to specific origins (not wildcard), credentials enabled |
| Database Backups | Unknown | Managed by Render (automatic for paid plans) |
| Dependency Security | Partial | Dependabot configured with documented review process. No automated `npm audit` in CI |
| Documentation | Present | README, extensive `docs/` directory, CLAUDE.md, CONTRIBUTING.md, PR template |
| Environment Separation | Present | Distinct configs for dev, test (separate `_test` DB with safety guard), and production |

### Notable Gaps

1. **No structured logging** &mdash; console-based logs with `LOG_LEVEL` filtering, but no JSON-structured output for log aggregation
2. **No APM/monitoring** &mdash; no external observability tooling
3. **Redis unused** &mdash; in dependencies but not actively wired up; could be removed or activated for caching/job state
