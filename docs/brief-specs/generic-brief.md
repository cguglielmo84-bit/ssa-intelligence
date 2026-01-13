# Company Brief (Generic) Spec

This spec maps the "Company Brief (Generic)" workflow from the spreadsheet to the existing prompt sections and schemas. It keeps the current section schemas but changes each section's focus and content to produce a shorter, context-specific brief.

## Inputs
- Company name
- Stakeholders (optional)
- Topic of interest (strategy, performance, growth, risk)
- Time horizon
- Meeting context

## Purpose
Distill company-specific strategy, performance, and recent developments into tailored context for exec-level conversations and meeting prep.

## Key analysis components
- Company overview and business model
- Recent financial and operational performance
- Strategic initiatives or transformation efforts
- Relevant news or announcements
- Leadership changes or governance notes
- Key risks or challenges
- Context specific to upcoming meeting

## System instructions (summary)
You are a generalist corporate research analyst supporting a Managing Director. Focus on relevance to the meeting context, surface the most important issues and tensions, and avoid generic company commentary.

## Analysis framework (flexible)
1. Business model and operating context
2. Performance signals and drivers
3. Strategic priorities and initiatives
4. Leadership, governance, and attention signals
5. Recent developments and external context
6. SSA-relevant problem areas (SKU alignment)

## Section mapping and emphasis

### Executive Summary (exec_summary)
- Synthesize the most relevant 4-6 insights tied to the meeting context.
- Focus on immediacy, risks, and key themes rather than comprehensive coverage.
- Keep schema; reduce bullet count toward 5 where possible.

### Financial Snapshot (financial_snapshot)
- Highlight only the most material performance signals and drivers.
- Use concise tables and interpretive summaries, not exhaustive metrics.
- Keep schema; ensure any metrics tie back to the topic of interest.

### Company Overview (company_overview)
- Provide a concise business model overview and key segments.
- Emphasize context-specific aspects (priority segment, geography, etc.).
- Keep schema; keep segments limited and high-signal.

### Market Trends (trends)
- Include only trends that directly affect the meeting context or near-term focus.
- Prefer 2-4 high-impact trends over completeness.
- Keep schema; highlight why each trend matters to the company now.

### SKU Opportunities (sku_opportunities)
- Translate 1-3 themes into SSA-relevant problem areas.
- Keep alignment analytical and non-prescriptive.
- Keep schema; prioritize relevance over breadth.

### Conversation Starters (conversation_starters)
- Produce concise, call-ready questions tied to the meeting context.
- Use hypotheses framed around the stated topic of interest.
- Keep schema; limit to a small set of high-quality starters.

### Appendix and Sources (appendix)
- Source catalog should include only sources referenced in sections.
- Generated from sources used in sections and foundation catalog only.

## Output structure
- Company research brief (shorter than Industrials/PE/FS, focused on context)
- Call-ready discussion topics (via conversation starters section)

## Notes for implementation
- Generic brief is the default report type.
- The Generic brief should be shorter; enforce via prompt instructions rather than schema changes.
