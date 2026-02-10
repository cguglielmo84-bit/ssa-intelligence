# Integration & Edge-Cases QA Findings

**Auditor:** Integration teammate
**Date:** 2026-02-10
**Scope:** EDGE-001 to EDGE-015, PERF-004, FILE-001 to FILE-006, PERF-001 to PERF-003, PERF-005, CONFIG-001 to CONFIG-006

---

## Edge Cases

### EDGE-001: Empty focusAreas

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 439
- **What's wrong:** Empty `focusAreas` (`[]`) is accepted and stored in the database and metadata without issue. The orchestrator defaults to `input.focusAreas || []` (line 439, 449). The generate endpoint does not validate `focusAreas` content at all -- it passes whatever array the client sends directly through to the orchestrator.
- **Problematic code:**
  ```typescript
  focusAreas: input.focusAreas || [],
  ```
- **Impact:** Low. Empty focus areas degrade prompt quality slightly but cause no crash. The prompts simply won't include focus area context.
- **Suggested fix:** Normalize and validate focusAreas in `generate.ts` (trim whitespace, remove empty strings, optional max count).

---

### EDGE-002: Unicode company name

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/generate.ts`
- **Line:** 32-47, 74
- **What's wrong:** The `normalizeInput` function strips surrounding quotes and collapses whitespace but does not handle Unicode normalization (NFC/NFKC). The `hasMeaningfulChars` check at line 47 (`/[A-Za-z0-9]/`) will reject company names composed entirely of non-Latin characters (e.g., CJK, Cyrillic, Arabic scripts).
- **Problematic code:**
  ```typescript
  const hasMeaningfulChars = (value: string) => /[A-Za-z0-9]/.test(value);
  // ...
  if (!normalizedCompany || normalizedCompany.length < 2 || !hasMeaningfulChars(normalizedCompany)) {
    return res.status(400).json({
      error: 'Missing or invalid companyName. Please provide a valid company name.'
    });
  }
  ```
- **Impact:** Users cannot submit research for companies with non-Latin names (e.g., Japanese, Chinese, Korean companies by their native names). Returns 400 error.
- **Suggested fix:** Use a Unicode-aware regex like `/\p{L}|\p{N}/u` instead of `/[A-Za-z0-9]/`.

---

### EDGE-003: Max pagination (limit > 100)

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/list.ts`
- **Line:** 30-31
- **What's wrong:** The pagination correctly caps `limit` at 100 using `Math.min`. However, negative or non-numeric values for `limit` and `offset` are not validated -- `parseInt` on garbage returns `NaN`, which then flows to `Math.min(NaN, 100)` = `NaN`, resulting in `take: NaN` being passed to Prisma, which may cause unexpected behavior.
- **Problematic code:**
  ```typescript
  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const offset = parseInt(query.offset || '0');
  ```
- **Impact:** Low. Prisma likely ignores/errors on NaN `take` values, but could return all rows or an error. Negative offset would cause Prisma errors.
- **Suggested fix:** Add `Math.max(1, ...)` for limit and `Math.max(0, ...)` for offset, and fallback NaN to defaults.

---

### EDGE-004: Concurrent cancel + execute (race condition) -- P0

- **Severity:** P0
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/cancel.ts`
- **Line:** 38-49
- **What's wrong:** The cancel endpoint performs a hard DELETE of the job and all sub-jobs in a transaction (lines 38-49). Meanwhile, `executeJob` and `executeStage` in the orchestrator check `isJobCancelled` by querying `researchJob.findUnique` (line 1825-1829). If cancel deletes the job while a stage is mid-execution, the orchestrator will get `null` from `findUnique`, treat it as cancelled (line 1829: `return !job || job.status === 'cancelled'`), and attempt to exit. However, **any subsequent `saveStageOutput`, `completeSubJob`, `recordTokenUsage`, or `updateProgress` calls will try to update a now-deleted job**, causing P2025 "Record not found" errors.

  The `tryUpdateJob` helper at line 1832-1848 gracefully swallows P2025 errors for `researchJob`, but the `researchSubJob.updateMany` calls in `saveStageOutput` (line 1098), `completeSubJob` (line 1114), and `handleStageFailure` (lines 1148, 1159) do NOT check for P2025 -- `updateMany` on deleted records simply updates 0 rows without error, so those are safe. However, `recordTokenUsage` (line 1714-1773) uses a `$transaction` that updates both sub-jobs and the job. If the job was just deleted, `prisma.researchJob.update` at line 1758 inside the transaction will throw P2025, which IS caught at line 1768-1769. So this is mostly handled.

  **The real race condition risk:** Between the status check at line 649-654 and the `updateJobStatus(jobId, 'running')` at line 657, the cancel DELETE could execute. The `updateJobStatus` call goes through `tryUpdateJob` which swallows P2025. But immediately after, `executeNextPhase` starts running stages. Each stage's `executeStage` method marks the sub-job as "running" (line 774), builds the prompt (which does `findUnique` at line 876 and throws "Job not found" if null), and calls the Claude API. The "Job not found" error at line 880 would be caught by the outer try/catch at line 852, triggering `handleStageFailure` which tries to update the deleted sub-job -- `findFirst` returns null, so `handleStageFailure` just returns (line 1136).

  **Net assessment:** The code has defensive P2025 handling, but the cancel-during-execution path wastes a Claude API call (expensive LLM call) that starts before the cancellation is detected. The prompt building at line 876-880 will fail fast if job is deleted, but only AFTER the sub-job was marked as "running".

- **Problematic code:**
  ```typescript
  // cancel.ts: Hard deletes the job
  const deleteResult = await prisma.$transaction(async (tx) => {
    const subJobs = await tx.researchSubJob.deleteMany({ where: { researchId: id } });
    const jobGroups = await tx.researchJobGroup.deleteMany({ where: { jobId: id } });
    const jobs = await tx.researchJob.deleteMany({ where: { id } });
    return { subJobs, jobGroups, jobs };
  });
  ```
- **Impact:** Wasted Claude API calls (cost), and although errors are swallowed, concurrent operations on deleted records produce noisy error logs. No data corruption since writes silently fail.
- **Suggested fix:** Change cancel to use a soft-cancel approach: update status to 'cancelled' first (which the orchestrator already checks), then clean up asynchronously. Or add a mutex/flag check before starting Claude API calls.

---

### EDGE-005: Double cancel

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/cancel.ts`
- **Line:** 34-36
- **What's wrong:** First cancel deletes the job entirely. Second cancel will hit the `findFirst` at line 21-24, return `null` (job is deleted), and return 404 "Job not found". This is technically correct behavior but confusing for the user -- they see 404 instead of "Job already cancelled".
- **Problematic code:**
  ```typescript
  if (job.status === 'completed' || job.status === 'failed') {
    return res.status(400).json({ error: 'Job already completed', status: job.status });
  }
  // No check for 'cancelled' since job is hard-deleted
  ```
