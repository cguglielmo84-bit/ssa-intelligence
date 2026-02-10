# Frontend QA Audit Findings

**Auditor:** frontend (ssa-qa team)
**Date:** 2026-02-10
**Scope:** UI-FUNC-001 to UI-FUNC-024, UI-RENDER-001 to UI-RENDER-005, UI-STATE-001 to UI-STATE-010

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (Critical) | 2 |
| P1 (High) | 6 |
| P2 (Medium) | 10 |
| P3 (Low) | 8 |
| **Total** | **26** |

---

## P0 -- Critical

### F-001: cancelJob maps status to 'cancelled' then immediately filters it out (dead code / no-op)

- **Test Case:** UI-FUNC-005 (Cancel running job)
- **Severity:** P0
- **File:** `frontend/src/services/researchManager.ts`
- **Lines:** 1407-1415
- **What's wrong:** `cancelJob` first maps the job to `status: 'cancelled'`, then immediately filters out any job whose `id === jobId` AND `status === 'cancelled'`. The map always produces a cancelled job for that ID, so the filter always removes it. The job vanishes from the UI instead of showing "Cancelled" status. This is equivalent to `deleteJob` behavior, not cancel behavior.
- **Problematic code:**
  ```ts
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
- **Impact:** Users clicking "Cancel" see the job disappear entirely rather than showing a cancelled state. This is functionally identical to deletion and violates user expectations. There is no way to distinguish a cancelled job from a deleted one in the UI.
- **Suggested fix:** Remove the `.filter()` chain so the cancelled status is preserved:
  ```ts
  setJobs((prev) =>
    prev.map((j) =>
      j.id === jobId
        ? { ...j, status: 'cancelled' as JobStatus, currentAction: 'Cancelled' }
        : j
    )
  );
  ```

---

### F-002: XSS vulnerability in HTML email generation (NewsDashboard)

- **Test Case:** UI-FUNC-022 (News send/email generation)
- **Severity:** P0
- **File:** `frontend/src/pages/NewsDashboard.tsx`
- **Lines:** 285-300
- **What's wrong:** Article data (`headline`, `longSummary`, `shortSummary`, `whyItMatters`, `sourceUrl`, `tag.name`) is interpolated directly into an HTML template literal without any HTML entity escaping. If any of these fields contain characters like `<`, `>`, `"`, or `&`, the generated HTML will be malformed. If an article's headline or summary contains injected HTML/script tags (e.g., from a compromised news source), the resulting .eml file will contain executable HTML that renders in the recipient's email client.
- **Problematic code:**
  ```ts
  const htmlBody = `...
    <h2 style="color: #003399; margin-bottom: 16px;">${article.headline}</h2>
    ${summary ? `<div ...>${summary.replace(/\n/g, '<br/>')}</div>` : ''}
    ...
    <a href="${article.sourceUrl}" ...>Read More</a>
  ...`;
  ```
- **Impact:** Stored XSS via email. A malicious article headline like `<img src=x onerror=alert(1)>` would execute JavaScript in the recipient's email client (depending on client). The `sourceUrl` field could also inject arbitrary attributes via `" onclick="...`.
- **Suggested fix:** Create an `escapeHtml` utility function and apply it to all interpolated values:
  ```ts
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
       .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  ```

---

## P1 -- High

### F-003: runJob polling loop has no cleanup on component unmount

- **Test Case:** UI-STATE-001 (useResearchManager polling at 2s intervals)
- **Severity:** P1
- **File:** `frontend/src/services/researchManager.ts`
- **Lines:** 1299-1364
- **What's wrong:** `runJob` uses a `while(true)` loop with `await delay(2000)` for polling. There is no AbortController, no mounted check, and no way to cancel the loop when the component unmounts. The `activeJobsRef` check on line 1301 prevents duplicate polling but does not prevent continued polling after unmount.
- **Problematic code:**
  ```ts
  const runJob = useCallback(async (jobId: string, ...) => {
    if (activeJobsRef.current.has(jobId)) return;
    activeJobsRef.current.add(jobId);
    try {
      while (true) {
        const status = await getJobStatusApi(jobId);
        setJobs((prev) => { ... });
        if (terminal) break;
        await delay(2000);
      }
    } ...
  }, []);
  ```
- **Impact:** After navigating away from a page that triggered `runJob`, the polling continues in the background, calling `setJobs` on an unmounted component. This causes React "can't perform state update on unmounted component" warnings and wastes network resources. In a long session, multiple orphaned polling loops could accumulate.
- **Suggested fix:** Add an AbortController or a `mountedRef` check. Pass an abort signal into the delay function and check it before each iteration.

---

