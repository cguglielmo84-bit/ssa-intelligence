# Backend API & Database -- QA Audit Findings

> **Auditor:** backend teammate
> **Date:** 2026-02-10
> **Scope:** DB-001 to DB-015, API-001 to API-113, ERROR-001/002, REG-001/002/005

---

## Executive Summary

Audited all backend API endpoints and the Prisma schema against the exhaustive test plan (225+ test cases). The codebase is generally well-structured with consistent patterns. Found **12 issues** total: 1 P0 (critical), 3 P1 (high), 4 P2 (medium), plus 1 cross-cutting security concern (SEC-009).

The most critical finding is an **inconsistent section number mapping between list.ts and detail.ts** (REG-001), which causes the frontend to show different section numbers for the same completed sections depending on which endpoint it reads from.

Additionally, all news API endpoints (API-076 through API-113) operate without authentication (SEC-009), exposing destructive and expensive operations to unauthenticated callers.

---

## Findings

### Finding 1 -- REG-001: Section Number Mapping Inconsistency Between list.ts and detail.ts

- **Severity:** P0 (critical)
- **Test Case:** REG-001
- **File:** `backend/src/api/research/list.ts` (lines 132-143) and `backend/src/api/research/detail.ts` (lines 121-133)
- **What's wrong:** The `sectionMap` used to compute `generatedSections` and `completedSections` (respectively) differs between the two files. In `list.ts`, the map goes from exec_summary=1 through appendix=10, skipping `key_execs_and_board` entirely. In `detail.ts`, the map includes `key_execs_and_board=4` which shifts all subsequent section numbers up by one (segment_analysis=5, trends=6, etc. through appendix=11).

  **list.ts sectionMap:**
  ```
  exec_summary: 1, financial_snapshot: 2, company_overview: 3,
  segment_analysis: 4, trends: 5, peer_benchmarking: 6,
  sku_opportunities: 7, recent_news: 8, conversation_starters: 9, appendix: 10
  ```

  **detail.ts sectionMap:**
  ```
  exec_summary: 1, financial_snapshot: 2, company_overview: 3,
  key_execs_and_board: 4, segment_analysis: 5, trends: 6,
  peer_benchmarking: 7, sku_opportunities: 8, recent_news: 9,
  conversation_starters: 10, appendix: 11
  ```

- **Impact:** The `generatedSections` array from the list endpoint and `sectionsCompleted` from the detail endpoint produce different numbers for the same stages. For example, if `segment_analysis` is complete, the list shows it as section 4 while detail shows it as section 5. Frontend code relying on these numbers for section navigation or display will be inconsistent. Furthermore, `key_execs_and_board` completions are silently dropped from the list endpoint (mapped to 0 and filtered out).
- **Suggested fix:** Unify both maps to use the same numbering. The detail.ts version (with key_execs_and_board) appears more correct since it accounts for all stages. Extract the shared map to a constants file.

---

### Finding 2 -- REG-002: Derived Status Logic Gap

- **Severity:** P1 (high)
- **Test Case:** REG-002
- **File:** `backend/src/api/research/status-utils.ts` (lines 8-44)
- **What's wrong:** The `deriveJobStatus` function has a logic gap. When the stored `status` is `'running'` but all sub-jobs are completed (terminal, no failures), the function falls through to the final `return status` which returns `'running'` instead of `'completed'`. This can happen if the orchestrator crashes between completing the last sub-job and updating the parent job's status.

  Specifically, the check at line 35 (`if (isTerminal && hasCompleted)`) will correctly return `'completed'` -- BUT only if the `status !== 'running'` check passes first. Since `status === 'running'` does not match `'cancelled'` or `'failed'`, it will skip line 19 and proceed correctly. On closer inspection, this actually works correctly because `isTerminal=true`, `hasFailed=false`, `hasCompleted=true` leads to the line 35 return. **Revised: This test case PASSES.**

- **Impact:** N/A -- false alarm after closer analysis. The derived status function correctly handles this case.
- **Status:** PASS (no issue)

---

### Finding 3 -- REG-005: Sent/Archived Mutual Exclusion (Verified)

