# Testing Strategy

> **Last updated:** 2026-02-10

---

## Current Test Coverage

SSA Intelligence has **84 automated tests** across two test suites, all running on Vitest.

### Backend Unit Tests — 26 tests, 11 files

Pure-function tests with zero external dependencies. Run in ~200ms.

```bash
cd backend && npm test
```

| File | Tests | What it covers |
|------|-------|----------------|
| `services/orchestrator-utils.test.ts` | 6 | `computeFinalStatus`, `computeOverallConfidence`, `computeTerminalProgress` |
| `services/claude-client.test.ts` | 2 | JSON parse/repair in Claude API responses |
| `services/dependency-utils.test.ts` | 2 | Section dependency graph resolution, blocked-stage detection |
| `services/export-utils.test.ts` | 3 | PDF/markdown export section assembly, readiness checks |
| `services/report-blueprints.test.ts` | 1 | Blueprint loading and section ordering |
| `services/rerun-utils.test.ts` | 1 | Rerun stage computation with failed dependency inclusion |
| `services/section-formatter.test.ts` | 2 | Section output formatting |
| `services/stage-tracking-utils.test.ts` | 1 | Stage progress tracking |
| `api/research/cancel-utils.test.ts` | 1 | Cancel state transition validation |
| `api/research/list-utils.test.ts` | 4 | Job list filtering by derived status |
| `api/research/status-utils.test.ts` | 3 | `deriveJobStatus` from sub-job states |
| `frontend/src/utils/adminUsers.test.js` | 1 | Group member count decrement on user deletion |

### Backend Integration Tests — 58 tests, 8 files

HTTP-level tests using supertest against a real PostgreSQL test database. Each test file truncates all tables before each test. Run sequentially (~14s).

```bash
cd backend && DATABASE_URL=<test-db-url> npm run test:integration
```

| File | Tests | Route | Key scenarios |
|------|-------|-------|---------------|
| `api/feedback.integration.test.ts` | 8 | `POST /api/feedback` | Validation (message length, type, email format), create with full/minimal fields, default type persisted in DB |
| `api/research/generate.integration.test.ts` | 11 | `POST /api/research/generate` | Input validation (5 cases), duplicate detection (queued, running, force override), job creation defaults, section dependency auto-expansion |
| `api/research/cancel.integration.test.ts` | 7 | `POST /api/research/:id/cancel` | Cancel queued/running jobs, sub-job cascade, 404/400 error guards, visibility-based access control, admin override |
| `api/research/list.integration.test.ts` | 7 | `GET /api/research` | Pagination defaults, limit/offset, limit cap at 100, admin vs member visibility, GROUP scoping, total count |
| `api/research/detail.integration.test.ts` | 5 | `GET /api/research/:id` | Full detail with sub-jobs, 404 for missing/hidden jobs, derived status (`completed_with_errors`), admin override |
| `api/admin/pricing.integration.test.ts` | 9 | `/api/admin/pricing` | Auth guard (403), CRUD operations, atomic deactivation on create, negative rate rejection, inactive rate update rejection |
| `api/news/articles.integration.test.ts` | 6 | `GET /api/news/articles` | Default pagination, filters (companyId, isSent, isArchived), total count, empty results |
| `api/news/refresh.integration.test.ts` | 5 | `/api/news/refresh` | 409 lock conflict, success flow with mocked fetcher, stale refresh auto-recovery, day parameter clamping, GET status |

**Mocking strategy:** Only external services are mocked (Anthropic SDK, news fetcher, domain resolver). All database operations hit a real PostgreSQL instance via Prisma.

### CI Pipeline

GitHub Actions runs both suites on every PR (`.github/workflows/test.yml`):

- **`backend-unit-tests`** — Node 20, `npm test`
- **`backend-integration-tests`** — Node 20 + PostgreSQL 16 service container, `npm run test:integration`
- **`frontend-tests`** — Node 20, `npm test` (1 test file)

---

