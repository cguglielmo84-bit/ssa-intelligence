# Report Type Addendums

Addendums are injected into section prompts based on `reportType` to shift focus and tone without changing schemas.

Source of truth: `backend/prompts/report-type-addendums.ts`.

## How addendums are applied
- `appendReportTypeAddendum` inserts the report-specific block under `## CRITICAL INSTRUCTIONS`.
- If the marker does not exist, the addendum is appended at the end of the prompt.

## Guardrails
- Base prompts stay neutral and generic.
- Industrials addendums should preserve baseline style and scope.
- FS and PE addendums should align with their brief specs and report blueprints.
- Generic addendums should emphasize concision and meeting context.

## Update workflow
1. Update `backend/prompts/report-type-addendums.ts`.
2. Validate intent against `docs/brief-specs/` and `docs/report-blueprints/`.
3. Spot-check sections via a local run to confirm tone and scope.