- **Severity:** P3 (low / PASS)
- **Test Case:** REG-005
- **File:** `backend/src/api/news/articles.ts` (lines 164-224)
- **What's wrong:** The implementation correctly enforces mutual exclusion:
  - Marking as sent (line 183): `isArchived: newIsSent ? false : article.isArchived`
  - Marking as archived (line 215): `isSent: newIsArchived ? false : article.isSent`
  - Bulk archive (line 239): `{ isArchived: true, isSent: false }`
  - Bulk send (line 261): `{ isSent: true, isArchived: false }`
- **Status:** PASS

---

### Finding 4 -- ERROR-001: Global Error Handler Leaks Error Details in Production

- **Severity:** P2 (medium)
- **Test Case:** ERROR-001
- **File:** `backend/src/index.ts` (lines 289-296)
- **What's wrong:** The global error handler correctly distinguishes dev vs production:
  ```typescript
  message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  ```
  However, many individual route handlers include `error instanceof Error ? error.message : 'Unknown error'` in their 500 responses regardless of environment. For example:
  - `generate.ts` line 293: `message: error instanceof Error ? error.message : 'Unknown error'`
  - `list.ts` line 167: same pattern
  - `detail.ts` line 189: same pattern
  - `status.ts` line 112: same pattern
  - `cancel.ts` line 70: same pattern
  - `delete.ts` line 36: same pattern
  - `rerun.ts` line 159: same pattern

  These catch blocks respond before the global error handler fires, so the production-mode protection in the global handler is bypassed.

- **Problematic code (example from generate.ts):**
  ```typescript
  } catch (error) {
    console.error('Error creating research job:', error);
    return res.status(500).json({
      error: 'Failed to create research job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  ```

- **Impact:** In production, internal error messages (which may contain database connection strings, file paths, or other sensitive information) could leak to API consumers. This violates SEC-010.
- **Suggested fix:** Wrap the message field in a NODE_ENV check, or remove the `message` field from 500 responses in production.

---

### Finding 5 -- ERROR-002: No Global Prisma P2025 Handling

- **Severity:** P2 (medium)
- **Test Case:** ERROR-002
- **File:** Multiple route handlers
- **What's wrong:** Only `backend/src/api/admin/groups.ts` (line 160) handles Prisma P2025 (record not found) errors explicitly:
  ```typescript
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
    return res.status(404).json({ error: 'Group not found' });
  }
  ```
  Other handlers that perform delete/update operations do not handle P2025, meaning a concurrent delete+update race will result in a 500 error instead of a clean 404. Affected endpoints:
  - `delete.ts` line 30: `prisma.researchJob.delete` -- no P2025 catch
  - `feedback.ts` lines 215, 253: `prisma.feedback.update/delete` -- no P2025 catch
  - `admin/users.ts` line 228: `prisma.user.delete` -- no P2025 catch
  - `admin/pricing.ts` line 152, 189: update/delete -- no P2025 catch
  - News article delete, company delete, person delete -- none handle P2025

- **Impact:** Race conditions between concurrent requests (e.g., two admins deleting the same user simultaneously) produce 500 errors instead of clean 404s. The application doesn't crash, but produces confusing error responses.
- **Suggested fix:** Add a shared utility that wraps Prisma operations and converts P2025 to 404 responses, or add P2025 handling in each catch block.

---

### Finding 6 -- API-005/API-007: Duplicate Detection Uses OR Logic That Can Miss True Duplicates

