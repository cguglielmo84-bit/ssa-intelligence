# Research Brief Guardrails

## Defaults
- `reportType`: defaults to `GENERIC` when omitted.
- `visibilityScope`: defaults to `PRIVATE` when omitted.
- `selectedSections`: defaults to the full section set for the selected report type when omitted.
- `appendix`: always included; dependencies are auto-added.
- `groupIds`: ignored unless `visibilityScope` is `GROUP`.

## Validation and errors
- `reportType` must be one of `GENERIC`, `INDUSTRIALS`, `PE`, `FS`.
- `visibilityScope` must be one of `PRIVATE`, `GROUP`, `GENERAL`.
- `selectedSections` must be valid section IDs.
- When `visibilityScope` is `GROUP`, at least one `groupId` is required.
- Non-admin users can only share to groups they are members of.
- At least one non-appendix section must be selected.

## Visibility rules
- `PRIVATE`: only the creator can access.
- `GROUP`: creator + group members can access.
- `GENERAL`: any authenticated user with `ssaandco.com` email can access.
