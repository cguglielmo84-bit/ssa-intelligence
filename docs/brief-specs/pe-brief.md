# Private Equity Brief Spec

This spec maps the "Private Equity Brief" workflow from the spreadsheet to the existing prompt sections and schemas. It keeps the current section schemas but changes each section's focus and content to match the PE analysis framework and output requirements.

## Inputs
- PE firm name
- Optional: specific fund or strategy focus
- Stakeholders to focus on (partners, deal leads, board members)
- Time horizon (last 12 months, last 24 months)
- Meeting context

## Purpose
Distill portfolio activity, value-creation themes, and investment strategy into actionable context for exec-level conversations and meeting prep.

## Key analysis components
- Recent acquisitions (last 12-24 months, prioritize recency)
- Platform vs add-on strategy
- Target sectors and sub-sectors
- Operating and transformation themes (cost, growth, digital, AI)
- Notable leadership hires or operating partners
- Recent news and press

## System instructions (summary)
You are a PE research analyst supporting a Managing Director. Surface patterns and themes, not exhaustive firm profiles. Remain analytical and neutral. Translate portfolio activity into hypotheses and talking points, not recommendations.

## Analysis framework (6 lenses)
1. Investment strategy and portfolio direction
2. Portfolio composition and operating complexity
3. Value-creation themes and operating priorities
4. Leadership and operating model signals
5. Recent news, momentum, and attention signals
6. SSA-relevant problem areas (SKU alignment)

## Section mapping and emphasis

### Executive Summary (exec_summary)
- Synthesize portfolio direction, value-creation themes, and operating signals.
- Emphasize patterns across the portfolio and near-term momentum.
- Keep schema; adjust bullets to PE categories (strategy, portfolio, value-creation, operating risks, momentum).

### Financial Snapshot (financial_snapshot)
- Treat "financials" as portfolio-level performance signals where public data exists.
- Include acquisition cadence, fund size/context, and portfolio revenue scale if available.
- Keep schema; include clear source citations for financial signals.

### Company Overview (company_overview)
- Reframe as Firm Overview and Portfolio Composition.
- Cover fund strategy, sector focus, platform vs add-on patterns, and geographic footprint.
- Keep schema; populate business description with firm strategy and portfolio composition.

### Market Trends (trends)
- Focus on PE sector trends and operating themes impacting the portfolio.
- Highlight macro themes driving deal activity or value creation.
- Keep schema; ensure trends are tied to PE strategy and portfolio exposure.

### SKU Opportunities (sku_opportunities)
- Translate value-creation themes into SSA-relevant problem areas.
- Limit to 1-3 SKUs per theme and keep alignment analytical.
- Keep schema; use issue areas that map to operating and transformation themes.

### Conversation Starters (conversation_starters)
- Produce call-ready talking points framed as hypotheses/questions for MD use.
- Tie each to portfolio signals, strategy shifts, or operating patterns.
- Keep schema; ensure questions are executive-facing and non-prescriptive.

### Appendix and Sources (appendix)
- Source catalog should include deal announcements, firm press, portfolio news, and public filings.
- Generated from sources used in sections and foundation catalog only.

## Output structure
- PE research brief (standard report sections above)
- Call-ready discussion topics (via conversation starters section)

## Notes for implementation
- The PE brief is a preset that reuses the same section schemas as the base report.
- Any schema changes should be avoided unless strictly required; prefer content refocusing.