### F-004: pollTestRun uses recursive setTimeout without cleanup on unmount

- **Test Case:** UI-FUNC-019 (Admin prompts test runner)
- **Severity:** P1
- **File:** `frontend/src/pages/AdminPrompts.tsx`
- **Lines:** 379-403
- **What's wrong:** `pollTestRun` defines an inner `poll` function that calls itself via `setTimeout(poll, 2000)`. There is no way to cancel this recursive timeout chain when the component unmounts or when the user closes the modal.
- **Problematic code:**
  ```ts
  const pollTestRun = useCallback(async (testRunId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/admin/prompts/test/${testRunId}`, ...);
        const data = await res.json();
        setTestRun(data.testRun);
        if (data.testRun.status === 'running') {
          setTimeout(poll, 2000); // No cleanup reference
        } else {
          setRunningTest(false);
        }
      } catch (err) { ... }
    };
    poll();
  }, []);
  ```
- **Impact:** If the user navigates away while a test is running, the recursive polling continues indefinitely, causing state updates on unmounted components. The timeout ID is never captured so it cannot be cleared.
- **Suggested fix:** Store the timeout ID in a ref and clear it on unmount via a cleanup function in useEffect.

---

### F-005: ResearchDetail reads window.location.hash directly instead of using props

- **Test Case:** UI-FUNC-010 (ResearchDetail section rendering)
- **Severity:** P1
- **File:** `frontend/src/pages/ResearchDetail.tsx`
- **Lines:** 135-136
- **What's wrong:** `ResearchDetail` reads `window.location.hash` directly to extract the job ID instead of receiving it as a prop or deriving it from the parent's `currentPath` state. This breaks the unidirectional data flow pattern and creates a tight coupling to the hash-based routing implementation.
- **Problematic code:**
  ```ts
  const hash = window.location.hash;
  const id = hash.split('/research/')[1];
  ```
- **Impact:** (1) The component cannot be tested in isolation without setting `window.location.hash`. (2) If the routing strategy changes from hash to history-based, this component breaks. (3) There is a potential race condition where `currentPath` state (set by the parent) and `window.location.hash` could momentarily disagree during the `navigate` function in App.tsx (lines 32-38), since `setCurrentPath` is asynchronous but `window.location.hash` is synchronous.
- **Suggested fix:** Pass the job ID as a prop from App.tsx:
  ```tsx
  <ResearchDetail jobId={currentPath.split('/research/')[1]} ... />
  ```

---

### F-006: Fallback route in App.tsx missing onCancel prop

- **Test Case:** UI-FUNC-001 (Navigation/routing)
- **Severity:** P1
- **File:** `frontend/src/App.tsx`
- **Line:** 94
- **What's wrong:** The fallback route (line 94) renders `<Home>` but does not pass the `onCancel` prop, while the primary `/` route (line 47) does. This means if a user lands on an unknown route and gets redirected to the Home fallback, the cancel button on running jobs will either throw an error or silently fail.
- **Problematic code:**
  ```tsx
  // Primary route (correct):
  <Home jobs={jobs} reportBlueprints={...} onNavigate={navigate} onCancel={cancelJob} onDelete={deleteJob} />

  // Fallback route (missing onCancel):
  <Home jobs={jobs} reportBlueprints={...} onNavigate={navigate} onDelete={deleteJob} />
  ```
- **Impact:** Users on the fallback route cannot cancel running jobs. If the Home component calls `onCancel` without checking if it exists, this will throw a runtime error.
- **Suggested fix:** Add `onCancel={cancelJob}` to the fallback Home component.

---

### F-007: No fetch error handling or credentials in multiple API calls

- **Test Case:** UI-STATE-007 (Error state handling)
- **Severity:** P1
- **File:** `frontend/src/services/researchManager.ts` and `frontend/src/services/newsManager.ts`
- **Lines:** Multiple
- **What's wrong:** Many `fetch` calls across both service files do not include `credentials: 'include'` or an `Authorization` header. If the app relies on cookies for authentication, the requests will work only if `credentials: 'same-origin'` is the default (which it is for same-origin requests). However, if the API is on a different origin or subdomain, all authenticated requests will fail silently. Additionally, several standalone API functions (e.g., `toggleArticleSent`, `archiveArticle`, `bulkArchiveArticles`, `bulkSendArticles` in newsManager.ts) lack try/catch wrappers, letting errors propagate unhandled to the UI.
- **Impact:** API calls may fail silently or throw unhandled promise rejections depending on deployment configuration. Cross-origin deployments would require explicit credential handling.
- **Suggested fix:** Standardize fetch calls through a shared wrapper that handles credentials and common error patterns.

---

### F-008: fetchMetrics in AdminMetrics has missing dependency in useEffect

- **Test Case:** UI-FUNC-018 (Admin metrics page)
- **Severity:** P1
- **File:** `frontend/src/pages/AdminMetrics.tsx`
- **Lines:** 94-96
- **What's wrong:** The `useEffect` depends on `[selectedYear, selectedMonth, selectedGroup, selectedReportType]` and calls `fetchMetrics`, but `fetchMetrics` is not in the dependency array. While `fetchMetrics` reads those state values via closure, the function itself is recreated on every render, meaning ESLint exhaustive-deps would flag this. More critically, `fetchMetrics` is defined as a regular async function (not wrapped in `useCallback`), so it captures stale closures.
- **Problematic code:**
  ```ts
  useEffect(() => {
    fetchMetrics();
  }, [selectedYear, selectedMonth, selectedGroup, selectedReportType]);
  ```
- **Impact:** The code works in practice because the state values are read at call time, but this pattern is fragile and violates React best practices. Future refactoring could introduce stale closure bugs.
- **Suggested fix:** Wrap `fetchMetrics` in `useCallback` with the filter dependencies, or inline the fetch logic within the `useEffect`.

---

## P2 -- Medium

### F-009: navigate function sets state then hash (potential race condition)

- **Test Case:** UI-FUNC-001 (Hash-based navigation)
- **Severity:** P2
- **File:** `frontend/src/App.tsx`
- **Lines:** 32-38
- **What's wrong:** The `navigate` function calls `setCurrentPath(path)` (async state update) then synchronously sets `window.location.hash = path`. This triggers a `hashchange` event which the `useEffect` listener (line 23) handles by calling `setCurrentPath` again with the same value. This is a redundant double-set that could cause a brief flicker or extra re-render.
- **Problematic code:**
  ```ts
  const navigate = (path: string) => {
    setCurrentPath(path);
    if (path === '/new') { setNavResetKey((k) => k + 1); }
    window.location.hash = path;
  };
  ```
- **Impact:** Minor: extra re-render on every navigation. The double `setCurrentPath` is harmless (React batches same-value updates) but represents unnecessary work.
- **Suggested fix:** Either remove the `setCurrentPath` from `navigate` and rely on the hashchange listener, or add a guard in the hashchange handler to skip if the value hasn't changed.

---

### F-010: Variable name `id` shadows filter callback parameter

- **Test Case:** UI-FUNC-010 (ResearchDetail section display)
- **Severity:** P2
- **File:** `frontend/src/pages/ResearchDetail.tsx`
- **Lines:** 136, 154
- **What's wrong:** The component-level `const id = hash.split('/research/')[1]` (line 136) is shadowed by the filter callback parameter `(id) => job.selectedSections?.includes(id)` on line 154. While this works because the callback's `id` is scoped to the arrow function, it is confusing and error-prone for future developers.
- **Problematic code:**
  ```ts
  const id = hash.split('/research/')[1]; // line 136
  // ...
  .filter((id) => job.selectedSections?.includes(id)); // line 154 - shadows outer id
  ```
- **Impact:** Readability issue. A developer might accidentally reference the wrong `id` during refactoring.
- **Suggested fix:** Rename the outer variable to `jobId` or the callback parameter to `sectionId`.

---

### F-011: useEffect in AdminPricing calls fetchRates without stable reference

- **Test Case:** UI-FUNC-017 (Admin pricing CRUD)
- **Severity:** P2
- **File:** `frontend/src/pages/AdminPricing.tsx`
- **Lines:** 41-43
- **What's wrong:** `fetchRates` is called inside `useEffect(() => { fetchRates(); }, [])` but `fetchRates` is defined as a regular async function, not wrapped in `useCallback`. ESLint exhaustive-deps would flag this. The empty dependency array means it only runs once, which is correct behavior, but the pattern is fragile.
- **Problematic code:**
  ```ts
  useEffect(() => {
    fetchRates();
  }, []);
  ```
- **Impact:** Minor: works correctly in practice but is an anti-pattern that could break with StrictMode or future refactoring.
- **Suggested fix:** Either wrap `fetchRates` in `useCallback` or inline the fetch logic.

---

### F-012: Blocking confirm() and alert() calls throughout the codebase

- **Test Case:** UI-FUNC-005 (Cancel job), UI-FUNC-006 (Delete job), UI-FUNC-015-019 (Admin pages)
- **Severity:** P2
- **Files:** `Home.tsx`, `AdminUsers.tsx`, `AdminPricing.tsx`, `AdminPrompts.tsx`, `NewsSetup.tsx`, `NewsDashboard.tsx`
- **Lines:** Multiple (e.g., Home.tsx cancel/delete, AdminUsers.tsx delete, NewsSetup.tsx lines 128, 133, 393, 412)
- **What's wrong:** The application uses native `window.confirm()` and `window.alert()` for user confirmations and error messages. These are synchronous, blocking calls that freeze the entire browser tab.
- **Impact:** (1) Poor UX -- blocking dialogs cannot be styled and look inconsistent across browsers. (2) In production, `alert()` for error messages blocks all JavaScript execution. (3) Cannot be automated in E2E tests without special handling.
- **Suggested fix:** Replace with a custom confirmation modal component (similar to the existing `BugTrackerModal` or `CompanyResolveModal` pattern).

---

### F-013: News articles fetched without pagination

- **Test Case:** UI-FUNC-020 (News dashboard filtering)
- **Severity:** P2
- **File:** `frontend/src/services/newsManager.ts`
- **Lines:** (useNewsArticles hook)
- **What's wrong:** The `useNewsArticles` hook fetches articles from the API and stores all of them in state. There is no pagination, infinite scroll, or limit parameter visible. If the number of news articles grows large, this will cause performance issues.
- **Impact:** As the article count grows, initial load time increases, memory usage grows, and the DOM becomes heavy with all article cards rendered at once.
- **Suggested fix:** Add pagination parameters to the API call and implement virtual scrolling or "load more" functionality.

---

### F-014: No loading state exposed by useResearchManager for initial job fetch

- **Test Case:** UI-STATE-006 (Loading state management)
- **Severity:** P2
- **File:** `frontend/src/services/researchManager.ts`
- **Lines:** 1428
- **What's wrong:** The `useResearchManager` hook returns `{ jobs, createJob, runJob, rerunJob, cancelJob, deleteJob }` but does not expose a `loading` state. The initial job list is populated by polling (started externally), so there is no way for the UI to know if jobs have been fetched yet vs. the list is genuinely empty. Compare with `useUserContext` which properly exposes `loading`.
- **Impact:** The Home page cannot distinguish between "loading jobs" and "no jobs exist". Users see an empty state briefly before jobs appear, which could be confusing.
- **Suggested fix:** Add a `loading` state to `useResearchManager` and expose it in the return value.

---

### F-015: Shared editName/editTicker/editTitle state in NewsSetup causes conflicts

- **Test Case:** UI-FUNC-023 (News setup company/person editing)
- **Severity:** P2
- **File:** `frontend/src/pages/NewsSetup.tsx`
- **Lines:** 91-94
- **What's wrong:** The `editName`, `editTicker`, `editTitle`, and `editCompanyId` states are shared between the "Edit Company" and "Edit Person" modals. If both modals could theoretically be open simultaneously (e.g., via a race condition or fast double-click), they would share and overwrite each other's state.
- **Problematic code:**
  ```ts
  const [editName, setEditName] = useState('');
  const [editTicker, setEditTicker] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  ```
- **Impact:** Low risk in practice since modals are mutually exclusive, but the pattern is fragile. If the `editingCompany` and `editingPerson` guards were ever removed or relaxed, data corruption would occur.
- **Suggested fix:** Use separate state objects for each modal, or encapsulate modal state in a reducer.

---

### F-016: continueAfterResolve reads stale validCompanyInputs closure

- **Test Case:** UI-FUNC-023 (News setup save with company resolution)
- **Severity:** P2
- **File:** `frontend/src/pages/NewsSetup.tsx`
- **Lines:** 238-254
- **What's wrong:** `continueAfterResolve` iterates over `validCompanyInputs` which is derived from `companyInputs` at render time. However, inside the async loop, `setCompanyInputs` is called to update names (line 247), but `validCompanyInputs` still holds the original snapshot from the render cycle. The loop uses the stale list for iteration bounds and indexing.
- **Problematic code:**
  ```ts
  const continueAfterResolve = async (startIndex: number) => {
    for (let i = startIndex; i < validCompanyInputs.length; i++) {
      const company = validCompanyInputs[i]; // Stale closure
      const resolved = await resolveCompanyName(company.name, i);
      // ...
    }
  };
  ```
- **Impact:** If company resolution modifies the input array (adding/removing items), the loop could skip items or access incorrect indices. In the current flow this is mitigated because only the `name` field is updated, not the array structure.
- **Suggested fix:** Pass the current inputs as a parameter or use a ref to track the latest value.

---

### F-017: No error boundary for route-level components

- **Test Case:** UI-RENDER-004 (Error state rendering)
- **Severity:** P2
- **File:** `frontend/src/App.tsx`
- **Lines:** 40-95
- **What's wrong:** The `renderContent` function renders route-level components without any React Error Boundary wrapping. If any page component throws during rendering (e.g., due to unexpected data shapes from the API), the entire application crashes with a white screen.
- **Impact:** A single rendering error in any page (ResearchDetail, NewsDashboard, Admin pages, etc.) takes down the entire application. Users must manually refresh to recover.
- **Suggested fix:** Wrap `renderContent()` output in a React Error Boundary that shows a fallback error UI and allows recovery.

---

### F-018: useCallback dependency array is empty for several callbacks

- **Test Case:** UI-STATE-009 (navResetKey and wizard reset)
- **Severity:** P2
- **File:** `frontend/src/services/researchManager.ts`
- **Lines:** 1240 (createJob), 1299 (runJob), 1404 (cancelJob), 1422 (deleteJob)
- **What's wrong:** `createJob`, `runJob`, `cancelJob`, and `deleteJob` are all wrapped in `useCallback(async (...) => { ... }, [])` with empty dependency arrays. They close over `setJobs` (stable from useState) and API functions (module-level, stable), so this is technically correct. However, if any of these callbacks ever needed to reference other state or props, the empty array would cause stale closure bugs.
- **Impact:** Currently safe, but fragile. The pattern makes it easy to accidentally introduce stale closures during future maintenance.
- **Suggested fix:** This is acceptable as-is since the closed-over values are all stable references. Document this assumption in comments.

---

## P3 -- Low

### F-019: StatusPill has no fallback for unknown status values

- **Test Case:** UI-RENDER-001 (StatusPill rendering for all statuses)
- **Severity:** P3
- **File:** `frontend/src/components/StatusPill.tsx`
- **Lines:** 11-42
- **What's wrong:** The `styles`, `icons`, and `labels` objects use explicit keys matching known status values. If the backend ever returns a new status value not in this map (e.g., `'paused'`), the component will render `undefined` for style, icon, and label, resulting in a broken display.
- **Impact:** Low risk currently since all status values are well-defined, but a backend change adding new statuses would break the UI without any visible error message.
- **Suggested fix:** Add a default/fallback case:
  ```ts
  const style = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const icon = icons[status] || <Clock size={12} />;
  const label = labels[status] || status;
  ```

---

### F-020: Home page logo token fetched on every mount

- **Test Case:** UI-FUNC-002 (Home page job list display)
- **Severity:** P3
- **File:** `frontend/src/pages/Home.tsx`
- **Lines:** (useEffect for /config endpoint)
- **What's wrong:** The Home page fetches a logo token from `/config` on every mount. This is a stable value that could be cached or fetched once at the app level.
- **Impact:** Minor: unnecessary API call on every navigation to the home page.
- **Suggested fix:** Lift the config fetch to App.tsx and pass it down, or cache it in localStorage/sessionStorage.

---

### F-021: Modal backdrop click doesn't close modals in NewsSetup

- **Test Case:** UI-FUNC-023 (News setup modals)
- **Severity:** P3
- **File:** `frontend/src/pages/NewsSetup.tsx`
- **Lines:** 1198-1259 (Edit Company Modal), 1262-1340 (Edit Person Modal)
- **What's wrong:** The edit company and edit person modals in NewsSetup use a fixed backdrop (`<div className="fixed inset-0 ...">`) but do not have an `onClick` handler on the backdrop to close the modal. By contrast, `UserAddModal` and `UserEditModal` have `onClick={(e) => e.stopPropagation()}` on the modal content (which implies the backdrop should have a close handler), and `CompanyResolveModal` has an explicit `onCancel` callback. The NewsSetup modals can only be closed via the X button or Cancel button.
- **Impact:** Minor UX inconsistency -- users who expect to click outside a modal to close it will be surprised.
- **Suggested fix:** Add `onClick={onClose}` to the backdrop div and `onClick={(e) => e.stopPropagation()}` on the modal content.

---

### F-022: UserEditModal stopPropagation on content div but no close handler on backdrop

- **Test Case:** UI-FUNC-016 (Admin user edit)
- **Severity:** P3
- **File:** `frontend/src/components/UserEditModal.tsx`
- **Line:** 80
- **What's wrong:** The modal content div has `onClick={(e) => e.stopPropagation()}` which prevents clicks from propagating to the backdrop. However, the backdrop div (`<div className="fixed inset-0 bg-black/50 ...">`) does not have an `onClick={onClose}` handler. The `stopPropagation` is therefore pointless -- it prevents propagation to nowhere.
- **Impact:** Users cannot close the modal by clicking outside it. The Escape key handler works (line 36), but the backdrop click pattern is incomplete.
- **Suggested fix:** Add `onClick={onClose}` to the outer backdrop div.

---

### F-023: console.error calls in production code

- **Test Case:** UI-STATE-007 (Error state handling)
- **Severity:** P3
- **Files:** `researchManager.ts`, `newsManager.ts`, `AdminPrompts.tsx`, `NewsSetup.tsx`, `NewsDashboard.tsx`, `Layout.tsx`
- **Lines:** Multiple
- **What's wrong:** Multiple files use `console.error()` for error logging (e.g., researchManager.ts line 1336, 1417, 1444; Layout.tsx line 38; AdminPrompts.tsx line 397; NewsSetup.tsx line 216; NewsDashboard.tsx line 314). While useful during development, these log statements leak implementation details in production.
- **Impact:** Error details visible in browser console to any user. No structured error reporting or monitoring integration.
- **Suggested fix:** Replace with a structured logging utility that can be configured per environment, or integrate with an error tracking service (e.g., Sentry).

---

### F-024: No keyboard accessibility for custom checkbox/radio buttons in NewsSetup

- **Test Case:** UI-RENDER-003 (Accessibility)
- **Severity:** P3
- **File:** `frontend/src/pages/NewsSetup.tsx`
- **Lines:** 760-777, 808-821, 1018-1031
- **What's wrong:** The custom-styled checkboxes for company/person selection are implemented as `<button>` elements with visual checkmark SVGs, but they lack `role="checkbox"`, `aria-checked`, and `aria-label` attributes. Screen readers cannot determine the purpose or state of these controls.
- **Impact:** Accessibility violation (WCAG 2.1 Level A, criterion 4.1.2). Users relying on assistive technology cannot interact with the selection checkboxes.
- **Suggested fix:** Add `role="checkbox"`, `aria-checked={isSelected}`, and `aria-label="Select {name}"` to each custom checkbox button.

---

### F-025: Topic toggle checkboxes in NewsSetup use div click handler instead of native checkbox

- **Test Case:** UI-RENDER-003 (Accessibility)
- **Severity:** P3
- **File:** `frontend/src/pages/NewsSetup.tsx`
- **Lines:** 1126-1147
- **What's wrong:** The topic/tag toggle is implemented as a `<div>` row with an `onClick` handler and a visual-only checkbox indicator. There is no actual `<input type="checkbox">` or `role="checkbox"` attribute. The cursor style is set to `cursor-pointer` which is good, but the element is not focusable via keyboard (no `tabIndex`).
- **Impact:** Cannot be toggled via keyboard navigation (Tab + Space/Enter).
- **Suggested fix:** Use a native `<input type="checkbox">` element or add `role="checkbox"`, `tabIndex={0}`, and `onKeyDown` handler for Space/Enter keys.

---

### F-026: AdminMetrics Tooltip formatter type assertion may fail

- **Test Case:** UI-FUNC-018 (Admin metrics chart rendering)
- **Severity:** P3
- **File:** `frontend/src/pages/AdminMetrics.tsx`
- **Line:** 343
- **What's wrong:** The Recharts Tooltip `formatter` callback types the value as `number` (`(value: number) => ...`), but Recharts actually passes `number | string | Array<number | string>`. If the value is a string (which can happen with some Recharts configurations), `value.toFixed(1)` will throw a runtime error.
- **Problematic code:**
  ```ts
  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
  ```
- **Impact:** Low risk -- in the current usage, the `successRatePct` dataKey is always a number. But the type assertion is incorrect and could break if chart configuration changes.
- **Suggested fix:** Add a runtime check: `typeof value === 'number' ? value.toFixed(1) : value`.

---

## Test Case Coverage Summary

### UI-FUNC Tests

| ID | Description | Status | Findings |
|----|-------------|--------|----------|
| UI-FUNC-001 | Hash-based navigation | PASS (with note) | F-009 (P2), F-006 (P1) |
| UI-FUNC-002 | Home page job list display | PASS (with note) | F-020 (P3) |
| UI-FUNC-003 | Home page search and filtering | PASS | No issues found |
| UI-FUNC-004 | Home page company grouping | PASS | No issues found |
| UI-FUNC-005 | Cancel running job | FAIL | F-001 (P0) |
| UI-FUNC-006 | Delete job | PASS | F-012 (P2) uses confirm() |
| UI-FUNC-007 | NewResearch wizard - company resolve | PASS | No issues found |
| UI-FUNC-008 | NewResearch wizard - report type selection | PASS | No issues found |
| UI-FUNC-009 | NewResearch wizard - section selection | PASS | No issues found |
| UI-FUNC-010 | ResearchDetail - section rendering | PASS (with note) | F-005 (P1), F-010 (P2) |
| UI-FUNC-011 | ResearchDetail - rerun sections | PASS | No issues found |
| UI-FUNC-012 | ResearchDetail - PDF export | PASS | No issues found |
| UI-FUNC-013 | ResearchDetail - markdown rendering | PASS | No issues found |
| UI-FUNC-014 | ResearchDetail - confidence display | PASS | No issues found |
| UI-FUNC-015 | Admin users - CRUD | PASS | F-012 (P2) |
| UI-FUNC-016 | Admin users - edit modal | PASS (with note) | F-022 (P3) |
| UI-FUNC-017 | Admin pricing - CRUD | PASS (with note) | F-011 (P2) |
| UI-FUNC-018 | Admin metrics - charts and filters | PASS (with note) | F-008 (P1), F-026 (P3) |
| UI-FUNC-019 | Admin prompts - test runner | PASS (with note) | F-004 (P1) |
| UI-FUNC-020 | News dashboard - filtering | PASS (with note) | F-013 (P2) |
| UI-FUNC-021 | News dashboard - refresh/deep dive | PASS | No issues found |
| UI-FUNC-022 | News dashboard - send email | FAIL | F-002 (P0) |
| UI-FUNC-023 | News setup - company/person management | PASS (with note) | F-015 (P2), F-016 (P2), F-021 (P3) |
| UI-FUNC-024 | Bug tracker modal | PASS | No issues found |

### UI-RENDER Tests

| ID | Description | Status | Findings |
|----|-------------|--------|----------|
| UI-RENDER-001 | StatusPill renders all statuses | PASS (with note) | F-019 (P3) |
| UI-RENDER-002 | Empty states display properly | PASS | No issues found |
| UI-RENDER-003 | Long names / special characters | PASS (with note) | F-024 (P3), F-025 (P3) |
| UI-RENDER-004 | Error state rendering | FAIL | F-017 (P2) |
| UI-RENDER-005 | Layout admin vs non-admin nav | PASS | No issues found |

### UI-STATE Tests

| ID | Description | Status | Findings |
|----|-------------|--------|----------|
| UI-STATE-001 | useResearchManager polling | PASS (with note) | F-003 (P1) |
| UI-STATE-002 | useResearchManager createJob | PASS | No issues found |
| UI-STATE-003 | useUserContext | PASS | No issues found |
| UI-STATE-004 | useReportBlueprints | PASS | No issues found |
| UI-STATE-005 | useNewsArticles | PASS (with note) | F-013 (P2) |
| UI-STATE-006 | Loading state management | PASS (with note) | F-014 (P2) |
| UI-STATE-007 | Error state handling | PASS (with note) | F-007 (P1), F-023 (P3) |
| UI-STATE-008 | Stale data handling | PASS (with note) | F-018 (P2) |
| UI-STATE-009 | navResetKey wizard reset | PASS | No issues found |
| UI-STATE-010 | Revenue owners / news hooks | PASS | No issues found |

---

## Cross-Team Investigation: ISSUE-006 (Admin Prompt Editor Non-Functional)

**Requested by:** team-lead (LLM pipeline audit P2 finding ISSUE-006)

The LLM pipeline audit found that `buildStagePrompt` in the orchestrator calls code-based prompt builders directly, ignoring DB prompt overrides from `prompt-resolver.ts`. This means the entire Admin Prompt management UI is effectively non-functional -- admins can create/edit/publish prompts but they have zero effect on actual research jobs.

**Frontend impact: HIGH -- The UI actively misleads administrators into believing published prompts are live.**

The `AdminPrompts.tsx` page contains **six distinct UI elements** that falsely communicate that prompt overrides are active:

1. **Green "Override Published" status badge** (lines 425-431): When a prompt override is published, a green badge with a checkmark icon displays "Override Published". Green + checkmark is a universal "active/success" indicator. This directly implies the override is being used in research jobs.
   ```tsx
   case 'published':
     return (
       <span className="... bg-green-100 text-green-700">
         <Check className="w-3 h-3 mr-1" />
         Override Published
       </span>
     );
   ```

2. **"How Prompt Overrides Work" info box** (lines 478-491): The explanatory box states:
   - *"Database Override = Your custom version that **takes priority when published**"* (line 485)
   - *"Save as Draft to test changes, then **Publish to make them live**"* (line 486)
   Both statements are factually false since the orchestrator never reads DB overrides.

3. **Edit modal helper text** (line 824): *"This override will be used instead of the code default when published"* -- explicitly promises behavior that does not exist.

4. **Green "Publish Override" button** (lines 1072-1080): A prominent green button with a checkmark icon labeled "Publish Override". The entire publish action is a no-op in terms of actual research output.
   ```tsx
   <button onClick={handlePublish} className="... bg-green-600 ...">
     <Check className="w-4 h-4" />
     {publishing ? 'Publishing...' : 'Publish Override'}
   </button>
   ```

5. **"Delete Override (Revert to Code Default)" button** (line 1052): This text implies switching from an active override back to code default, but the code default is always being used regardless of override status.

6. **The entire draft-to-publish workflow**: The Save as Draft (line 1069) -> Publish (line 1078) workflow gives admins a false sense of staged deployment control, as if drafts are staging and publishing makes changes live.

**Severity assessment:** From the frontend perspective, this warrants P1 treatment (not the P2 assigned by the pipeline audit) because the UI is actively deceptive, not just passively broken. An admin who publishes a prompt override receives full visual confirmation that it's live:
- Green badge with checkmark appears on the prompt listing
- No error messages or warnings
- The info box explicitly tells them published overrides "take priority"

This could lead to:
- Admins spending hours crafting and refining prompts that are never used
- Admins believing they've addressed a prompt quality issue when they haven't
- Loss of trust in the admin tooling when the disconnect is eventually discovered

**Recommendation:** If the backend fix (wiring `prompt-resolver.ts` into `buildStagePrompt`) is not imminent:
1. Add a warning banner to AdminPrompts.tsx: *"Prompt overrides are not currently connected to the research pipeline. Published overrides will not affect research output until a backend update is deployed."*
2. Disable or visually de-emphasize the Publish button with a tooltip explaining the limitation.
3. At minimum, revise the info box text (lines 483-488) to remove the false claims about overrides "taking priority" and being "made live."

---

## Cross-Team Investigation: REG-001 (Backend sectionMap Inconsistency)

**Requested by:** team-lead (backend audit P0 finding REG-001)

The backend audit found that `list.ts` and `detail.ts` have inconsistent `sectionMap` objects:
- `list.ts` maps 10 stages (omits `key_execs_and_board`), returns as `generatedSections: number[]`
- `detail.ts` maps 11 stages (includes `key_execs_and_board=4`), returns as `sectionsCompleted: number[]`

This shifts all section numbers after position 3 by +1 between the two endpoints.

**Frontend impact: LOW -- No visible UI inconsistency.**

Analysis:
1. **`generatedSections`** (from list.ts): Used in `mapListItem` at `researchManager.ts:1097` **only for `.length`** (count), not for the specific numeric values. It feeds fallback progress calculation: `Math.round((generated.length / fallbackTotal) * 100)`. The actual section numbers are never inspected or displayed.

2. **`sectionsCompleted`** (from detail.ts): Defined in the `ApiResearchDetail` type at `researchManager.ts:52` but **never read** in any frontend logic. The `mergeDetail` function (line 1182) does not reference this field. It is dead data on the frontend.

3. **The frontend maps sections by stage name** (string identifiers like `exec_summary`, `financial_snapshot`, etc.) via the `sectionStatuses` array and `mapSections` function, NOT by section numbers. The numeric `sectionMap` in the backend is a legacy abstraction the frontend does not consume.

**Conclusion:** While the backend inconsistency is a real bug (REG-001 is valid), it does **not** cause any visible UI inconsistency because the frontend ignores section numbers entirely. The `key_execs_and_board` section would only be missed in the `generatedSections.length` count from list.ts, which could cause the fallback progress bar to undercount by 1 section during the brief window before the `progress` field (preferred source) is populated.

---

## Cross-Domain Issues (Flagged for Other Teams)

1. **Security team (F-002):** XSS vulnerability in email HTML generation -- article data from API injected without sanitization.
2. **Backend team (F-007):** Frontend fetch calls lack consistent credential/auth handling -- verify backend CORS and auth middleware expectations.
3. **Backend team (F-001):** cancelJob behavior suggests backend may not have clear cancel semantics -- verify `POST /jobs/:id/cancel` response contract.
4. **Backend team (REG-001):** sectionMap inconsistency between list.ts and detail.ts is a real backend bug, but frontend impact is negligible (see investigation above). The `generatedSections` count from list.ts may undercount by 1 for jobs with `key_execs_and_board` during fallback progress calculation.
5. **LLM pipeline team (ISSUE-006):** AdminPrompts.tsx actively misleads admins with 6 distinct UI elements claiming published overrides are "live" and "take priority." Frontend recommends P1 severity for the UI deception aspect. Either the backend should be wired to read DB overrides, or the frontend must add warnings/disable the publish flow. See detailed investigation above.
