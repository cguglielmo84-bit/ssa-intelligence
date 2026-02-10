# Claude Code Instructions

## Project Overview

SSA Intelligence is an AI-powered research brief and news intelligence platform.
It generates structured company research reports using Claude and delivers curated
news digests via email. Multi-tenant with group-based visibility.

## Architecture

**Monorepo:** `backend/` (API + orchestrator) and `frontend/` (SPA).

**Backend** — Express 5 · TypeScript · Prisma ORM · PostgreSQL · Redis (optional) · Claude API
- Auth: proxy-header based (`x-forwarded-user`, `x-forwarded-groups`) via oauth2-proxy
- LLM orchestration: multi-stage pipeline that runs foundation → parallel sections → PDF export
- Background jobs: in-process queue with graceful shutdown (SIGTERM waits for running jobs)

**Frontend** — React 19 · Vite · Tailwind CSS · TypeScript
- Hash-based routing (`#/research`, `#/news`, `#/admin/*`)
- PDF export via server-side Playwright render
- No state management library; hooks + lifted state

**Database** — PostgreSQL 15+ with Prisma migrations (`backend/prisma/`)

## Key Patterns

- **Report blueprints** define section composition per report type (INDUSTRIALS, GENERIC, PE, FS, INSURANCE). See `backend/src/services/report-blueprints.ts`.
- **Orchestrator pipeline** (`backend/src/services/orchestrator.ts`): foundation fetch → dependency-ordered section generation → PDF export. Each stage writes output to the DB.
- **Prompt resolver** (`backend/src/services/prompt-resolver.ts`): loads code-default prompts with optional DB overrides (admin-published). Composes base + report-type addendums.
- **Multi-tenancy**: users belong to groups; research jobs and news entities have `visibility` (group-scoped or all). Auth middleware injects user/group context.
- **Cost tracking** (`backend/src/services/cost-tracking.ts`): logs token usage and cost per stage; supports configurable pricing rates.

## Dev Environment

```bash
cd backend  && npm run docker:up   # PostgreSQL on :5432
cd backend  && npm run dev          # API on :3000
cd frontend && npm run dev          # Vite on :5176
```

Copy `backend/.env.example` to `backend/.env` and fill in required values (DATABASE_URL, ANTHROPIC_API_KEY).

## Directory Guide

| Path | Purpose |
|------|---------|
| `backend/src/api/` | Express route handlers (research, news, admin, company, groups, feedback) |
| `backend/src/services/` | Core business logic — orchestrator, Claude client, cost tracking, PDF/markdown export, news fetcher |
| `backend/src/middleware/` | Auth middleware (proxy-header extraction + group resolution) |
| `backend/src/lib/` | Shared utilities — Prisma client, constants, error helpers, retry |
| `backend/src/types/` | TypeScript type definitions and Zod schemas |
| `backend/prompts/` | LLM prompt templates per section (foundation, exec-summary, financials, etc.) |
| `backend/prisma/` | Prisma schema, migrations, and seed scripts |
| `frontend/src/pages/` | Top-level page components (Home, NewResearch, ResearchDetail, NewsDashboard, NewsSetup, Admin*) |
| `frontend/src/components/` | Shared UI components (Layout, StatusPill, ConfirmDialog, Toast, ErrorBoundary, modals) |
| `frontend/src/services/` | API client hooks (researchManager, newsManager) |
| `docs/` | Architecture docs, prompt guides, report-blueprint specs, plans |

## Pull Requests
- Always read `.github/PULL_REQUEST_TEMPLATE.md` before creating a PR.
- PR title must follow: `type(scope): short summary`
- Use the template verbatim and do not remove sections.
- Always update CHANGELOG.md before creating a PR.
