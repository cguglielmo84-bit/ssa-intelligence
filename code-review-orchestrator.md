Read the test-plan.md file I just created. You are the team lead. Your job is
to orchestrate a comprehensive QA review of this entire application.

Create an agent team called "ssa-qa" with 8 teammates. Use Sonnet for all
teammates to manage costs — the volume of work matters more than per-task
reasoning depth here.

## Team Roster & Instructions

Each teammate gets their assigned tests from test-plan.md Section 5. Every
teammate must follow this protocol:

### Universal Protocol (include in every teammate spawn)
- Read test-plan.md first to understand your assigned scope
- Read CLAUDE.md if it exists for project conventions
- For every test case assigned to you, actually verify it by reading the
  relevant source code. Do not guess or assume — READ THE CODE.
- Document every finding in this format:

  **[SEVERITY] [CATEGORY-ID] Short description**
  - File: path/to/file.ts
  - Line: ~N
  - What's wrong: description of the issue
  - Evidence: the specific code that's problematic (quote it)
  - Impact: what happens to the user or system
  - Suggested fix: how to fix it
  - Related tests: other test IDs this affects

  Severity levels:
  - 🔴 P0-CRITICAL: Crash, data loss, security vulnerability, complete
    feature failure
  - 🟠 P1-HIGH: Feature partially broken, incorrect output, data
    inconsistency
  - 🟡 P2-MEDIUM: Poor error handling, missing validation, bad UX on
    error paths
  - 🟢 P3-LOW: Cosmetic, minor UX, code quality, potential future issue

- When you finish all your assigned tests, write your findings to a file:
  qa-report-{your-team-name}.md
- Message the lead when done with a summary count of findings by severity

## Teammate Definitions

### 1. backend-api
Focus: Express routes, middleware, request validation, response formatting,
error handling in API layer.

Specific instructions:
- Read every file in backend/routes/ (or equivalent)
- For each endpoint: verify input validation exists AND is correct
- Check every error handler — does it return appropriate status codes and
  messages? Does it leak internal details?
- Verify middleware chain is correct (auth, validation, error handling order)
- Check for missing try/catch blocks around async operations
- Verify request body/query/param parsing handles malformed input
- Check rate limiting configuration
- Look for endpoints that should require auth but don't
- Check response consistency — same shape for success and error across all
  endpoints?
- Verify CORS configuration is restrictive enough
- Check for any raw SQL or string interpolation in queries

### 2. database
Focus: Prisma schema, database queries, data integrity, migrations.

Specific instructions:
- Read the full Prisma schema — every model, field, relation, index, enum
- Check for missing indexes on frequently queried fields
- Verify cascade delete behavior — are there orphaned records possible?
- Check every Prisma query in the codebase (grep for prisma.) — are they
  handling errors? Are they using transactions where needed?
- Look for N+1 query patterns (loading relations in loops)
- Check for race conditions in concurrent writes (two users editing same
  entity)
- Verify required vs optional fields match the business logic expectations
- Check that unique constraints exist where business rules demand uniqueness
- Look for any raw database queries that bypass Prisma's type safety
- Check migration files for correctness if they exist
- Verify seed data or initialization logic

### 3. llm-pipeline
Focus: LLM prompt construction, API calls, response parsing, orchestration
pipeline, report-type routing.

Specific instructions:
- Read every prompt template in the codebase (check backend/prompts/,
  docs/prompting/, and any inline prompts)
- Verify prompt construction handles all report types correctly
- Check: what happens when the LLM returns malformed output? Is there
  parsing with error handling?
- Check: what happens when the LLM call times out? Is there retry logic?
  Exponential backoff?
- Check: what happens when the LLM returns an empty response?
- Check: are token limits being respected? What happens when input exceeds
  the context window?
- Trace the full orchestration pipeline — how are multi-step research
  generations coordinated? What if step 3 of 5 fails?
- Check for prompt injection vulnerabilities — can user input manipulate
  the system prompt?
- Verify that report-type selection actually changes the prompt behavior
  (not just cosmetic)
- Check LLM response caching — is it implemented? If so, are cache keys
  correct?
- Look at how research guides (docx) are loaded and used in prompts
- Check for hardcoded model names, API keys in source, or missing
  environment variable handling
- MESSAGE the backend-api teammate if you find issues in how the API layer
  handles LLM-related errors
- MESSAGE the frontend-state teammate about any response shapes that might
  cause UI issues

### 4. frontend-components
Focus: React components, JSX rendering, user interactions, forms, modals,
visual correctness.

Specific instructions:
- Read every component in frontend/src/
- Check every form: validation, submission handling, error display, loading
  states, disabled states during submission
- Check every button: does it have a loading/disabled state? Can it be
  double-clicked?
- Check every modal/dialog: can it be closed? Does closing cancel in-flight
  requests? Is focus trapped?
- Check every list/table: empty state, loading state, error state, pagination,
  overflow handling for long content
- Check responsive behavior — are there hardcoded widths that break on
  small screens?
- Check text overflow — what happens with very long report titles, client
  names, LLM output?
- Check for missing key props on mapped elements
- Check accessibility: are interactive elements keyboard accessible? Do
  images have alt text? Are form labels associated with inputs?
- Look for console.log or debugger statements left in production code
- Check if error boundaries exist — what happens when a component crashes?

### 5. frontend-state
Focus: State management, API integration layer, data synchronization between
frontend and backend.

Specific instructions:
- Identify the state management approach (Redux, Zustand, Context, React
  Query, etc.)
- For every API call in the frontend: check error handling, loading states,
  retry logic
- Check for stale data issues — after a mutation, does the UI refetch or
  update optimistically? Is it correct?