## Test Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| Unit test config | `backend/vitest.config.ts` | Runs `*.test.ts`, excludes `*.integration.test.ts` |
| Integration test config | `backend/vitest.integration.config.ts` | Runs `*.integration.test.ts`, sequential file execution, 15s/30s timeouts |
| Global setup | `backend/src/test-utils/global-setup.ts` | Resets test DB schema via `prisma db push --force-reset` (safety guard: URL must contain `_test`) |
| Env setup | `backend/src/test-utils/setup.ts` | Sets `NODE_ENV=development` (disables rate limiting), configures auth domain and admin emails |
| DB helpers | `backend/src/test-utils/db-helpers.ts` | `truncateAll()` (dependency-ordered delete), `testPrisma` client, `disconnectPrisma()` |
| Auth helpers | `backend/src/test-utils/auth-helpers.ts` | `asAdmin()`, `asMember()`, `asOtherMember()` — inject proxy auth headers into supertest requests |
| Factories | `backend/src/test-utils/factories.ts` | `createTestUser`, `createTestGroup`, `createTestJob`, `createTestSubJob`, `createTestPricingRate`, `createTestFeedback`, `createTestTrackedCompany`, `createTestNewsArticle`, `addUserToGroup` |

### Running Tests Locally

```bash
# Unit tests (no database needed)
cd backend && npm test

# Integration tests (requires test database)
# 1. Ensure PostgreSQL is running (docker compose or local)
# 2. Create the test database if it doesn't exist:
psql -h localhost -p 5434 -U <user> -c "CREATE DATABASE ssa_intelligence_test;"

# 3. Run:
DATABASE_URL=postgresql://<user>:<pass>@localhost:5434/ssa_intelligence_test npm run test:integration

# Watch mode (re-runs on file change)
npm run test:integration:watch
```

---

## Assessment: Is Current Coverage Sufficient?

**Yes, for now.** The current 84 tests cover the areas where real bugs occurred:

- All 8 API route handlers identified as highest-risk in the QA audit are tested
- The extracted pure utility functions (status derivation, dependency resolution, export assembly) are unit tested
- Visibility/multi-tenancy access control is exercised in list, detail, and cancel tests
- The soft-cancel P0 bug is regression-tested with sub-job cascade verification
- Duplicate detection, input validation, and pagination edge cases are covered

The diminishing-returns threshold has been reached for the current bug profile. Adding more tests now would primarily cover low-risk CRUD routes (admin users, groups, news tags/companies/people) where the logic is straightforward Prisma operations with minimal business rules.

**Revisit testing when:**
- A bug occurs in an untested route
- The orchestrator is refactored (new extraction = new unit tests)
- A staging environment exists (E2E tests become viable)
- Frontend complexity grows beyond presentational components

---

## Future Testing Opportunities

The sections below are ordered by value-to-effort ratio. Each section describes what to test, why it matters, what's involved, and roughly how many tests to expect.

---

### Tier 1: Additional API Route Integration Tests

**Effort:** Low per route | **When to do it:** When modifying these routes, or on a testing sprint

These routes currently have zero integration tests. The test infrastructure is already in place — factories, auth helpers, and DB helpers all exist. Each route takes 30-60 minutes to add.

#### Admin Users (`/api/admin/users`) — ~10 tests

Handlers: `listUsers`, `createUser`, `getUser`, `updateUser`, `deleteUser`

| Test | Why it matters |
|------|----------------|
| Reject non-admin (403) | Auth guard on all admin routes |
| List users with pagination | Correct offset/limit behavior |
| Create user with valid email domain | Domain validation (`AUTH_EMAIL_DOMAIN`) |
| Reject create with invalid email domain | Security boundary |
| Reject duplicate email | Unique constraint handling |
| Get single user with group memberships | Join query correctness |
| Update user role | Role transition validation |
| Delete user decrements group member counts | Known bug area (was a fix) |
| Delete non-existent user (404) | Error handling |
| Cannot delete self | Self-deletion guard |

#### Admin Groups (`/api/admin/groups`) — ~8 tests

Handlers: `listAdminGroups`, `createGroup`, `addGroupMember`, `removeGroupMember`, `deleteGroup`

| Test | Why it matters |
|------|----------------|
| Reject non-admin (403) | Auth guard |
| List groups with member counts | Aggregation correctness |
| Create group with name | Validation |
| Add member to group | Junction table insertion |
| Reject duplicate member | Unique constraint handling |
| Remove member from group | Junction table deletion + count update |
| Delete group cascades memberships | Foreign key behavior |
| Delete group with active jobs (behavior check) | Jobs referencing deleted groups |

#### Admin Prompts (`/api/admin/prompts`) — ~12 tests

Handlers: `listPrompts`, `getPrompt`, `createPrompt`, `updatePrompt`, `deletePrompt`, `publishPrompt`, `revertPrompt`

