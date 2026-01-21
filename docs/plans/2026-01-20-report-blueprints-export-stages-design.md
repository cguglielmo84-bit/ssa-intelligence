# Report Blueprints PDF Export + Stage Tracking Design

Date: 2026-01-20
Owner: Codex
Branch: feat/report-blueprints

## Summary
Align PDF export to the report blueprint + selected sections, omit failed sections, and add robust stage ID tracking while preserving legacy numeric arrays.

## Goals
- Export the exact sections shown on the report page (blueprint order + selected sections).
- Omit failed sections from PDF output.
- Allow export for jobs in completed_with_errors.
- Ensure report-specific sections appear in exports (e.g., PE/FS sections).
- Add stage-id arrays (string) for completion tracking while keeping legacy numeric arrays.

## Non-goals
- Change prompt schemas or section content definitions.
- Remove existing numeric arrays yet (backward compatibility required).
- Alter UI behavior beyond data shape updates.

## Current Behavior (Observed)
- PDF export uses a fixed sectionOrder and legacy field mapping only.
- Report-specific sections do not appear in PDF export.
- Export rejects completed_with_errors jobs.
- sectionsCompleted/generatedSections only map legacy numeric sections.

## Proposed Changes

### 1) PDF Export Uses Blueprint + Selected Sections
- Build the export section list from the job's reportType blueprint.
- Filter to job.selectedSections when present.
- Preserve blueprint order.
- If selectedSections is empty, fall back to blueprint defaults.
- Omit failed sections by filtering to subJobs with status === 'completed' (foundation excluded).
- Allow export for status in ['completed', 'completed_with_errors'].

### 2) Export Section Content Source
- For each section:
  - Use job field if present (legacy sections).
  - Otherwise, fall back to subJob.output for report-specific sections.
- If content is missing, keep the placeholder: "No content generated for this section."

### 3) Extend Section Formatter for Report-Specific Sections
- Expand backend section formatter to include PE/FS-only sections.
- Port formatting logic from frontend formatter to keep PDF output consistent.
- Sections to add:
  - investment_strategy
  - portfolio_snapshot
  - deal_activity
  - deal_team
  - portfolio_maturity
  - leadership_and_governance
  - strategic_priorities
  - operating_capabilities

### 4) Stage-Id Arrays for Completion Tracking
- Keep existing numeric arrays for backward compatibility.
- Add string arrays:
  - GET /api/research/:id -> completedStages
  - GET /api/research -> generatedStages
- Populate from subJobs where status === 'completed' and stage !== 'foundation'.
- If job.selectedSections exists, filter to those sections.

## API Changes
- export PDF: include completed_with_errors.
- research detail response: add completedStages.
- research list response: add generatedStages.

## Data Flow
1) Fetch job + subJobs in export endpoint.
2) Load blueprint by reportType.
3) Determine ordered export sections (blueprint order filtered by selectedSections).
4) Filter out failed sections (only completed subJobs).
5) For each section, assemble content from job field or subJob.output.
6) Format content via backend section-formatter and render PDF.

## Error Handling
- If blueprint missing, fall back to legacy section order.
- If no selectedSections, use blueprint defaults.
- If completedStages list is empty, return [].

## Testing
- Unit tests for export selection helper:
  - respects blueprint order
  - respects selectedSections
  - omits failed sections
  - falls back to subJob.output for report-specific sections
- Unit tests for completedStages/generateStages helper:
  - excludes foundation
  - includes report-specific sections
  - respects selectedSections
- Manual: generate completed_with_errors job and confirm PDF matches report UI and omits failed sections.

## Rollout Notes
- Backward compatibility preserved via legacy numeric arrays.
- New string arrays can be adopted by frontend later.
