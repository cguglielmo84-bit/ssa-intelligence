# Section Inventory and Dependencies

Source of truth: `backend/src/services/orchestrator.ts`.

## Always-run stages
- foundation (not user-selectable)
- appendix (auto-generated and always included)

## Base sections
- exec_summary (depends on financial_snapshot, company_overview)
- financial_snapshot (depends on foundation)
- company_overview (depends on foundation)
- segment_analysis (depends on foundation)
- trends (depends on foundation)
- peer_benchmarking (depends on foundation, financial_snapshot)
- sku_opportunities (depends on foundation)
- recent_news (depends on foundation)
- conversation_starters (depends on foundation)
- appendix (depends on foundation; generated after other stages complete)

## Report-specific sections
Private Equity:
- investment_strategy (depends on foundation)
- portfolio_snapshot (depends on foundation)
- deal_activity (depends on foundation)
- deal_team (depends on foundation)
- portfolio_maturity (depends on foundation)

Financial Services:
- leadership_and_governance (depends on foundation)
- strategic_priorities (depends on foundation)
- operating_capabilities (depends on foundation)

## Selection rules
- If `selectedSections` is empty, the blueprint defaults are used.
- Dependencies are auto-added even if omitted.
- `appendix` is always forced on.

## Storage notes
- Base sections are denormalized into `ResearchJob` fields for fast access.
- Report-specific sections are stored only in `ResearchSubJob.output` and surfaced by the API.