| Test | Why it matters |
|------|----------------|
| Reject non-admin (403) | Auth guard |
| List prompts with filters (stage, reportType, status) | Query correctness |
| Create draft prompt | Basic CRUD |
| Update draft prompt | Draft editing |
| Publish prompt (activates it, archives previous) | State machine — known bug area (draft saves were archiving published prompts) |
| Revert prompt (restores previous published) | State machine — known bug area |
| Delete draft prompt | Cleanup |
| Reject delete of published prompt | Protection guard |
| Get prompt with version history | Correct ordering |
| Unique constraint with NULLS NOT DISTINCT | PostgreSQL 15+ specific behavior |

#### Admin Metrics (`/api/admin/metrics`) — ~4 tests

Handler: `getMetrics`

| Test | Why it matters |
|------|----------------|
| Reject non-admin (403) | Auth guard |
| Return aggregated cost metrics | Aggregation query correctness |
| Filter by date range | Date filtering |
| Filter by group/reportType | Multi-filter composition |

#### Research Delete (`/api/research/:id`) — ~4 tests

Handler: `deleteResearchJob`

| Test | Why it matters |
|------|----------------|
| Delete own job (200) | Basic CRUD |
| Reject delete of running job | State guard |
| Non-owner cannot delete (404 via visibility) | Access control |
| Admin can delete any job | Admin override |

#### Research Rerun (`/api/research/:id/rerun`) — ~5 tests

Handler: `rerunResearchSections`

| Test | Why it matters |
|------|----------------|
| Rerun selected sections on completed job | Core functionality |
| Auto-include failed dependencies in rerun set | Dependency logic |
| Reject rerun on running job | State guard |
| Reject rerun with invalid section names | Validation |
| Verify sub-job status reset | DB state correctness |

#### Research Status (`/api/research/jobs/:id`) — ~3 tests

Handler: `getJobStatus`

| Test | Why it matters |
|------|----------------|
| Return current status with sub-job breakdown | Polling endpoint correctness |
| Return 404 for non-existent job | Error handling |
| Visibility filter applied | Access control |

#### User Routes (`/api/me`, `/api/groups`) — ~3 tests

Handlers: `getMe`, `listGroups`

| Test | Why it matters |
|------|----------------|
| `/api/me` returns current user from proxy headers | Auth flow verification |
| `/api/me` auto-creates user on first request | Auto-provisioning behavior |
| `/api/groups` returns user's groups | Group resolution |

#### News Sub-routes (tags, companies, people, revenue-owners) — ~20 tests

These are all standard CRUD routers with similar patterns. Each needs 4-5 tests.

| Route | Tests | Key scenarios |
|-------|-------|---------------|
| `/api/news/tags` | ~5 | CRUD, duplicate name rejection, usage count |
| `/api/news/companies` | ~5 | CRUD, bulk operations, linked articles |
| `/api/news/people` | ~5 | CRUD, bulk operations, linked articles |
| `/api/news/revenue-owners` | ~5 | CRUD, linked deep dives |

#### News Search & Export — ~5 tests

| Route | Tests | Key scenarios |
|-------|-------|---------------|
| `POST /api/news/search` | ~2 | Returns results, handles empty query |
| `GET /api/news/export/markdown/:ownerId` | ~2 | Generates markdown, 404 for missing owner |
| `GET /api/news/export/pdf/:ownerId` | ~1 | PDF generation (may need Playwright mock) |

**Tier 1 total: ~74 additional tests across 17 route handlers**

---

### Tier 2: Orchestrator Refactor + Unit Tests

**Effort:** High | **When to do it:** When refactoring the orchestrator or fixing an orchestrator bug

The orchestrator (`backend/src/services/orchestrator.ts`, ~2,100 lines) is the core of the application but is too coupled to unit test directly. The approach is to extract testable logic first, then write unit tests for the extractions.

#### Extraction candidates

