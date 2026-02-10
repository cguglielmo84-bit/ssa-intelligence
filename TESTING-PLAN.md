# Testing Plan

> **Date:** 2026-02-10
> **Status:** Proposed — not yet implemented

---

## Current State

- **12 test files, 359 total lines** — all using bare `node:assert` (no test runner)
- Tests cover extracted pure utility functions only (orchestrator-utils, cancel-utils, list-utils, etc.)
- Zero tests for API route handlers, the orchestrator itself, or any frontend components
- No test runner configured (no jest/vitest in package.json dependencies)

### Existing Test Files

| File | Lines | What it tests |
|------|-------|---------------|
| `backend/src/services/orchestrator-utils.test.ts` | 32 | computeFinalStatus, computeOverallConfidence, computeTerminalProgress |
| `backend/src/services/claude-client.test.ts` | 17 | Claude API client utilities |
| `backend/src/services/dependency-utils.test.ts` | 18 | Section dependency resolution |
| `backend/src/services/export-utils.test.ts` | 69 | PDF/markdown export helpers |
| `backend/src/services/report-blueprints.test.ts` | 11 | Report blueprint loading |
| `backend/src/services/rerun-utils.test.ts` | 19 | Job rerun logic |
| `backend/src/services/section-formatter.test.ts` | 27 | Section output formatting |
| `backend/src/services/stage-tracking-utils.test.ts` | 18 | Stage progress tracking |
| `backend/src/api/research/cancel-utils.test.ts` | 10 | Cancel state transitions |
| `backend/src/api/research/list-utils.test.ts` | 34 | Job list filtering/sorting |
| `backend/src/api/research/status-utils.test.ts` | 48 | Job status derivation |
| `frontend/src/utils/adminUsers.test.js` | 56 | Group member count on user deletion |

---

## Recommended Phases

### Phase 1: Set Up Vitest + Migrate Existing Tests

**Effort:** Low | **Value:** High (foundation for everything else)

- Install Vitest (fast, TypeScript-native, ESM-compatible)
- Migrate the 12 existing `node:assert` test files to Vitest syntax
- Add `npm test` script to both `backend/package.json` and `frontend/package.json`
- Add coverage reporting
- Add CI step (GitHub Actions) to run tests on PR

### Phase 2: Integration Tests for API Routes

**Effort:** Medium | **Value:** Highest

The 12 API route handlers are the riskiest code — most QA findings lived here. Use Vitest + supertest with a test database.

**Priority routes to test:**

| Route | Why |
|-------|-----|
| `POST /api/research/generate` | Duplicate detection, dependency auto-expand, input validation |
| `POST /api/research/cancel` | Soft-cancel behavior (was P0 bug) |
| `GET /api/research/list` | Pagination, status filtering, NaN guards |
| `GET /api/research/detail/:id` | Stage output assembly |
| `POST /api/news/refresh` | TOCTOU race (advisory lock), stale recovery |
| `GET /api/news/articles` | Auth enforcement (was P1 bug), pagination |
| `PUT /api/admin/pricing` | Negative rate validation, rate swap transaction |
| `POST /api/feedback` | Rate limiting |

**What to assert:**
- Auth enforcement (401 without credentials)
- Input validation (400 on bad input)
- Error responses (safe messages, no internal details leaked)
- Edge cases found during QA (duplicate detection, concurrent requests)

### Phase 3: Orchestrator Unit Tests

**Effort:** Medium | **Value:** High

`orchestrator.ts` is 2,100 lines and the core of the application. Mock the Anthropic SDK and Prisma client.

**Key functions to test:**

| Function | Why |
|----------|-----|
| `ensureStageHasContent` | 6 stage-specific validation guards (was P2-6) |
| `buildStagePrompt` | Prompt resolver integration, base + addendum composition |
| `recordTokenUsage` | Cost tracking doesn't throw (was P1-5) |
| Status transitions | Final status computation from sub-job states |
| Array unwrapping | Single-element array → object before schema validation (was P2-14) |
| KPI cap | Metrics capped at 50 (was P2-15) |

---

## What to Skip (For Now)

### Frontend Component Tests
The React components are mostly presentational. The QA bugs were behavioral (missing props, stale data, missing `credentials: 'include'`), which are better caught by integration/E2E tests than by rendering components in jsdom.

### E2E Tests
Valuable but expensive to maintain. Revisit when there's a stable staging environment and the feature set stabilizes.

### LLM Output Tests
Non-deterministic by nature. The existing Zod schema validation + `ensureStageHasContent` guards are a better fit than asserting specific LLM outputs.

---

## Summary

| Phase | Scope | Effort | Value |
|-------|-------|--------|-------|
| **1** | Vitest setup + migrate 12 existing tests | Low | High |
| **2** | Integration tests for API routes | Medium | Highest |
| **3** | Orchestrator unit tests | Medium | High |

The biggest return on investment is **Phase 1 + Phase 2**: proper test runner, then integration tests for the API surface where bugs actually appeared.
