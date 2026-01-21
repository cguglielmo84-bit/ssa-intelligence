# Research Brief Guardrails

This document reflects defaults and validation for `POST /api/research/generate`.

## Defaults
- `reportType` defaults to `GENERIC`.
- `geography` defaults to `Global` if missing or invalid.
- `visibilityScope` defaults to `PRIVATE`.
- `selectedSections` defaults to the blueprint defaults for the chosen report type.
- Dependencies are auto-added and `appendix` is always included.
- `foundation` always runs (not user-selectable).
- `blueprintVersion` and `reportInputs` are stored on the job metadata but not strictly validated by the API.
- `userAddedPrompt` is trimmed if provided.

## Validation and errors
- `companyName` must be at least 2 characters and contain alphanumeric characters.
- `reportType` must be one of `GENERIC`, `INDUSTRIALS`, `PE`, `FS`.
- `selectedSections` must be valid section ids for the selected report type.
- Missing dependencies are rejected (for example `exec_summary` requires `financial_snapshot` and `company_overview`, `peer_benchmarking` requires `financial_snapshot`).
- `visibilityScope` must be one of `PRIVATE`, `GROUP`, `GENERAL`.
- When `visibilityScope` is `GROUP`, at least one `groupId` is required.
- Non-admin users can only share to groups they belong to; admins can share to any existing group.

## Duplicate protection
- If a job already exists with the same normalized company + geography + industry + reportType in `queued`, `running`, or `completed` status, the API returns `409`.
- `force` only allows a new job when the existing job is `completed`; it does not override `queued` or `running` jobs.

## Visibility rules
- `PRIVATE`: only the creator can access.
- `GROUP`: creator + members of the assigned groups.
- `GENERAL`: any authenticated user in an allowed email domain.
- Admins can access all jobs.