- **Severity:** P1 (high)
- **Test Case:** API-005, API-007
- **File:** `backend/src/api/research/generate.ts` (lines 195-215)
- **What's wrong:** The duplicate detection query uses an OR clause that matches on *either* normalized keys *or* raw display values:
  ```typescript
  OR: [
    {
      normalizedCompany: normalizedCompanyKey,
      normalizedGeography: normalizedGeoKey,
      normalizedIndustry: normalizedIndustryKey
    },
    {
      companyName: companyName,
      geography: geography,
      industry: industry || null
    }
  ]
  ```
  The comment says "normalize safeguard: fall back to raw match if columns not present yet", suggesting this was a migration compatibility shim. The second branch matches on the **title-cased** display values, not the normalized lowercase values. This means:
  - Input "apple" normalizes to key "apple" and display "Apple"
  - An existing job with companyName "APPLE" (display) and normalizedCompany "apple" would be caught by the first branch
  - But an existing job with companyName "Apple Inc" and normalizedCompany "apple inc" would NOT be caught if the new input is "apple inc" (because display becomes "Apple Inc" matching branch 2, which works). However, there is no `@@unique` constraint on the display fields, so the OR fallback to raw match doesn't provide DB-level protection.

  More critically, the `status: { in: ['queued', 'running', 'completed'] }` filter means jobs with `completed_with_errors` status are **not** detected as duplicates. A user could submit a new job for a company that already has a `completed_with_errors` report, bypassing the duplicate check entirely.

- **Impact:** Users can create duplicate jobs for companies with `completed_with_errors` status. The force-flag bypass also doesn't cover this status, potentially causing confusion.
- **Suggested fix:** Add `'completed_with_errors'` to the status filter: `status: { in: ['queued', 'running', 'completed', 'completed_with_errors'] }`.

---

### Finding 7 -- API-020: Cancel Deletes Job Instead of Updating Status

- **Severity:** P2 (medium)
- **Test Case:** API-020
- **File:** `backend/src/api/research/cancel.ts` (lines 38-49)
- **What's wrong:** The cancel endpoint **deletes** the job, sub-jobs, and job-groups from the database entirely, rather than setting the job status to 'cancelled'. This means:
  1. The job disappears from the user's list immediately (no audit trail)
  2. Any CostEvents linked to the job via `jobId` will have their `jobId` set to null (due to `onDelete: SetNull` on CostEvent), orphaning cost data
  3. The user cannot see that they previously cancelled a job for that company

  The test plan expects "Job + subJobs deleted, queue restarted" which matches the implementation, but this is a design concern rather than a bug per se. The `status-utils.ts` has handling for `status === 'cancelled'` (line 19) which would never be reached since cancelled jobs are deleted.

- **Impact:** Loss of audit trail for cancelled jobs. Cost tracking data is orphaned. Dead code in status-utils for 'cancelled' status.
- **Suggested fix:** Consider soft-cancellation (set status='cancelled') instead of hard delete, which preserves cost data and audit trail.

---

### Finding 8 -- DB-011: TrackedCompany Delete Does Not Cascade to NewsArticle

- **Severity:** P1 (high)
- **Test Case:** DB-011
- **File:** `backend/prisma/schema.prisma` (lines 403-404)
- **What's wrong:** The `NewsArticle.company` relation does NOT have `onDelete: Cascade` or `onDelete: SetNull` specified:
  ```prisma
  company      TrackedCompany?  @relation(fields: [companyId], references: [id])
  companyId    String?          @map("company_id")
  ```
  Similarly for `person` and `tag`:
  ```prisma
  person       TrackedPerson?   @relation(fields: [personId], references: [id])
  tag          NewsTag?         @relation(fields: [tagId], references: [id])
  ```
  The test plan expects "articles.companyId set null" when a TrackedCompany is deleted, but without an explicit `onDelete` directive, Prisma's default behavior depends on the database. PostgreSQL will typically raise a foreign key violation error, preventing the delete entirely.

  Meanwhile, `TrackedPerson` -> `NewsArticle` at `schema.prisma` line 323 has `onDelete: SetNull` on the TrackedPerson side, but that's for the reverse direction (TrackedPerson.company -> TrackedCompany).

  Looking more carefully: The `companies.ts` delete handler (line 155) does `prisma.trackedCompany.delete({ where: { id } })`. If there are NewsArticles referencing this company, this will fail with a foreign key constraint error. The `CallDietCompany` relation has `onDelete: Cascade` which is fine. But the `NewsArticle` relation lacks it.

  **However**, looking at the `NewsTag` model, the `articles` relation also lacks `onDelete` specification. The `tags.ts` delete handler at line 95 does `prisma.newsTag.delete({ where: { id } })` which would also fail if articles reference that tag.

