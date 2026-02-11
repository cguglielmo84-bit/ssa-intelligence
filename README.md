# SSA Intelligence

AI-powered research brief and news intelligence platform. Generates structured company research reports using Claude and delivers curated news digests via email. Multi-tenant with group-based visibility.

## Repository layout
- `backend/`: Express 5 API, LLM orchestrator, prompts, Prisma schema
- `frontend/`: Vite + React 19 SPA
- `docs/`: architecture, auth, prompting guides, testing strategy

## Quick start (development)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Set ANTHROPIC_API_KEY, DATABASE_URL, and CORS_ORIGIN
npm run docker:up
npm run db:generate
npm run db:push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Defaults:
- Backend: http://localhost:3000
- Frontend: http://localhost:5176

## Testing

```bash
# Unit tests (no database needed)
cd backend && npm test

# Integration tests (requires test PostgreSQL database)
DATABASE_URL=<test-db-url> npm run test:integration
```

84 tests total — 26 unit tests across 11 files, 58 integration tests across 8 API route handlers. See `docs/testing.md` for full details and future testing plans.

## Deployment

The app ships as a single Docker container (backend serves the frontend static build).

```bash
docker build -t ssa-intelligence .
docker run -p 3000:3000 --env-file .env ssa-intelligence
```

Render: the Dockerfile runs `prisma migrate deploy` on container startup, so pending migrations are applied automatically on each deploy. See `render.yaml` for the full blueprint.

## Docs
- `docs/prompting/README.md` — prompting system guide
- `docs/authentication.md` — oauth2-proxy auth setup
- `docs/RESEARCH-BRIEF-GUARDRAILS.md` — output quality guardrails
- `docs/storage-overview.md` — data model and storage
- `docs/testing.md` — test coverage and future testing strategy

## Changelog
See `CHANGELOG.md` for release history.
