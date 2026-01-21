# Report Blueprints

Human-readable summaries of report type blueprints used by the API.

Source of truth:
- `backend/src/services/report-blueprints.ts`
- `GET /api/report-blueprints`

References:
- `docs/prompting/report-types.md`
- `docs/brief-specs/generic-brief.md`
- `docs/brief-specs/pe-brief.md`
- `docs/brief-specs/fs-brief.md`
- `docs/prompting/addendums.md`

Rules of thumb:
- Industrials is the baseline. It keeps the original section set and titles.
- Other report types can override display titles and default selections, and may add report-specific sections when the output examples show a consistent need.
- Inputs should follow the workflow spreadsheet and only add fields when they change the analysis.
- Wizard flow should stay short: Report type -> Company name + other info -> Additional context -> Review.

Current report-specific sections:
- Private Equity: investment_strategy, portfolio_snapshot, deal_activity, deal_team, portfolio_maturity
- Financial Services: leadership_and_governance, strategic_priorities, operating_capabilities