- **Impact:** Deleting a TrackedCompany, TrackedPerson (for articles), or NewsTag that has associated articles will fail with a database error (500 response) rather than gracefully unlinking. The `people.ts` delete handler will similarly fail for TrackedPerson if any NewsArticle references it via `personId`.
- **Suggested fix:** Add `onDelete: SetNull` to the `NewsArticle.company`, `NewsArticle.person`, and `NewsArticle.tag` relations in the schema, then run a migration.

---

### Finding 9 -- API-003: companyName Minimum Length Validation is 2, Not Rejecting Single-Char

- **Severity:** P3 (low / PASS)
- **Test Case:** API-003
- **File:** `backend/src/api/research/generate.ts` (line 74)
- **What's wrong:** The validation checks `normalizedCompany.length < 2`, which correctly rejects single-character names like "A". The test expects a 400 error for `companyName="A"`.
- **Status:** PASS -- works as expected.

---

### Finding 10 -- API-009: Missing Dependencies Return 400, Not Auto-Expanded

- **Severity:** P2 (medium)
- **Test Case:** API-009
- **File:** `backend/src/api/research/generate.ts` (lines 141-153)
- **What's wrong:** The test plan says "Dependencies auto-expanded or 400". The implementation **only** returns 400 with "Missing required dependencies" -- it does NOT auto-expand. If a user selects `exec_summary` without including `foundation`, `financial_snapshot`, and `company_overview`, they get an error instead of having dependencies automatically included.

  ```typescript
  const missingDependencies = selectedSections.flatMap((sectionId) => {
    const deps = dependencyMap.get(sectionId) || [];
    return deps.filter((dep) => !selectedSections.includes(dep));
  });
  if (missingDependencies.length) {
    const uniqueMissing = Array.from(new Set(missingDependencies));
    return res.status(400).json({
      error: `Missing required dependencies: ${uniqueMissing.join(', ')}`
    });
  }
  ```

  The test plan's data flow trace (Section 2.1) states "Expand selectedSections with dependencies (dependency-utils)" which implies auto-expansion was intended. The frontend may handle this, but the API itself does not.

- **Impact:** API consumers that don't pre-compute dependencies will get confusing 400 errors. The frontend may compensate, but direct API callers (e.g., API keys, scripts) will be affected.
- **Suggested fix:** Auto-expand selectedSections to include missing dependencies before validation, matching the documented data flow. Return the expanded list in the response.

---

### Finding 11 -- API-038: Feedback Message Minimum Length is 10 Characters

- **Severity:** P3 (low / PASS)
- **Test Case:** API-038
- **File:** `backend/src/api/feedback.ts` (lines 57-59)
- **Status:** PASS -- correctly rejects messages shorter than 10 characters with "Description must be at least 10 characters."

---

### Finding 12 -- DB-012: TrackedPerson Delete -- SetNull for Company But Not for NewsArticle

- **Severity:** P1 (high)
- **Test Case:** DB-012
- **File:** `backend/prisma/schema.prisma` (lines 315-329 and 403-408)
- **What's wrong:** The `TrackedPerson.company` relation has `onDelete: SetNull` (line 323), meaning when a TrackedCompany is deleted, the person's `companyId` is set to null. However, `NewsArticle.person` (line 405) does NOT specify `onDelete`, so deleting a TrackedPerson that has associated articles will fail with a FK violation.

  This is the same class of issue as Finding 8 but for the person dimension.

- **Impact:** Deleting a tracked person with news articles will fail with a 500 error.
- **Suggested fix:** Add `onDelete: SetNull` to `NewsArticle.person` and `NewsArticle.tag` relations.

---

### Finding 13 -- API-064: No Check for Inactive Pricing Rate on Update (Negative Rate Validation)

