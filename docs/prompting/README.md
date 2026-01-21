# Prompting System Guide

This folder is the home base for how prompts, report types, and addendums fit together.

## Canonical sources
- `backend/prompts/*.ts` for prompt builders
- `backend/prompts/validation.ts` for schemas
- `backend/prompts/report-type-addendums.ts` for report-type addendums
- `backend/src/services/report-blueprints.ts` for report type inputs and defaults
- `backend/src/services/orchestrator.ts` for stage ids and dependencies

## How the system flows
- The frontend pulls report blueprints from `GET /api/report-blueprints`.
- Job creation stores `reportType`, `selectedSections`, `reportInputs`, and `blueprintVersion`.
- The orchestrator expands selected sections with dependencies and always adds `foundation` and `appendix`.
- Each section prompt is built and then augmented with its report-type addendum.
- Base section outputs are stored on `ResearchJob`; report-specific section outputs live on `ResearchSubJob.output` and are surfaced by the API.

## Where to go next
- `docs/prompting/report-types.md` for report types and default sections
- `docs/prompting/sections.md` for stage ids, dependencies, and storage notes
- `docs/prompting/addendums.md` for addendum behavior and editing guidance
- `docs/brief-specs/` for section-level intent by report type
- `docs/report-blueprints/` for human-readable blueprint writeups
- `docs/kpi-tables.md` for required KPI rows by report type
- `docs/RESEARCH-BRIEF-GUARDRAILS.md` for API defaults and validation