- Check every useEffect: are dependency arrays correct? Are there missing
  dependencies that cause stale closures?
- Check every useState: are there state updates that should be batched?
  Race conditions between rapid state changes?
- Check for memory leaks: are subscriptions/intervals cleaned up in useEffect
  return functions?
- Check navigation: does browser back/forward work correctly? Is state
  preserved or reset as appropriate?
- Check what happens when the user's session expires mid-workflow — is there
  graceful handling or a crash?
- Verify that long-running operations (research generation) have proper
  progress indication and can handle page refresh
- MESSAGE the frontend-components teammate about any state issues that
  would cause visual bugs
- MESSAGE the llm-pipeline teammate to confirm response shapes match what
  the frontend expects

### 6. security
Focus: Authentication, authorization, injection vectors, secrets management,
access control.

Specific instructions:
- Read the full auth implementation — login, registration, session/token
  management, password handling
- Check every protected route — is the auth middleware actually applied?
- Check for IDOR (Insecure Direct Object Reference) — can user A access
  user B's resources by changing an ID in the URL/request?
- Check for XSS: is user-generated content sanitized before rendering? What
  about LLM output rendered in the UI?
- Check for SQL/NoSQL injection: are all database queries parameterized?
- Check for prompt injection: can user input escape the prompt template and
  override system instructions?
- Check for CSRF protection
- Check CORS configuration — is it overly permissive?
- Check for secrets in source code (grep for API keys, passwords, tokens,
  connection strings)
- Check .env.example vs actual .env handling — are all required vars
  validated at startup?
- Check for path traversal in file operations — can a user request
  ../../etc/passwd?
- Check rate limiting on auth endpoints (login, registration, password
  reset)
- Check JWT implementation (if used): expiration, refresh token rotation,
  algorithm confusion
- Check for information leakage in error responses (stack traces, internal
  paths, database details)
- MESSAGE the backend-api teammate about any endpoints missing auth
- MESSAGE the llm-pipeline teammate about prompt injection findings

### 7. edge-cases
Focus: Boundary conditions, error paths, concurrent operations, unusual input.

Specific instructions:
- For every text input in the system, check: empty string, whitespace only,
  very long string (10K+ chars), special characters (<, >, ", ', `, \),
  unicode (emoji, RTL text, CJK characters), null/undefined
- For every numeric input: 0, negative, very large, float vs int, NaN,
  Infinity
- For every array/list: empty, single item, very many items (1000+)
- For every file operation: file doesn't exist, file is empty, file is
  very large, file is corrupt/wrong format, filename with spaces and special
  characters
- Check concurrent operations: what happens if two research generations
  run simultaneously? Two users edit the same brief?
- Check rapid repeated actions: clicking "generate" 5 times fast, submitting
  a form while it's already submitting
- Check interruption scenarios: closing the browser mid-generation, losing
  network connection, server restart during long operation
- Check timezone handling: are dates stored/displayed consistently?
- Check what happens when external services are unavailable: LLM API down,
  database connection lost
- Look for hardcoded limits or magic numbers that might break as data grows
- Check for off-by-one errors in any indexing or pagination logic
- MESSAGE other teammates when you find edge cases relevant to their domain

### 8. integration
Focus: End-to-end flows, cross-layer behavior, file I/O, deployment config.

Specific instructions:
- Trace every major user workflow end-to-end by reading the code path from
  UI click to database write to UI update
- Verify that the frontend's API client matches the backend's actual endpoint
  signatures (URL, method, body shape, response shape)
- Check file generation — are research guides (docx) actually generated
  correctly? Read the docx generation code thoroughly
- Check file uploads — size limits, type validation, storage location,
  cleanup
- Check environment configuration: are there differences between development
  and production that could cause bugs? (different base URLs, different
  CORS, different database)
- Verify build configuration: does the Vite build produce correct output?
  Are there import issues, missing environment variables in the build?
- Check for dependency version conflicts or known vulnerabilities in
  package.json / package-lock.json
- Check deployment scripts or Docker configuration if present
- Verify that the frontend's proxy configuration (for dev) and production
  API URL configuration are correct
- Check for any TODO, FIXME, HACK, or XXX comments that indicate known
  issues
- Run `npm audit` (or equivalent) and report findings
- Check TypeScript compilation — any type errors being suppressed with
  @ts-ignore or `as any`?
- MESSAGE all teammates with cross-cutting findings

## Coordination Rules

- Team lead (you): Monitor progress. When a teammate finishes, review their
  report. If you see patterns across multiple reports, message relevant
  teammates to investigate further.
- Teammates: Work through your assigned tests methodically. Don't rush.
  Actually read the code for each test — this is a review, not a skim.
- Cross-team communication: If you find something in another team's domain,
  message them about it rather than investigating it yourself. Stay in your
  lane but share discoveries.
- Conflict resolution: If two teammates disagree about whether something is
  a bug, the team lead decides.

## Final Deliverable

After all teammates have submitted their reports, synthesize everything into
a single file called MASTER-QA-REPORT.md with:

1. **Executive Summary**: Total findings by severity, overall assessment of
   application health, top 5 most critical issues
2. **Critical Issues (P0)**: Must fix before any release
3. **High Issues (P1)**: Should fix before release
4. **Medium Issues (P2)**: Fix in next sprint
5. **Low Issues (P3)**: Backlog
6. **Cross-Cutting Patterns**: Systemic issues that appear across multiple
   areas (e.g., "error handling is consistently missing in X pattern")
7. **Positive Findings**: Things that are well-implemented and should be
   preserved
8. **Recommended Fix Order**: Prioritized list considering dependencies
   between fixes

Save MASTER-QA-REPORT.md to the project root.