- **Severity:** P2 (medium)
- **Test Case:** API-062, API-064
- **File:** `backend/src/api/admin/pricing.ts` (lines 134-146)
- **What's wrong:** The `updatePricingRate` handler silently ignores invalid rate values instead of returning a 400 error. If a user sends `inputRate=-5`, the validation at line 135 (`typeof inputRate === 'number' && inputRate >= 0`) evaluates to false, so `inputRate` is simply not included in `updateData`. This means the update succeeds (200) but the rate is unchanged -- the user gets no feedback that their negative value was rejected.

  Contrast with `createPricingRate` (line 56) which explicitly returns 400: `'inputRate must be a non-negative number'`.

- **Impact:** Confusing UX -- admin thinks they updated a rate but it silently remained unchanged. No error feedback for invalid values during update.
- **Suggested fix:** Add explicit validation with 400 responses for negative values in the update handler, matching the create handler's behavior.

---

## Database Schema Audit (DB-001 through DB-015)

### Passing Tests

| Test ID | Description | Status |
|---------|-------------|--------|
| DB-001 | Unique: ResearchJob (userId+normalizedCompany+normalizedGeography+normalizedIndustry+reportType) | PASS -- `@@unique` at line 86 |
| DB-002 | Unique: ResearchSubJob (researchId+stage) | PASS -- `@@unique` at line 124 |
| DB-003 | Unique: User email | PASS -- `@unique` at line 132 |
| DB-004 | Unique: Group slug | PASS -- `@unique` at line 150 |
| DB-005 | Unique: GroupMembership (userId+groupId) | PASS -- `@@unique` at line 169 |
| DB-006 | Unique: NewsArticle sourceUrl | PASS -- `@unique` at line 395 |
| DB-007 | Cascade: User -> ResearchJob | PASS -- `onDelete: Cascade` at line 61 |
| DB-008 | Cascade: ResearchJob -> SubJobs | PASS -- `onDelete: Cascade` at line 95 |
| DB-009 | Cascade: Group -> Memberships/JobGroups | PASS -- `onDelete: Cascade` at lines 167, 181 |
| DB-010 | Cascade: RevenueOwner -> CallDiet | PASS -- `onDelete: Cascade` on all CallDiet* models |
| DB-013 | Index: [userId, status] on ResearchJob | PASS -- `@@index` at line 78 |
| DB-014 | Unique: Prompt (sectionId+reportType+version) | PASS -- `@@unique` at line 487 |
| DB-015 | CostEvent draftId linkage | PASS -- `draftId` field with `@@index([draftId])` at line 584 |

### Failing Tests

| Test ID | Description | Status | Finding |
|---------|-------------|--------|---------|
| DB-011 | Cascade: TrackedCompany -> articles unlinked | **FAIL** | Finding 8 -- No onDelete specified |
| DB-012 | Cascade: TrackedPerson -> articles set null | **FAIL** | Finding 12 -- No onDelete specified |

---

## API Endpoint Audit (API-001 through API-113)

### Research API (API-001 to API-030)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-001 | PASS | 201 with jobId returned |
| API-002 | PASS | 400 "Missing or invalid companyName" |
| API-003 | PASS | 400 for length < 2 |
| API-004 | PASS | 400 "Invalid reportType" |
| API-005 | **PARTIAL** | Duplicate detection works but misses `completed_with_errors` (Finding 6) |
| API-006 | PASS | force=true with completed job creates new job |
| API-007 | PASS | force=true with running job returns 409 |
| API-008 | PASS | 400 "Invalid selectedSections" |
| API-009 | **DEVIATION** | Returns 400 instead of auto-expanding (Finding 10) |
| API-010 | PASS | 400 "groupIds required for GROUP visibility" |
| API-011 | PASS | Missing required inputs returns 400 |
| API-012 | PASS | List with pagination works |
| API-013 | PASS | limit/offset pagination works |
| API-014 | PASS | Status filter via derived status |
| API-015 | PASS | Sort by companyName/createdAt |
| API-016 | PASS | Full detail with sections, sources |
| API-017 | PASS | 404 for invalid ID |
| API-018 | PASS | Status with progress and subJobs |
| API-019 | PASS | Queue position computed |
| API-020 | **NOTE** | Cancel deletes instead of status update (Finding 7) |
| API-021 | PASS | 400 "Job already completed" |
| API-022 | PASS | 200 {success: true} |
| API-023 | PASS | 400 "Cannot delete a running or queued job" |
| API-024 | PASS | Rerun with stage reset |
| API-025 | PASS | 400 "sections must be a non-empty array" |
| API-026 | PASS | 400 "Invalid sections" |
| API-027 | PASS | 400 "Job is already running or queued" |
| API-028 | PASS | PDF export with Playwright |
| API-029 | PASS | 400 "Report is not ready to export yet" |
| API-030 | PASS | Blueprints returned |

