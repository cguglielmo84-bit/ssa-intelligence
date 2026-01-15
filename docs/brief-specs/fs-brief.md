# Financial Services Brief Spec

This spec maps the "Financial Services Brief" workflow from the spreadsheet to the existing prompt sections and schemas. It keeps the current section schemas but changes each section's focus and content to match the FS analysis framework and output requirements.

## Inputs
- Institution name
- Stakeholders (CEO, CFO, BU head, etc.)
- Business focus (banking, wealth, insurance, payments, etc.)
- Time horizon
- Meeting context

## Purpose
Distill operational challenges, performance drivers, and strategic priorities into actionable context for exec-level conversations and meeting prep.

## Key analysis components
- Business mix and revenue drivers
- Recent financial performance highlights
- Key strategic initiatives (growth, efficiency, digital, AI)
- Regulatory or capital considerations (as relevant)
- M&A activity or portfolio shifts
- Leadership priorities and stated goals
- Recent earnings call or investor commentary
- Competitive or market positioning signals
- Recent news and press

## System instructions (summary)
You are a financial services research analyst supporting a Managing Director. Surface operational tensions, strategic focus areas, and execution challenges. Remain analytical and non-prescriptive, and frame insights as hypotheses for senior-level discussion.

## Analysis framework (6 lenses)
1. Business model and revenue drivers
2. Performance signals and operating pressure
3. Strategic priorities and transformation focus
4. Leadership, governance, and attention signals
5. Market, regulatory, and competitive context
6. SSA-relevant problem areas (SKU alignment)

## Section mapping and emphasis

### Executive Summary (exec_summary)
- Synthesize business model, performance signals, strategic priorities, and leadership focus.
- Emphasize operating pressures and where attention is concentrated.
- Keep schema; adjust bullets to FS-specific themes (performance pressure, transformation, regulatory context).

### Financial Snapshot (financial_snapshot)
- Highlight revenue mix, margin trends, efficiency, capital metrics, and recent performance drivers.
- Ensure clear interpretation, not just listing.
- Keep schema; include sources for financial metrics and disclosures.

### Company Overview (company_overview)
- Reframe as Institution Overview and Business Model.
- Cover business lines, revenue drivers, and geographic footprint.
- Keep schema; populate segments and strategic priorities with FS context.

### Market Trends (trends)
- Focus on market, regulatory, and competitive forces affecting the institution.
- Tie trends to operating pressure and strategic priorities.
- Keep schema; emphasize relevance to business focus (banking/insurance/etc.).

### SKU Opportunities (sku_opportunities)
- Translate operational and strategic themes into SSA-relevant problem areas.
- Limit to 1-3 SKUs per theme and keep alignment analytical.
- Keep schema; ensure issue areas map to FS-specific operating tensions.

### Conversation Starters (conversation_starters)
- Produce call-ready talking points framed as hypotheses/questions for MD use.
- Tie each to performance signals, leadership focus, or regulatory context.
- Keep schema; maintain non-prescriptive tone.

### Appendix and Sources (appendix)
- Source catalog should include earnings materials, investor presentations, regulatory filings, and credible news.
- Generated from sources used in sections and foundation catalog only.

## Output structure
- Financial Services research brief (standard report sections above)
- Call-ready discussion topics (via conversation starters section)

## Notes for implementation
- The FS brief is a preset that reuses the same section schemas as the base report.
- Any schema changes should be avoided unless strictly required; prefer content refocusing.