- **Impact:** Minor UX issue -- double cancel returns 404 instead of a clear "already cancelled" message. Since the cancel performs a DELETE, the second request can't find the job.
- **Suggested fix:** Either use soft-cancel (set status='cancelled') or return a more descriptive error when the job is not found after a cancel attempt.

---

### EDGE-006: Rapid refresh clicks

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/news/refresh.ts`
- **Line:** 96-118
- **What's wrong:** The refresh endpoint uses a database-backed `isRefreshing` flag to prevent concurrent refreshes. Rapid clicks within a very short window (before the DB write at line 138 completes) could bypass the check at line 96. The DB upsert is not atomic with the check -- there's a TOCTOU race between reading `refreshState.isRefreshing` at line 96 and writing the new state at line 138.
- **Problematic code:**
  ```typescript
  if (refreshState.isRefreshing) {
    // stale check...
    res.status(409).json({ error: 'Refresh already in progress', status: refreshState });
    return;
  }
  // ... later:
  refreshState = { ...DEFAULT_STATE, isRefreshing: true, ... };
  await setRefreshState(refreshState); // This write happens AFTER the check
  ```
- **Impact:** Two concurrent refresh operations could start simultaneously, causing duplicate articles in the database (mitigated by upsert on sourceUrl) and doubled API/LLM costs.
- **Suggested fix:** Use a PostgreSQL advisory lock or an atomic compare-and-swap on the `isRefreshing` flag (e.g., `UPDATE ... WHERE value->>'isRefreshing' = 'false'`).

---

### EDGE-007: News zero revenue owners

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/news/refresh.ts`
- **Line:** 157-173
- **What's wrong:** Handled correctly. When there are zero revenue owners, the endpoint returns early with a success response, `articlesFound: 0`, and a helpful message ("No revenue owners configured").
- **Impact:** None -- this edge case is properly handled.
- **Suggested fix:** None required.

---

