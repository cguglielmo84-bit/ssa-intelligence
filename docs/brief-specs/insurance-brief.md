# Insurance Brief Spec

This spec maps the "Insurance Brief" workflow to the existing prompt sections and schemas. It keeps the current section schemas but changes each section's focus and content to match the insurance analysis framework and output requirements.

## Inputs
- Insurer name
- Stakeholders (CEO, CFO, Chief Underwriting Officer, Chief Actuary, etc.)
- Line of business (Life, P&C, Health, Reinsurance, etc.)
- Time horizon
- Meeting context

## Purpose
Distill underwriting performance, investment results, and distribution strategy into actionable context for exec-level conversations and meeting prep.

## Key analysis components
- Business mix by line of business (Life, P&C, Health)
- Underwriting performance (combined ratio, loss ratio, expense ratio)
- Investment portfolio and yield performance
- Distribution channel strategy (agent/broker, direct, bancassurance)
- Claims handling and reserve adequacy
- Regulatory and solvency considerations
- Rate environment and pricing trends
- Catastrophe exposure and risk management
- Digital transformation initiatives
- Recent earnings and investor commentary

## System instructions (summary)
You are an insurance industry research analyst supporting a Managing Director. Surface underwriting discipline, distribution efficiency, and capital allocation signals. Remain analytical and non-prescriptive, and frame insights as hypotheses for senior-level discussion.

## Analysis framework (6 lenses)
1. Business mix and premium drivers by line
2. Underwriting performance and combined ratio trends
3. Investment results and capital management
4. Distribution strategy and channel economics
5. Market, regulatory, and competitive context
6. SSA-relevant problem areas (SKU alignment)

## Section mapping and emphasis

### Executive Summary (exec_summary)
- Synthesize underwriting performance, investment results, and strategic positioning.
- Emphasize combined ratio drivers, distribution efficiency, and capital allocation.
- Keep schema; adjust bullets to insurance-specific themes (underwriting discipline, claims trends, rate environment).

### Financial Snapshot (financial_snapshot)
- Highlight combined ratio, loss ratio, expense ratio, premiums, investment yield, and solvency metrics.
- Ensure clear interpretation of underwriting vs. investment income drivers.
- Keep schema; include sources for statutory filings and investor materials.

### Company Overview (company_overview)
- Reframe as Insurer Overview and Lines of Business.
- Cover business mix by line, distribution channels, and geographic footprint.
- Keep schema; populate segments with insurance line context.

### Leadership and Governance (leadership_and_governance)
- Focus on executive team and actuarial leadership.
- Highlight board members with insurance regulatory or actuarial backgrounds.
- Include Chief Underwriting Officer, Chief Actuary, Chief Claims Officer profiles.

### Strategic Priorities (strategic_priorities)
- Cover digital distribution, claims modernization, and product innovation.
- Emphasize combined ratio improvement initiatives and distribution efficiency.
- Keep schema; tie initiatives to underwriting and claims performance.

### Distribution Analysis (distribution_analysis)
- Analyze agent/broker networks, direct-to-consumer channels, bancassurance partnerships.
- Cover distribution costs, channel economics, and technology enablement.
- Insurance-specific section not shared with other report types.

### Market Trends (trends)
- Focus on rate environment, claims trends, regulatory changes, and catastrophe exposure.
- Tie trends to underwriting pressure and strategic priorities.
- Keep schema; emphasize relevance to specific lines of business.

### SKU Opportunities (sku_opportunities)
- Translate underwriting and claims challenges to SSA-relevant problem areas.
- Limit to 1-3 SKUs per theme and keep alignment analytical.
- Keep schema; ensure issue areas map to insurance-specific operating tensions.

### Conversation Starters (conversation_starters)
- Produce call-ready talking points framed as hypotheses/questions for MD use.
- Tie each to underwriting performance, distribution strategy, or regulatory context.
- Keep schema; maintain non-prescriptive tone.

### Key Execs and Board Members (key_execs_and_board)
- Optional deep-dive on board composition and C-suite leadership.
- Emphasize Chief Underwriting Officer, Chief Actuary, and Chief Claims Officer.
- Highlight board members with actuarial or insurance regulatory backgrounds.

### Appendix and Sources (appendix)
- Source catalog should include statutory filings, AM Best reports, investor presentations, and credible news.
- Generated from sources used in sections and foundation catalog only.

## Key insurance metrics
- Gross Written Premiums ($M)
- Net Written Premiums ($M)
- Premium Growth (YoY) (%)
- Combined Ratio (%)
- Loss Ratio (%)
- Expense Ratio (%)
- Underwriting Income (Loss) ($M)
- Net Investment Income ($M)
- Investment Yield (%)
- Net Income ($M)
- Return on Equity (ROE) (%)
- Solvency Ratio / RBC Ratio (%)
- Reserve to Premium Ratio (x)
- Policy Retention Rate (%)

## Output structure
- Insurance research brief (standard report sections above)
- Call-ready discussion topics (via conversation starters section)

## Notes for implementation
- The Insurance brief is a preset that reuses the same section schemas as the base report.
- Distribution analysis is the only insurance-specific section with a unique schema.
- Any schema changes should be avoided unless strictly required; prefer content refocusing.