### User Context & Health (API-031 to API-045)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-031 | PASS | /me returns user with isAdmin, groups |
| API-032 | PASS | /groups returns user's groups |
| API-033 | PASS | Company resolve with Claude |
| API-034 | PASS | 400 for short input |
| API-035 | PASS | Timeout with graceful degradation (returns unknown status) |
| API-036 | PASS | 201 with feedback ID |
| API-037 | PASS | 400 "Description/message is required" |
| API-038 | PASS | 400 for short message |
| API-039 | PASS | Paginated feedback list |
| API-040 | PASS | resolvedAt auto-set on status change |
| API-041 | PASS | 200 {success: true} |
| API-042 | PASS | Health returns status=ok, db=true |
| API-043 | PASS | Health returns status=degraded, db=false |
| API-044 | PASS | Returns logoToken |
| API-045 | PASS | 404 handler works |

### Admin Users (API-046 to API-053)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-046 | PASS | Paginated users with groups |
| API-047 | PASS | Create with memberships in transaction |
| API-048 | PASS | 409 "A user with this email already exists" |
| API-049 | PASS | 400 "Email domain not allowed" |
| API-050 | PASS | Update name and role |
| API-051 | PASS | 400 "Cannot demote yourself from admin" |
| API-052 | PASS | 200 {success: true} |
| API-053 | PASS | 400 "Cannot delete yourself" |

### Admin Groups (API-054 to API-059)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-054 | PASS | Groups with member counts |
| API-055 | PASS | Auto-generated slug |
| API-056 | PASS | Caught by Prisma unique constraint |
| API-057 | PASS | Add by email with upsert |
| API-058 | PASS | Delete membership |
| API-059 | PASS | Cascade handled by schema |

### Admin Pricing (API-060 to API-065)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-060 | PASS | Sorted by provider/model |
| API-061 | PASS | Transaction deactivates old, creates new |
| API-062 | PASS on create, **SILENT IGNORE on update** | Finding 13 |
| API-063 | PASS | Cache cleared on update |
| API-064 | PASS | 400 "Cannot update inactive pricing rate" |
| API-065 | PASS | 204 with cache clear |

### Admin Prompts (API-066 to API-075)

| Test ID | Status | Notes |
|---------|--------|-------|
| API-066 | PASS | Grouped by section |
| API-067 | PASS | With version history |
| API-068 | PASS | Version incremented |
| API-069 | PASS | New version created, old archived (if draft) |
| API-070 | PASS | Previous published archived |
| API-071 | PASS | 400 "Prompt is already published" |
| API-072 | PASS | New draft with old content |
| API-073 | PASS | Status set to archived, 204 returned |
| API-074 | PASS | Async execution, 201 returned |
| API-075 | PASS | Returns test run data |

### News Intelligence (API-076 to API-113)

> **Cross-cutting concern (SEC-009):** All 8 `/api/news/*` route groups at `backend/src/index.ts:219-228` are mounted **without authMiddleware**. The code comment reads "No auth for MVP". This means every news endpoint (API-076 through API-113) is accessible to unauthenticated users, including destructive operations (DELETE tags/companies/people/articles/revenue-owners) and expensive operations (POST /news/refresh triggers Claude API calls, POST /news/search triggers Claude web_search). This is an intentional MVP trade-off but represents a significant production risk. See security team finding SEC-009 for full analysis.

