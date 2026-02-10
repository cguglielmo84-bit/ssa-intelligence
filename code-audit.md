You are performing an exhaustive quality audit of the SSA Intelligence application.
This is a full-stack system:
- backend/: Express API, orchestration logic, LLM prompts, Prisma schema + DB
- frontend/: Vite + React UI workspace
- docs/: product and system documentation
- research-guides/: section-level research guides (docx/js)
- artifacts/: historical logs and run outputs

## Your Mission

Produce a file called test-plan.md that is the single most thorough test plan
anyone has ever written for this application. Spare no detail. This plan will be
handed to an agent team of 8 specialists who will execute it in parallel.

## How to Work

1. **Read everything.** Start by mapping the full repository structure. Read every
   file in backend/, frontend/src/, docs/, and the Prisma schema. Do not skip
   configuration files, environment examples, middleware, utilities, or tests that
   already exist. You need total understanding before writing a single line of the
   plan.

2. **Trace every data flow.** For each API endpoint, trace the request from the
   frontend component → API route → controller/service → database → LLM call (if
   any) → response → frontend rendering. Document each flow.

3. **Catalog every feature.** List every user-facing feature, every background
   process, every integration point. Miss nothing.

4. **Identify every risk.** For each feature and flow, identify what could go wrong:
   crashes, silent failures, data corruption, race conditions, incorrect output,
   poor UX, security vulnerabilities.

## test-plan.md Structure

### Section 1: Architecture Map
- Directory structure (annotated with purpose of each file)
- Database schema summary (every model, every relation, every field)
- API endpoint catalog (method, path, auth, request/response shapes)
- Frontend route map (every page, what components it uses, what APIs it calls)
- LLM integration points (every prompt template, what triggers it, what it returns)
- Background processes / scheduled tasks (if any)
- External service dependencies (APIs, email, storage, etc.)

### Section 2: Data Flow Traces
For each major user workflow, provide a numbered step-by-step trace:
1. User action in UI
2. Frontend state change / API call
3. Backend route handler
4. Business logic / orchestration
5. Database operations
6. LLM calls (prompt template used, expected response shape)
7. Response processing
8. Frontend state update / re-render
9. What the user sees

Cover at minimum:
- Creating a new research brief / report
- Selecting report type and how prompts adapt
- Running the research generation pipeline
- Viewing / editing generated content
- Exporting or sharing results
- Any CRUD operations on supporting entities (clients, templates, etc.)
- Authentication and authorization flow
- Error recovery flows

### Section 3: Test Matrix
Organize as a table with these columns:
| ID | Category | Feature/Flow | Test Description | Expected Result | Priority | Assigned Team |

Categories:
- **AUTH**: Authentication, authorization, session management, RBAC
- **API**: Every endpoint — happy path, validation, error responses, edge cases
- **DB**: Schema integrity, migrations, relationships, cascade behavior, data
  consistency under concurrent writes
- **LLM**: Prompt construction, response parsing, error handling when LLM fails
  or returns malformed output, token limits, timeout handling, report-type
  routing
- **ORCH**: Orchestration logic — the pipeline that coordinates multi-step
  research generation. Partial failures, retries, state management between steps
- **UI-FUNC**: Every interactive element — buttons, forms, dropdowns, modals,
  navigation, keyboard shortcuts
- **UI-STATE**: State management — does the UI correctly reflect backend state?
  Stale data? Optimistic updates? Loading/error states?
- **UI-RENDER**: Visual rendering — layout breaks, responsive behavior, empty
  states, long content overflow, special characters
- **FILE**: File handling — upload, download, generation of docx/research
  guides, parsing, large files, corrupt files, unsupported formats
- **EDGE**: Edge cases — empty inputs, maximum lengths, special characters,
  unicode, concurrent operations, rapid repeated actions, browser back/forward
- **PERF**: Performance — large datasets, many concurrent requests, LLM timeout
  handling, memory leaks in long sessions
- **SEC**: Security — injection (SQL, XSS, prompt injection), auth bypass,
  CORS, rate limiting, secrets exposure, file path traversal
- **CONFIG**: Environment configuration — missing env vars, invalid config,
  development vs production behavior
- **ERROR**: Error handling — every try/catch, every .catch(), every error
  boundary. Does the user see a helpful message? Are errors logged? Do errors
  cascade?
- **REGRESSION**: Patterns that commonly break — hardcoded counts, stale
  closures, missing dependency arrays in useEffect, off-by-one errors

### Section 4: Critical Risk Areas
List the top 20 highest-risk areas ranked by (likelihood of bug) × (severity if
it occurs). For each:
- What could go wrong
- Why it's high-risk
- Specific code locations to scrutinize
- Recommended test approach

### Section 5: Team Assignments
Pre-assign every test in the matrix to one of these 8 teams:
1. backend-api — Express routes, middleware, validation
2. database — Prisma schema, queries, data integrity
3. llm-pipeline — Prompt construction, LLM calls, response parsing, orchestration
4. frontend-components — React components, user interactions, forms
5. frontend-state — State management, API integration, data flow
6. security — Auth, injection, CORS, secrets, access control
7. edge-cases — Boundary conditions, error paths, concurrent operations
8. integration — End-to-end flows, cross-layer behavior, file I/O

Each test should be assigned to exactly one team. Where a test spans layers,
assign it to the team best positioned to catch the issue and note cross-team
dependencies.

### Section 6: Execution Order
Define the order teams should execute in. Some teams can run in parallel, others
have dependencies. Create a dependency graph.

Be absolutely exhaustive. The test-plan.md should be the kind of document that,
if every test passes, gives us near-certainty the application is production-ready.
I expect at minimum 200+ individual test cases across all categories.

Save the plan as test-plan.md in the project root.