| Function cluster | Current location | What to extract |
|-----------------|------------------|-----------------|
| Stage content validation | `ensureStageHasContent()` | Extract validator per stage into `stage-validators.ts` — pure functions that take output and return `{ valid: boolean, reason?: string }` |
| Prompt composition | `buildStagePrompt()` | Extract prompt template assembly into `prompt-builder.ts` — takes foundation data + section config, returns prompt string |
| Cost calculation | `recordTokenUsage()` | Already partially extracted to `cost-tracking.ts`, but the token counting and rate lookup logic could be further isolated |
| Array normalization | Inline in stage processing | Extract `normalizeStageOutput()` — unwraps single-element arrays, applies KPI cap, validates against Zod schema |
| Queue management | `processQueue()`, `acquireNextJob()` | Extract queue state machine into `queue-manager.ts` — pure state transitions separate from DB operations |

#### Expected tests after extraction

| Module | Tests | What to assert |
|--------|-------|----------------|
| `stage-validators.ts` | ~12 | Each stage's content guards (empty strings, missing fields, malformed objects) |
| `prompt-builder.ts` | ~8 | Base + addendum composition, variable interpolation, missing variable handling |
| `normalizeStageOutput.ts` | ~6 | Single-element unwrap, KPI cap at 50, passthrough for valid data |
| `queue-manager.ts` | ~5 | State transitions: queued → running → completed/failed, concurrent job limits |

**Tier 2 total: ~31 tests, but requires refactoring first**

---

### Tier 3: Frontend Tests

**Effort:** Medium | **When to do it:** When frontend complexity grows or critical UI bugs appear

The frontend is mostly presentational — React components rendering data from API hooks. The current QA bugs were behavioral issues (missing props, stale data, missing `credentials: 'include'`) that are better caught by integration/E2E tests than by rendering components in jsdom.

#### Worth testing

| Component/Hook | Tests | Why |
|----------------|-------|-----|
| `useResearchManager` | ~6 | Core data hook — polling logic, abort cleanup, state transitions |
| `useNewsArticles` | ~4 | Pagination state, filter composition, API call construction |
| `StatusPill` | ~3 | Correct style/icon/label for all status values including unknowns |
| `ConfirmDialog` | ~2 | Open/close state, callback invocation |
| `NewResearch` form | ~5 | Section dependency auto-expansion, validation, submit payload construction |
| `ErrorBoundary` | ~2 | Catches errors, renders fallback |

#### Not worth testing

- Page components (`Home`, `ResearchDetail`, `NewsDashboard`) — too many dependencies, better as E2E
- Layout/sidebar — purely presentational
- Admin pages — CRUD forms with minimal logic

**Tier 3 total: ~22 tests**

---

### Tier 4: End-to-End Tests

**Effort:** High | **When to do it:** When a stable staging environment exists

E2E tests using Playwright to verify critical user flows through the actual browser. These are the most realistic but also the most expensive to write and maintain.

#### Critical flows to cover

| Flow | Steps | Why |
|------|-------|-----|
| Research creation | Login → New Research → enter company → confirm resolve → submit → verify queued | The core user journey; touches auth, company resolution, form submission, API integration |
| Research cancellation | Start research → cancel → verify cancelled state in UI | P0 bug area — cancel used to hard-delete instead of soft-cancel |
| Research detail polling | Navigate to running job → verify progress updates → verify completion state | Polling loop correctness, status transitions in UI |
| PDF export | Complete a research job → export PDF → verify download | Playwright render pipeline, file download |
| News dashboard | View articles → filter by status → paginate → mark as sent | Multi-step CRUD flow |
| Admin user management | Login as admin → create user → assign to group → delete user | Admin CRUD, group membership cascade |

#### Prerequisites

- Stable staging environment with seeded test data
- Test user accounts with known credentials
- Playwright test infrastructure (already available via MCP plugin)
- CI runner with browser support

**Tier 4 total: ~12-15 E2E tests across 6 flows**

---

## Summary

| Tier | Scope | Tests | Effort | Depends on |
|------|-------|-------|--------|------------|
| **Current** | Unit + integration (8 routes) | 84 | Done | -- |
| **Tier 1** | Remaining API route integration tests | ~74 | Low per route | Nothing — infrastructure exists |
| **Tier 2** | Orchestrator refactor + unit tests | ~31 | High | Orchestrator refactoring effort |
| **Tier 3** | Frontend component/hook tests | ~22 | Medium | Nothing |
| **Tier 4** | E2E browser tests | ~15 | High | Staging environment |

**Recommendation:** The current 84 tests are sufficient for the project's maturity. Add Tier 1 tests incrementally — when you touch a route, add its integration tests alongside the change. Defer Tiers 2-4 until their prerequisites are met or bugs drive the need.