### EDGE-008: News zero companies/people

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/news/refresh.ts`
- **Line:** 176-188
- **What's wrong:** When a revenue owner has zero companies and zero people (only tags), the `callDiets` will have empty `companies` and `people` arrays. The `fetchNewsHybrid` function receives these empty arrays. The filter at line 217-219 (`article.company || article.person`) will filter out all tag-only articles. This is by design, but the result is zero articles for any revenue owner that only has tags -- no warning or indication is given.
- **Problematic code:**
  ```typescript
  const filteredArticles = result.articles.filter(
    article => article.company || article.person
  );
  ```
- **Impact:** Low. Revenue owners with only tags configured will always get zero articles with no warning. The `coverageGaps` from the fetcher may or may not flag this.
- **Suggested fix:** Add a pre-check warning when a revenue owner has zero companies AND zero people, returning a coverage gap entry for that owner.

---

### EDGE-009: LLM returns empty JSON

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 1691-1709
- **What's wrong:** The `ensureStageHasContent` method (line 1691) checks if output is null or not an object, throwing an error. For `exec_summary`, it requires at least 3 bullet points. For `segment_analysis`, it requires overview or segments. **However**, for most other stages (financial_snapshot, company_overview, key_execs_and_board, trends, etc.), there is NO content check. An empty object `{}` that passes Zod validation would be saved as the stage output.
- **Problematic code:**
  ```typescript
  private ensureStageHasContent(stageId: StageId, output: any) {
    if (!output || typeof output !== 'object') {
      throw new Error(`Stage ${stageId} returned empty output`);
    }
    // Only checks exec_summary and segment_analysis...
  }
  ```
- **Impact:** Medium. If the LLM returns `{}` or `{"confidence": {"level": "LOW"}}` for stages without explicit content checks, validation may pass (if schema fields are optional), and an empty section will be saved to the database and shown to the user.
- **Suggested fix:** Add minimum content checks for all key stages (e.g., financial_snapshot requires non-empty `kpi_table.metrics`, company_overview requires `business_description.overview`, etc.).

---

### EDGE-010: LLM returns array instead of object

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 1533-1547
- **What's wrong:** For `financial_snapshot`, the `normalizeFinancialSnapshotOutput` at line 1549-1553 handles the array case: if the output is an array with a single element, it unwraps it. For ALL other stages, `validateAndParse` at line 1535 calls `parseJSON` followed by `schema.safeParse`. If the LLM returns `[{...}]` instead of `{...}`, Zod's `.safeParse()` will fail with "Expected object, received array". This triggers the `shouldRetryFormatOnly` check (line 1376-1383) which returns `true` because the error message includes "Expected object, received array". So the format-only retry mechanism is triggered.
- **Problematic code:**
  ```typescript
  private shouldRetryFormatOnly(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
      message.includes('Failed to parse JSON response') ||
      message.includes('Expected object, received array') ||  // This catches array-instead-of-object
      message.includes('Schema validation failed')
    );
  }
  ```
- **Impact:** The format-only retry costs an additional Claude API call. The retry prompt explicitly instructs "If the prior output is an array with a single object, return just that object" (line 1398), which should fix the issue. This is a reasonable fallback, but it doubles cost for this failure mode.
- **Suggested fix:** Add a generic pre-processing step (like `normalizeFinancialSnapshotOutput` does) that unwraps single-element arrays before validation for ALL stages, avoiding the expensive retry.

---

### EDGE-011: Large output (100+ KPI rows)

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 1621-1674 (derived metrics merging)
- **What's wrong:** There is no upper bound on the number of KPI metrics. The `normalizeFinancialSnapshotOutput` method at line 1621 iterates over `derived_metrics` and appends them to `kpi_table.metrics`. If the LLM generates 100+ KPIs plus 50+ derived metrics, the merged list could exceed 150 rows. These are all stored as JSON in the database and sent to the frontend. The segment analysis has a hard cap of 5 competitors per segment (line 1338), but no similar cap exists for KPI rows.
- **Problematic code:**
  ```typescript
  metrics.push({
    metric: tableName,
    company: derivedValue ?? '-',
    industry_avg: '-',
    source: derived?.source || '-'
  });
  // No cap on total metrics count
  ```
- **Impact:** Medium. Large KPI tables cause increased DB storage, slower API responses, and potential rendering issues on the frontend. No hard crash but degraded performance.
- **Suggested fix:** Cap merged metrics at a reasonable limit (e.g., 50 rows) and log a warning when truncated.

---

### EDGE-012: Deleted job during execution (P2025 handling)

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 1832-1857
- **What's wrong:** The `tryUpdateJob` method at line 1832 catches P2025 errors and silently returns. The `isRecordNotFound` helper at line 1850 correctly identifies the Prisma error code. However, `buildStagePrompt` at line 876 uses `findUnique` without P2025 handling -- if the job is deleted between the cancellation check and the prompt building, it throws `new Error('Job not found')` at line 880, which bubbles up to `executeStage`'s catch block at line 852. The catch calls `handleStageFailure` at line 855, which does `findFirst` at line 1132 and returns if `subJob` is null (line 1136). So the chain is:
  1. Job deleted externally
  2. `buildStagePrompt` throws "Job not found"
  3. `executeStage` catch -> `handleStageFailure` -> subJob not found -> returns
  4. `executeStage` returns to `executeNextPhase`
  5. `executeNextPhase` calls `getNextRunnableStages` -> findUnique returns null -> returns []
  6. `executeNextPhase` calls `checkJobCompletion` -> findUnique returns null -> returns
  7. `executeJob` resumes, does `findUnique` again (line 668), gets null, returns
- **Impact:** Low. The error path is handled, but the "Job not found" error at line 880 is not a P2025 error -- it's a plain Error. It would cause `handleStageFailure` to attempt a retry (if attempts < maxAttempts), which wastes time retrying a job that no longer exists.
- **Suggested fix:** In `buildStagePrompt`, throw a specific error type that `executeStage` can identify as "job deleted" and skip retries.

---

### EDGE-013: All stages fail (except foundation)

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 674, 862-868
- **What's wrong:** If foundation succeeds but all subsequent stages fail (after max retries), the orchestrator correctly handles this. Each failed stage triggers `handleStageFailure` which marks blocked downstream stages as failed too (line 1172-1185). The `computeFinalStatus` function (imported from orchestrator-utils) would see all stages as either completed (foundation) or failed, and should return `completed_with_errors`. The job would then be marked as `completed_with_errors` at line 675-677.
- **Impact:** Low. Handled correctly -- the job finishes with `completed_with_errors` status. The user sees a report with only foundation data and all other sections showing as failed.
- **Suggested fix:** None required. Behavior is correct.

---

### EDGE-014: Whitespace-only inputs

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/generate.ts`
- **Line:** 32-37, 74
- **What's wrong:** The `normalizeInput` function trims and collapses whitespace. A whitespace-only input like `"   "` would be trimmed to `""`, which correctly fails the validation at line 74 (`!normalizedCompany`). However, `geography` defaults to `'Global'` (line 70), so whitespace-only geography is handled. `industry` is handled too (empty string after normalize -> `undefined` at line 82). `userAddedPrompt` at line 264 is trimmed but an all-whitespace prompt would become empty string, which is fine.

  **However**, for the `focusAreas` array, there is no normalization. Elements that are whitespace-only strings (e.g., `["  ", " "]`) would be stored as-is.
- **Problematic code:**
  ```typescript
  focusAreas: body.focusAreas,  // No trimming/filtering of individual elements
  ```
- **Impact:** Low. Whitespace-only focus areas would be stored in the database and included in metadata, but the prompt builder would include them as meaningless whitespace in the prompt.
- **Suggested fix:** Filter and trim focusAreas elements: `body.focusAreas?.map(s => s.trim()).filter(Boolean)`.

---

### EDGE-015: Browser back/forward

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/frontend/src/App.tsx`
- **Line:** 22-29
- **What's wrong:** The app uses hash-based routing with `window.addEventListener('hashchange', handleHashChange)`. Browser back/forward buttons trigger `hashchange` events, which update `currentPath` correctly. However, when navigating FROM a research detail page (`/research/:id`) to another page and then pressing back, the `hashchange` handler at line 24 reads `window.location.hash.slice(1)` which will correctly restore the previous path.

  **The issue:** The research detail page component receives `jobs` from the parent state. If the user navigates away and the polling loop in `runJob` completes while the user is on a different page, the detail page may show stale data when the user navigates back. There is no re-fetch mechanism triggered by hash-change navigation.
- **Impact:** Medium. Stale data display when navigating back to research detail. The detail page shows whatever was in the `jobs` state at the time of navigation, which may not reflect the latest status if the job completed while the user was on another page.
- **Suggested fix:** Trigger a `getJobDetailApi` refresh when the user navigates back to a research detail page (e.g., on component mount or route change).

---

### PERF-004: LLM timeout (15s for company resolution)

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/company/resolve.ts`
- **Line:** 70-79
- **What's wrong:** The company resolution endpoint correctly implements a 15s timeout using `Promise.race` with a reject timer. When the timeout fires, the error is caught at line 137, and the endpoint returns a graceful degradation response (`status: 'unknown'`). However, the Claude API call continues running in the background even after the timeout -- there is no mechanism to abort the HTTP request to the Anthropic API. The cost tracking at lines 82-99 will NOT run for timed-out requests (since execution enters the catch block), but the Anthropic API will still process and bill the request.
- **Problematic code:**
  ```typescript
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Company resolution timed out')), TIMEOUT_MS);
  });
  const response = await Promise.race([
    claude.execute(prompt),  // This continues running even after timeout
    timeoutPromise
  ]);
  ```