| Test ID | Status | Notes |
|---------|--------|-------|
| API-076 | PASS | Tags with counts (no auth required -- SEC-009) |
| API-077 | PASS | 201 with tag |
| API-078 | PASS | 409 "Tag with this name already exists" |
| API-079 | PASS | 400 "Valid category is required" |
| API-080 | PASS | Warning if tag in use |
| API-081 | PASS | Companies with counts |
| API-082 | PASS | 201 with company |
| API-083 | PASS | 409 case-insensitive |
| API-084 | PASS | Update with duplicate check |
| API-085 | **RISK** | Delete will fail if articles exist (Finding 8) |
| API-086 | PASS | People with company relation |
| API-087 | PASS | With resolved company affiliation |
| API-088 | PASS | companyId auto-syncs companyAffiliation |
| API-089 | PASS | Revenue owners with counts |
| API-090 | PASS | Flattened call diet response |
| API-091 | PASS | 201 with owner |
| API-092 | PASS | Update name/email |
| API-093 | PASS | Cascade deletes call diet links |
| API-094 | PASS | Auto-creates TrackedCompany by name |
| API-095 | PASS | Remove from call diet |
| API-096 | PASS | Add person with upsert |
| API-097 | PASS | Add tag with validation |
| API-098 | PASS | Paginated with filters |
| API-099 | PASS | Full detail with revenue owners |
| API-100 | PASS | Mutual exclusion with archive |
| API-101 | PASS | Mutual exclusion with sent |
| API-102 | PASS | Bulk archive with isSent=false |
| API-103 | PASS | Bulk send with isArchived=false |
| API-104 | PASS | Delete article |
| API-105 | PASS | Hybrid fetch with progress |
| API-106 | PASS | 409 "Refresh already in progress" |
| API-107 | PASS | 10-min stale recovery |
| API-108 | PASS | DB-backed refresh status |
| API-109 | PASS | Search returns articles |
| API-110 | PASS | 400 "At least one of company or person is required" |
| API-111 | PASS | PDF export via service |
| API-112 | PASS | Markdown export |
| API-113 | PASS | 404 "Revenue owner not found" |

### Error Handling (ERROR-001 to ERROR-002)

| Test ID | Status | Notes |
|---------|--------|-------|
| ERROR-001 | **PARTIAL** | Global handler works but per-route catches bypass it (Finding 4) |
| ERROR-002 | **PARTIAL** | Only groups.ts handles P2025 (Finding 5) |

### Regression (REG-001, REG-002, REG-005)

| Test ID | Status | Notes |
|---------|--------|-------|
| REG-001 | **FAIL** | Section maps inconsistent (Finding 1) |
| REG-002 | PASS | deriveJobStatus correctly handles all cases |
| REG-005 | PASS | Sent/archived mutual exclusion works |

---

## Summary of Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| P0 (Critical) | 1 | REG-001: Section number mapping inconsistency |
| P1 (High) | 3 | DB-011/DB-012: Missing onDelete on NewsArticle FK relations; API-005: Duplicate detection misses completed_with_errors |
| P2 (Medium) | 4 | ERROR-001: Error message leaks; ERROR-002: No P2025 handling; API-009: No auto-expand; API-062: Silent ignore on update |
| P3 (Low) | 0 | -- |
| PASS | ~105 | Vast majority of test cases pass |

---

## Recommendations (Priority Order)

1. **[P0] Fix section number mapping** -- Extract shared sectionMap to a constants file and use it in both list.ts and detail.ts
2. **[P1] Add onDelete: SetNull** to NewsArticle.company, NewsArticle.person, and NewsArticle.tag relations, run Prisma migration
3. **[P1] Add 'completed_with_errors'** to duplicate detection status filter in generate.ts
4. **[P1/SEC-009] Add authMiddleware to news routes** -- At minimum, protect destructive (DELETE) and expensive (POST /refresh, POST /search) news endpoints. Consider adding authMiddleware to all news routes at `index.ts:219-228` to match the rest of the API surface.
5. **[P2] Wrap error messages** in NODE_ENV check across all route handler catch blocks
6. **[P2] Add shared P2025 error handling** utility for Prisma operations
7. **[P2] Auto-expand dependencies** in generate.ts instead of returning 400
8. **[P2] Add explicit validation** with 400 responses for negative values in pricing update handler
