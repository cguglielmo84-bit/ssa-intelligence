# Report Types

Source of truth: `backend/src/services/report-blueprints.ts` (also exposed at `GET /api/report-blueprints`).

Each report type defines:
- Inputs (`reportInputs`) used for prompt context
- Default section set
- Report-specific sections where relevant

`foundation` always runs and `appendix` is always included, even if not explicitly selected.

## GENERIC (Company Brief)
Purpose: Distill company-specific strategy, performance, and recent developments into meeting-ready context.

Inputs:
- companyName (required)
- timeHorizon (optional)
- meetingContext (optional)
- topicOfInterest (optional)
- stakeholders (optional)

Default sections:
- exec_summary
- financial_snapshot
- company_overview
- trends
- sku_opportunities
- conversation_starters
- appendix

Optional sections:
- key_execs_and_board
- segment_analysis
- peer_benchmarking
- recent_news

## INDUSTRIALS
Purpose: Distill end-market exposure, cost structure, and operational levers for exec conversations.

Inputs:
- companyName (required)
- timeHorizon (optional)
- meetingContext (optional)
- segmentFocus (optional)
- stakeholders (optional)

Default sections:
- exec_summary
- financial_snapshot
- company_overview
- segment_analysis
- trends
- peer_benchmarking
- sku_opportunities
- recent_news
- conversation_starters
- appendix

Optional sections:
- key_execs_and_board

## PE (Private Equity)
Purpose: Distill portfolio activity, value-creation themes, and investment strategy into meeting-ready context.

Inputs:
- companyName (PE firm name, required)
- timeHorizon (optional)
- meetingContext (optional)
- fundStrategy (optional)
- stakeholders (optional)

Default sections:
- exec_summary
- company_overview
- investment_strategy
- portfolio_snapshot
- deal_activity
- financial_snapshot
- trends
- sku_opportunities
- recent_news
- conversation_starters
- appendix

Optional sections:
- key_execs_and_board
- segment_analysis
- peer_benchmarking
- deal_team
- portfolio_maturity

## FS (Financial Services)
Purpose: Distill operational challenges, performance drivers, and strategic priorities into meeting-ready context.

Inputs:
- companyName (institution name, required)
- timeHorizon (optional)
- meetingContext (optional)
- businessFocus (optional)
- stakeholders (optional)

Default sections:
- exec_summary
- financial_snapshot
- company_overview
- leadership_and_governance
- strategic_priorities
- trends
- sku_opportunities
- recent_news
- conversation_starters
- appendix

Optional sections:
- segment_analysis
- peer_benchmarking
- operating_capabilities
- key_execs_and_board

## INSURANCE
Purpose: Distill underwriting performance, investment results, and distribution strategy into meeting-ready context.

Inputs:
- companyName (insurer name, required)
- timeHorizon (optional)
- meetingContext (optional)
- lineOfBusiness (optional)
- stakeholders (optional)

Default sections:
- exec_summary
- financial_snapshot
- company_overview
- leadership_and_governance
- strategic_priorities
- distribution_analysis
- trends
- sku_opportunities
- recent_news
- conversation_starters
- appendix

Optional sections:
- key_execs_and_board
- segment_analysis
- peer_benchmarking
- operating_capabilities