- **Impact:** Medium. Timed-out requests still consume API credits. The user gets a quick graceful response, but the backend has a dangling request consuming resources. If many users trigger company resolution simultaneously, these ghost requests pile up.
- **Suggested fix:** Use `AbortController` with the Anthropic SDK to actually cancel the HTTP request when the timeout fires.

---

## File Export Tests (FILE-001 to FILE-006)

### FILE-001: Research PDF export generates valid PDF

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/export-pdf.ts`
- **Line:** 42-142
- **What's wrong:** The PDF export works correctly for the happy path: it fetches the job, builds markdown, converts to HTML, renders with Playwright, and returns a PDF buffer. Content-Type and Content-Disposition headers are set correctly. **However**, there is no cleanup guarantee -- if `page.pdf()` throws, the browser instance at line 130 (`browser.close()`) may not be called.
- **Problematic code:**
  ```typescript
  const page = await browser.newPage({ viewport: { width: 1200, height: 1800 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const pdfBuffer = await page.pdf({ ... });
  await browser.close();  // Not in a finally block
  ```
- **Impact:** Memory leak on the server if PDF generation fails after browser launch. Each leaked Chromium process consumes ~100-200MB RAM.
- **Suggested fix:** Wrap browser operations in a try/finally to ensure `browser.close()` always runs.

---

### FILE-002: News PDF export generates valid PDF

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/pdf-export.ts`
- **Line:** 15-219
- **What's wrong:** The news PDF uses PDFKit (not Playwright), which is lighter weight. The implementation is solid -- it uses a stream-based approach with `doc.on('data')` and resolves the Promise when `doc.on('end')` fires. The `Buffer.concat(chunks)` approach is standard. No issues found with the PDF generation itself.
- **Impact:** None. The implementation is correct.
- **Suggested fix:** None required.

---

### FILE-003: News Markdown export generates valid Markdown

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/markdown-export.ts`
- **Line:** 80-85
- **What's wrong:** The markdown export uses `article.sourceUrl` in a link without sanitization: `[Read more](${article.sourceUrl})`. If a sourceUrl contains parentheses or special markdown characters, the markdown link will be malformed.
- **Problematic code:**
  ```typescript
  lines.push(`[Read more](${article.sourceUrl}) | ${article.sourceName || 'Unknown source'} | ${pubDate}`);
  ```
- **Impact:** Low. Broken markdown links for URLs containing parentheses (rare but possible).
- **Suggested fix:** Encode parentheses in URLs: `article.sourceUrl.replace(/\(/g, '%28').replace(/\)/g, '%29')`.

---

### FILE-004: Browser launch failure handling

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/export-pdf.ts`
- **Line:** 109-117
- **What's wrong:** Browser launch failure is correctly caught and returns a 500 error with a descriptive message. This is well-handled.
- **Problematic code (correct):**
  ```typescript
  try {
    browser = await chromium.launch({ ... });
  } catch (err) {
    console.error('Playwright launch failed:', err);
    return res.status(500).json({ error: 'PDF export unavailable: browser failed to start' });
  }
  ```
- **Impact:** None. Properly handled.
- **Suggested fix:** None required.

---

### FILE-005: Research PDF filename sanitization

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/export-pdf.ts`
- **Line:** 68-69
- **What's wrong:** The filename is constructed using `job.companyName.replace(/\s+/g, '_')`, which only replaces whitespace with underscores. Special characters like `"`, `/`, `\`, `?`, `*`, `<`, `>`, `|`, `:` are NOT sanitized. These characters are invalid in filenames on Windows and may cause Content-Disposition header injection.
- **Problematic code:**
  ```typescript
  const filename = `${job.companyName.replace(/\s+/g, '_')}-${dateStr}.pdf`;
  // ... later:
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  ```
- **Impact:** Medium. A company name containing `"` could break the Content-Disposition header. A name with `/` could cause path traversal in some browsers. On Windows, filenames with invalid chars would fail to save.
- **Suggested fix:** Use a proper filename sanitization function that removes or replaces all filesystem-unsafe characters. Also consider URL-encoding the filename or using the `filename*=UTF-8''` format for Content-Disposition.

---

### FILE-006: News export filename sanitization

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/news/export.ts`
- **Line:** 29, 62
- **What's wrong:** The news export filenames are date-based (`news-digest-YYYY-MM-DD.pdf`), not user-input-based. No sanitization issue.
- **Impact:** None.
- **Suggested fix:** None required.

---

## Performance Tests (PERF-001 to PERF-003, PERF-005)

### PERF-001: Large dataset -- list endpoint with many jobs

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/list.ts`
- **Line:** 83-97
- **What's wrong:** When `statusFilter` is set (derived status filtering), the query at line 84 fetches ALL jobs matching the base `where` clause (no `take`/`skip`), then filters in-memory at line 91, then slices at line 93. For users with thousands of jobs, this loads ALL jobs into memory, including their sub-jobs.
- **Problematic code:**
  ```typescript
  const jobs = shouldFilterByDerivedStatus
    ? await prisma.researchJob.findMany(baseQuery)  // NO PAGINATION -- fetches ALL jobs
    : await prisma.researchJob.findMany({ ...baseQuery, take: limit, skip: offset });
  ```
- **Impact:** High for users with many jobs. Memory spikes and slow response times when filtering by derived status. Could cause OOM on constrained servers.
- **Suggested fix:** Add a reasonable upper limit (e.g., `take: 1000`) even for the derived-status path, or implement the status derivation in SQL.

---

### PERF-002: Concurrent research requests

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 502-642
- **What's wrong:** The queue processor uses a PostgreSQL advisory lock to ensure only one job runs at a time. Multiple concurrent `createJob` calls each invoke `processQueue(true)` at line 494. The `forceRestart` flag at line 504-506 sets `queueLoopRunning = false` and then immediately sets it `true` at line 507. This is NOT thread-safe in the single-threaded Node.js event loop context -- if two `processQueue(true)` calls are queued in the microtask queue, the second call's `forceRestart` could reset the flag while the first is still in the `while(true)` loop.

  However, since Node.js is single-threaded and the `processQueue` function is `async`, the `forceRestart` check and flag set happen synchronously before any `await`, so only one invocation will actually enter the loop. The `while(true)` loop will process all queued jobs sequentially. The advisory lock provides additional safety at the database level.
- **Impact:** Low. The design is sound for single-instance deployment. For multi-instance (horizontal scaling), the advisory lock correctly prevents concurrent execution.
- **Suggested fix:** None critical. The current design is appropriate for the deployment model.

---

### PERF-003: PDF memory -- Playwright process not cleaned up

- **Severity:** P1
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/api/research/export-pdf.ts`
- **Line:** 119-131
- **What's wrong:** As noted in FILE-001, the Playwright browser is launched for each PDF export and closed after. If `page.setContent()` or `page.pdf()` throws, `browser.close()` at line 130 is skipped. Additionally, there is no timeout on the Playwright operations -- a very large report could cause Playwright to hang indefinitely on `page.pdf()` or `page.setContent()` with `waitUntil: 'networkidle'`.
- **Problematic code:**
  ```typescript
  const page = await browser.newPage({ viewport: { width: 1200, height: 1800 } });
  await page.setContent(html, { waitUntil: 'networkidle' });  // No timeout
  const pdfBuffer = await page.pdf({ ... });  // No timeout
  await browser.close();  // Skipped if above throws
  ```
- **Impact:** High. Memory leaks from leaked Chromium processes. A hung PDF export blocks the request indefinitely (no response timeout). Repeated exports of large reports could exhaust server memory.
- **Suggested fix:**
  1. Wrap in try/finally for guaranteed cleanup
  2. Add a timeout on `page.setContent()` and `page.pdf()`
  3. Consider using a shared browser instance or browser pool instead of launching per-request

---

### PERF-005: News PDF memory usage

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/pdf-export.ts`
- **Line:** 61
- **What's wrong:** The news PDF uses PDFKit which buffers the entire PDF in memory (`const chunks: Buffer[] = []`). For a very large number of articles (thousands), the buffer could become large. However, since the news digest is typically for a 7-day window per revenue owner, the article count is likely manageable (< 100 articles).
- **Impact:** Low. Only an issue if date ranges are very wide (e.g., a year) with many articles.
- **Suggested fix:** Consider streaming the PDF directly to the response instead of buffering it entirely in memory.

---

## Config Tests (CONFIG-001 to CONFIG-006)

### CONFIG-001: Missing DATABASE_URL

- **Severity:** P1
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/lib/prisma.ts`
- **Line:** 5
- **What's wrong:** The PrismaClient is instantiated at module load time without checking if `DATABASE_URL` exists. If the environment variable is missing, Prisma will throw an error at the first database query, not at startup. The health check endpoint queries `SELECT 1`, which would catch this, but other routes may return cryptic Prisma connection errors.
- **Problematic code:**
  ```typescript
  export const prisma = globalForPrisma.prisma ?? new PrismaClient();
  ```
- **Impact:** High. Missing DATABASE_URL causes runtime errors on every DB query. The error message from Prisma is not user-friendly ("Can't reach database server").
- **Suggested fix:** Add a startup check: `if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')` before creating the PrismaClient.

---

### CONFIG-002: Missing ANTHROPIC_API_KEY

- **Severity:** P1
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/claude-client.ts`
- **Line:** 335-337
- **What's wrong:** The `getClaudeClient` factory function correctly checks for the API key and throws a descriptive error: `'ANTHROPIC_API_KEY environment variable is required'`. However, this check only runs on first use (lazy initialization), not at startup. If the API key is missing, the server starts successfully but fails on the first research generation or company resolution request.
- **Problematic code:**
  ```typescript
  export function getClaudeClient(): ClaudeClient {
    if (!clientInstance) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      // ...
    }
  }
  ```
- **Impact:** High. Server appears healthy but fails on first LLM call. The orchestrator constructor at line 381 calls `getClaudeClient()`, and the orchestrator is instantiated at server startup (index.ts line 340), so in practice this IS caught at startup. This is actually fine.
- **Suggested fix:** The current behavior is acceptable since the orchestrator instantiation at startup triggers the check. No change needed.

---

### CONFIG-003: CORS_ORIGIN configuration

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/index.ts`
- **Line:** 69-72
- **What's wrong:** CORS origin defaults to `'http://localhost:5174'` if `CORS_ORIGIN` is not set. This is a single-origin string, not an array. In production, if the frontend is served from a different URL than the one configured, all API requests will be blocked by CORS.
- **Problematic code:**
  ```typescript
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true
  }));
  ```
- **Impact:** Medium. Misconfigured CORS blocks the entire frontend. However, since the frontend is served from the same server (line 264-278), CORS may not apply for same-origin requests in production.
- **Suggested fix:** Support comma-separated origins in `CORS_ORIGIN` for multi-domain deployments: `origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || 'http://localhost:5174'`.

---

### CONFIG-004: Rate limit configuration

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/index.ts`
- **Line:** 80-84, 85-118
- **What's wrong:** Rate limiting is only enabled when `NODE_ENV !== 'development'`. The `parseEnvInt` helper correctly parses env vars with fallback. All rate limit env vars (`RATE_LIMIT_GET_WINDOW_MS`, `RATE_LIMIT_GET_MAX`, etc.) are optional with reasonable defaults. However, rate limiting is disabled entirely in development mode, which is appropriate.

  **Issue:** The `isProd` check at line 85 uses `!== 'development'`, meaning any value other than 'development' (including undefined, 'staging', 'test') will enable rate limiting. This is correct behavior.
- **Impact:** None. Rate limiting configuration is sound.
- **Suggested fix:** None required.

---

### CONFIG-005: CLAUDE_MODEL configuration

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/claude-client.ts`
- **Line:** 51, 343
- **What's wrong:** The model defaults to `'claude-sonnet-4-5'` if `CLAUDE_MODEL` is not set. The env var is optional and correctly plumbed through. No validation that the model string is a valid Anthropic model -- invalid model strings would cause API errors at runtime. The model is used in the Anthropic SDK `messages.create` call, which would return a clear error from the API.
- **Impact:** Low. An invalid model string causes a clear API error on first Claude call.
- **Suggested fix:** Optional: validate `CLAUDE_MODEL` against a known list of valid model IDs at startup.

---

### CONFIG-006: MAX_TOKENS configuration

- **Severity:** P3
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/claude-client.ts`
- **Line:** 52, 343
- **What's wrong:** `MAX_TOKENS` is parsed with `parseInt` and defaults to 16000. If `MAX_TOKENS` is set to a non-numeric value, `parseInt` returns `NaN`, which is falsy, so the default `undefined` is passed to the constructor, which then defaults to `16000`. This is correct behavior.

  **Issue:** There's no upper bound check. Setting `MAX_TOKENS=1000000` would be sent to the Anthropic API, which would return an error for exceeding model limits.
- **Problematic code:**
  ```typescript
  maxTokens: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS) : undefined
  // ...
  this.maxTokens = config.maxTokens || 16000;
  ```
- **Impact:** Low. The Anthropic API would reject invalid max_tokens values with a clear error.
- **Suggested fix:** Optional: clamp MAX_TOKENS to a reasonable range (e.g., 1000-128000).

---

## Cross-Layer Integration Findings

### INT-001: Frontend cancel immediately removes job from list

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/frontend/src/services/researchManager.ts`
- **Line:** 1404-1420
- **What's wrong:** The frontend `cancelJob` function at line 1407-1414 first sets status to 'cancelled', then immediately filters out the job from the list (`.filter((j) => j.id !== jobId || j.status !== 'cancelled')`). Since the status was JUST set to 'cancelled' in the map, the filter will always remove it. This means the user sees the job disappear from the list immediately after cancelling.

  Meanwhile, the backend `cancel.ts` does a hard DELETE. So the next time `listJobsApi` is called, the job won't be in the list anyway. But the immediate removal in the frontend gives no visual feedback that the cancellation was successful -- the job just vanishes.
- **Problematic code:**
  ```typescript
  setJobs((prev) =>
    prev
      .map((j) =>
        j.id === jobId
          ? { ...j, status: 'cancelled', currentAction: 'Cancelled' }
          : j
      )
      .filter((j) => j.id !== jobId || j.status !== 'cancelled')
  );
  ```
- **Impact:** Medium. Poor UX -- user clicks cancel and the job disappears without a "cancelled" state being visible. Expected behavior would be to show the job as "cancelled" briefly.
- **Suggested fix:** Remove the `.filter()` chain, or add a delay before removing the job to show the cancelled state.

---

### INT-002: Frontend-Backend section ID mismatch risk

- **Severity:** P3
- **File (frontend):** `/home/ewise/projects/ssa-intelligence/frontend/src/services/researchManager.ts` (line 104-125)
- **File (backend):** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts` (line 70-91)
- **What's wrong:** The frontend `STAGE_TO_SECTION_ID` map and the backend `StageId` type definition must stay in sync. Currently both define the same 20 stage IDs. However, there is no shared type definition -- these are duplicated in two separate codebases. If a new stage is added to the backend but not the frontend mapping, the new stage's data would be silently ignored.
- **Impact:** Low. Risk of desync when adding new stages. No current issue.
- **Suggested fix:** Consider a shared types package or at least a cross-reference comment.

---

### INT-003: News API routes have no authentication

- **Severity:** P1
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/index.ts`
- **Line:** 219-228
- **What's wrong:** All news API routes (`/api/news/*`) are mounted WITHOUT the `authMiddleware`. The comment at line 219 says "No auth for MVP". This means anyone can:
  - Read all revenue owners, companies, people, articles
  - Create/update/delete revenue owners, companies, people
  - Trigger news refreshes (which call the Claude API, incurring costs)
  - Export PDFs and Markdown
  - Search articles
- **Problematic code:**
  ```typescript
  // NEWS INTELLIGENCE API (No auth for MVP)
  app.use('/api/news/tags', newsTagsRouter);
  app.use('/api/news/companies', newsCompaniesRouter);
  // ... all without authMiddleware
  ```
- **Impact:** High. Any unauthenticated user can access and modify news intelligence data and trigger expensive LLM operations. This is a cross-cutting issue affecting all news endpoints.
- **Suggested fix:** Add `authMiddleware` to all news routes. At minimum, add auth to write operations (POST/PUT/DELETE) and the refresh endpoint.

---

### INT-004: Graceful shutdown does not drain active jobs

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/index.ts`
- **Line:** 329-337
- **What's wrong:** The SIGTERM/SIGINT handlers immediately call `process.exit(0)`. Any in-progress research jobs or news refreshes are abandoned. The queue processor is interrupted mid-execution. Sub-jobs that were "running" will remain stuck in "running" status in the database until the stale job cleanup runs (30-minute threshold at line 1869).
- **Problematic code:**
  ```typescript
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);  // Not actually graceful
  });
  ```
- **Impact:** Medium. Jobs interrupted by deployment/restart are stuck for up to 30 minutes. Users see jobs stuck at "running" with no progress.
- **Suggested fix:** Implement actual graceful shutdown: stop accepting new connections, wait for the current stage to complete (with a timeout), update in-progress jobs to 'queued' status, then exit.

---

### INT-005: saveStageOutput overwrites overallConfidence on every section

- **Severity:** P2
- **File:** `/home/ewise/projects/ssa-intelligence/backend/src/services/orchestrator.ts`
- **Line:** 1085-1108
- **What's wrong:** The `saveStageOutput` method at line 1090 sets `overallConfidence: output.confidence?.level || 'MEDIUM'` on every stage save. This means the last stage to complete overwrites the overall confidence with its own confidence level, rather than using the computed aggregate. The `updateOverallConfidence` is called at line 1107 AFTER the save, which re-computes the aggregate -- but the intermediate state between line 1090 and line 1107 is incorrect.

  Additionally, for stages without a dedicated output field (e.g., investment_strategy, portfolio_snapshot -- line 108-116), `saveStageOutput` at line 1092-1096 still sets `overallConfidence` to the individual stage's confidence, then line 1107 recalculates. This is wasteful but not harmful since the recalculation happens immediately after.
- **Impact:** Low. The intermediate state is brief and the recalculation fixes it. No user-visible issue since polling frequency is 2 seconds.
- **Suggested fix:** Remove `overallConfidence` from the initial save and only set it via `updateOverallConfidence`.

---

## Cross-Team Systemic Patterns

The following patterns emerged from correlating findings across all team audits:

### Pattern 1: "Unauthenticated by Design" Endpoints

**Corroborated by:** Integration (INT-003), Security (SEC-009)

Both teams independently identified that all `/api/news/*` routes lack authentication (`backend/src/index.ts:219-228`). The security team also flagged the anonymous feedback POST (`backend/src/index.ts:181`) which has only IP-based rate limiting. This represents a systemic pattern where "MVP shortcuts" for auth have not been revisited. The combined impact is:
- Unauthenticated users can trigger LLM-powered news refresh (cost exposure)
- Unauthenticated users can CRUD all news intelligence entities (data integrity)
- Anonymous feedback endpoint is an abuse vector (spam, storage exhaustion)

**Recommendation:** Audit ALL routes without `authMiddleware` and add auth. For public-facing endpoints, add CAPTCHA or token-based anti-abuse.

### Pattern 2: Unsanitized User Input Reaching LLM Prompts

**Corroborated by:** Security (SEC-003), Integration (EDGE-014)

The security team found that `userAddedPrompt` is concatenated directly into LLM prompts without sanitization (`orchestrator.ts:935-937`). The integration audit found that `focusAreas` array elements are also passed through unsanitized (whitespace-only elements, but also potentially injection payloads). Both paths feed into `buildStagePrompt` which constructs the final prompt string. This is a prompt injection risk where a malicious user could:
- Override system instructions
- Extract foundation data from other sections
- Inject instructions that alter output format, causing validation failures

**Recommendation:** Implement input sanitization/escaping for all user-provided text that enters LLM prompts. Consider a prompt boundary marker approach.

### Pattern 3: Data Contract Violation Between Endpoints

**Corroborated by:** Backend (REG-001), Integration (cross-layer verification)

The backend team identified that `list.ts` (lines 132-143) and `detail.ts` (lines 121-132) use different section-to-number mappings. The list endpoint has 10 entries and **omits `key_execs_and_board`**, while the detail endpoint has 11 entries and includes it at position 4. This shifts all subsequent section numbers:

| Section | list.ts | detail.ts |
|---------|---------|-----------|
| `exec_summary` | 1 | 1 |
| `financial_snapshot` | 2 | 2 |
| `company_overview` | 3 | 3 |
| `key_execs_and_board` | **MISSING** | 4 |
| `segment_analysis` | 4 | 5 |
| `trends` | 5 | 6 |
| `peer_benchmarking` | 6 | 7 |
| `sku_opportunities` | 7 | 8 |
| `recent_news` | 8 | 9 |
| `conversation_starters` | 9 | 10 |
| `appendix` | 10 | 11 |

The frontend consumes `generatedSections` from the list endpoint in `researchManager.ts:1097` to calculate progress (`generated.length / fallbackTotal`). When `key_execs_and_board` is completed, it produces section number 0 (unknown) from list.ts, which is filtered out -- **making progress undercount by 1 section**. When comparing list vs detail views, section numbering is inconsistent.

This is a **P1** cross-layer data contract violation.

**Recommendation:** Extract the section mapping into a single shared constant (e.g., `SECTION_NUMBER_MAP` in a shared module) and import it in both `list.ts` and `detail.ts`.

### Pattern 4: Inconsistent Prisma Error Handling

**Corroborated by:** Backend (ERROR-002, DB-011/DB-012), Integration (EDGE-012)

The backend team found that only `admin/groups.ts` handles Prisma P2025 (record not found) errors -- all other delete/update handlers return 500 on race conditions. My EDGE-012 finding identified the same gap in the orchestrator. Additionally, DB-011/DB-012 found that `NewsArticle` FK relations to `TrackedCompany`/`TrackedPerson`/`TrackedTag` lack `onDelete: SetNull`, causing 500 FK violation errors when deleting tracked entities with associated articles. Combined with ERROR-001 (error message leakage in production), these form a systemic pattern where Prisma errors are not defensively handled.

**Recommendation:**
1. Add P2025 handling to all delete/update route handlers (return 404/409 instead of 500)
2. Add `onDelete: SetNull` to NewsArticle FK relations in the Prisma schema
3. Create a shared Prisma error handling middleware to catch common error codes

### Pattern 5: Resource Cleanup Gaps

**Corroborated by:** Integration (PERF-003, INT-004, EDGE-004, PERF-004)

Multiple findings show a pattern of resources not being cleaned up:
- Playwright browser instances leak on error (PERF-003)
- In-progress jobs abandoned on server shutdown (INT-004)
- Claude API calls continue after cancel/timeout (EDGE-004, PERF-004)
- Stale "running" jobs require 30-minute watchdog cleanup

**Recommendation:** Implement a centralized resource cleanup strategy:
1. try/finally for all external resource acquisitions (Playwright, etc.)
2. AbortController integration for cancellable API calls
3. Graceful shutdown that drains active work before exit
4. Reduce stale job cleanup threshold from 30 to 10 minutes

### Pattern 6: Admin Prompt Management Pipeline Disconnect (P1)

**Corroborated by:** LLM Pipeline (ISSUE-006), Integration (cross-layer verification)

The LLM pipeline team identified that `buildStagePrompt` in `orchestrator.ts:875` calls `config.promptBuilder(input)` from hardcoded `STAGE_CONFIGS` (line 224+) which use imported prompt builder functions (e.g., `buildExecSummaryPrompt`). The `prompt-resolver.ts` service -- which resolves DB overrides for prompts -- is **only imported by `backend/src/api/admin/prompts.ts`** and is never referenced in the orchestrator.

Cross-layer verification confirms:
- **Frontend (`AdminPrompts.tsx`)**: Full CRUD UI with draft/publish workflow, version history, test runner, and code-default comparison. Lines 217-257 show save/publish flows that write to DB via `/admin/prompts` API.
- **Backend (`admin/prompts.ts`)**: Imports `prompt-resolver.ts` functions to manage DB prompt overrides.
- **Orchestrator (`orchestrator.ts`)**: Zero imports from `prompt-resolver.ts`. `buildStagePrompt` always uses code-default prompt builders.

**Impact**: The entire admin prompt management feature (UI + API + DB schema) is non-functional. Admins can create, edit, publish, and version prompt overrides, but the orchestrator will never use them. This is a P1 cross-layer contract violation.

**Recommendation**: In `buildStagePrompt`, check `prompt-resolver.ts` for published DB overrides before falling back to `config.promptBuilder`. The resolver already has the logic -- it just needs to be called.

### Pattern 7: PE/FS/Insurance Stage Output Persistence Gap (P1)

**Corroborated by:** LLM Pipeline (REG-003/ISSUE-001), Integration (cross-layer verification)

The LLM pipeline team found that 9 PE/FS/Insurance-specific stages have `STAGE_OUTPUT_FIELDS = undefined` in the orchestrator's mapping (`orchestrator.ts:102`):
- `investment_strategy`, `portfolio_snapshot`, `deal_activity`, `deal_team`, `portfolio_maturity`, `leadership_and_governance`, `strategic_priorities`, `operating_capabilities`, `distribution_analysis`

Cross-layer verification confirms in `saveStageOutput` (line 1086-1098): when `field` is `undefined`, the output is **not persisted to the main job record** -- only to the sub-job's `output` column. This means:
1. `buildStagePrompt` (line 895-903) can't access these stage outputs via the job record for downstream dependency injection (e.g., `if (job.financialSnapshot) input.section2 = ...`)
2. The `detail.ts` endpoint reads sections from both `sections` JSON and sub-job outputs as fallback, partially mitigating the display issue
3. But **cross-stage context is permanently broken** for PE/FS/Insurance reports -- downstream stages can't reference prior specialized stage data

**Recommendation**: Add DB column mappings for all 9 PE/FS/Insurance stages in `STAGE_OUTPUT_FIELDS`, with corresponding Prisma schema columns (or use a generic JSON column approach).

### Pattern 8: Cost Tracking Fragility

**Corroborated by:** LLM Pipeline (ERROR-008, ISSUE-004), Integration (cross-layer)

The LLM pipeline team identified two cost tracking issues that compound:
1. **ERROR-008**: Cost tracking errors re-throw instead of being caught/logged. A DB error during `recordCostEvent` fails the entire stage and triggers a retry, even though LLM work already succeeded. This wastes API credits on retry.
2. **ISSUE-004**: Cost is calculated twice (orchestrator + `recordCostEvent`) and could diverge if the pricing cache updates between calls.

Combined with my EDGE-004 (cancel race) and PERF-004 (timeout doesn't abort API call), these form a pattern where cost-related operations are not defensively isolated from the execution pipeline. A transient DB issue during cost recording can cascade into wasted LLM spend through retries.

**Recommendation**:
1. Wrap `recordCostEvent` in try/catch and log errors instead of re-throwing
2. Calculate cost in a single location and propagate the result
3. Consider eventual-consistency for cost tracking (queue-based async recording)

---

## Summary of Critical Findings

| ID | Severity | Summary |
|----|----------|---------|
| EDGE-004 | P0 | Race condition: cancel deletes job while orchestrator is mid-execution, wasting Claude API calls |
| REG-001 | P1 | Section number mapping inconsistent between list.ts and detail.ts -- key_execs_and_board omitted from list, shifting all numbers (cross-layer with backend) |
| INT-003 | P1 | News API routes have no authentication -- any user can access/modify data and trigger LLM calls |
| PERF-003 | P1 | Playwright browser not cleaned up on PDF error; no timeout on PDF generation |
| ISSUE-006 | P1 | Admin prompt overrides never used by orchestrator -- prompt-resolver.ts disconnected from execution pipeline (cross-layer with LLM pipeline) |
| REG-003 | P1 | 9 PE/FS/Insurance stages have undefined output fields -- outputs not persisted to job record, breaking cross-stage context (cross-layer with LLM pipeline) |
| ERROR-008 | P1 | Cost tracking errors re-throw and fail entire stage, triggering costly LLM retries (cross-layer with LLM pipeline) |
| CONFIG-001 | P1 | Missing DATABASE_URL causes cryptic runtime errors instead of startup failure |
| PERF-001 | P2 | List endpoint fetches ALL jobs when filtering by derived status -- no pagination limit |
| INT-004 | P2 | Graceful shutdown just calls process.exit(0), abandoning in-progress jobs |
| INT-001 | P2 | Cancel removes job from frontend immediately, no visual "cancelled" state |
| FILE-005 | P2 | PDF filename not sanitized -- special chars in company name break Content-Disposition |
| EDGE-005 | P2 | Double cancel returns 404 instead of "already cancelled" |
| EDGE-006 | P2 | Rapid refresh clicks can bypass TOCTOU check on isRefreshing flag |
| EDGE-009 | P2 | Empty JSON `{}` from LLM passes validation for most stages (no content checks) |
| EDGE-010 | P2 | Array-instead-of-object from LLM triggers expensive format-only retry for all non-financial stages |
| EDGE-011 | P2 | No cap on KPI metrics count -- 150+ rows cause performance degradation |
| EDGE-012 | P2 | Deleted job during execution causes unnecessary retries before detection |
| EDGE-014 | P2 | Whitespace-only focusAreas elements stored without sanitization |
| EDGE-015 | P2 | Browser back to research detail shows stale data without re-fetch |
| PERF-004 | P2 | Company resolution timeout doesn't abort the underlying API call |
| CONFIG-003 | P2 | CORS only supports single origin string |
| INT-005 | P2 | saveStageOutput overwrites overallConfidence before aggregate recalculation |
