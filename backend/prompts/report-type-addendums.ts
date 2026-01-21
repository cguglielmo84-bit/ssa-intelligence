export type ReportTypeId = 'GENERIC' | 'INDUSTRIALS' | 'PE' | 'FS';

export type SectionId =
  | 'foundation'
  | 'exec_summary'
  | 'financial_snapshot'
  | 'company_overview'
  | 'investment_strategy'
  | 'portfolio_snapshot'
  | 'deal_activity'
  | 'deal_team'
  | 'portfolio_maturity'
  | 'leadership_and_governance'
  | 'strategic_priorities'
  | 'operating_capabilities'
  | 'segment_analysis'
  | 'trends'
  | 'peer_benchmarking'
  | 'sku_opportunities'
  | 'recent_news'
  | 'conversation_starters'
  | 'appendix';

type AddendumMap = Record<SectionId, Record<ReportTypeId, string>>;

export const REPORT_TYPE_ADDENDUMS: AddendumMap = {
  foundation: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Prioritize industrial sector context, manufacturing footprint, supply chain dynamics, and automation themes.
- Emphasize industrial OEM and B2B customer exposure, end-market cyclicality, and capex intensity.
- Capture plant-level or facilities data where available and tie to regional production indicators.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Prioritize business line mix (banking, insurance, wealth, payments), regulatory context, and capital constraints.
- Emphasize operating efficiency, digital transformation, and leadership priorities from earnings materials.
- Capture business unit metrics and market positioning by segment where disclosed.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Prioritize firm strategy, portfolio composition, recent acquisitions, and platform vs add-on patterns.
- Emphasize value-creation themes, operating model signals, and leadership/operating partner moves.
- Capture deal announcements and portfolio news as primary sources.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Focus only on the most relevant context for the meeting or stated topic of interest.
- Prefer high-signal sources and avoid exhaustive data collection when it does not change the narrative.
- Keep foundation insights concise and directly tied to near-term priorities.`
  },
  exec_summary: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Keep output as close to current Industrials brief tone and structure as possible.
- Emphasize manufacturing footprint, operational efficiency, and supply chain or capacity themes.
- Highlight industrial end-market demand signals and competitive positioning.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize business model and revenue drivers, performance pressure, and regulatory context.
- Frame insights as hypotheses for leadership discussion; keep tone analytical and non-prescriptive.
- Highlight transformation priorities and leadership attention signals.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Synthesize portfolio direction, value-creation themes, and operating signals.
- Emphasize patterns across the portfolio and near-term momentum.
- Keep questions hypothesis-driven and grounded in deal/portfolio evidence.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Produce 4-6 high-signal bullets only; prioritize immediacy and relevance to the context.
- Avoid exhaustive coverage; focus on key risks, priorities, and recent changes.
- Keep language concise and decision-oriented.`
  },
  financial_snapshot: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Preserve current metric depth and industrial benchmark comparisons.
- Emphasize working capital efficiency, utilization, and margin drivers tied to operations.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize revenue mix, margins/efficiency ratios, and capital or regulatory metrics.
- Interpret drivers behind performance rather than listing metrics.
- Use segment or business-line metrics where available.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Focus on portfolio-level signals (fund size, acquisition cadence, scale) when public.
- Keep metrics limited and interpretive; avoid forcing detailed line-item KPIs.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Include only material metrics tied to the topic of interest.
- Prefer concise tables and short interpretation over exhaustive coverage.
- Keep the summary focused on 2-3 material drivers within the 4-6 sentence limit.`
  },
  company_overview: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize industrial product lines, manufacturing footprint, and end-market exposure.
- Keep segment detail and geography positioning aligned with current Industrials outputs.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Frame as institution overview and business model (business lines, revenue drivers).
- Emphasize regulatory context, geographic footprint, and operating priorities.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Frame as firm overview and portfolio composition (platform vs add-on, sector focus).
- Highlight investment strategy and operating model signals.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep overview concise and context-specific; prioritize key products/services and segments.
- Limit segments to the most relevant and high-signal items.
- Avoid deep dives; keep descriptions short and decision-oriented.`
  },
  investment_strategy: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize sector focus, operational value-creation themes, and capacity expansion patterns.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize regulated growth themes, product mix focus, and inorganic growth signals.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize platform vs add-on patterns, sector theses, and value-creation levers.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep strategy summary concise and evidence-based; avoid generic PE language.`
  },
  portfolio_snapshot: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Highlight industrial sector clustering and operational adjacency across portfolio.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Highlight financial services platform groupings and subsector exposure.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize platform vs add-on status and sector clustering.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep portfolio list concise; prioritize most relevant holdings.`
  },
  deal_activity: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize industrial add-ons, capacity/technology acquisitions, and carve-outs.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize acquisitions tied to product/market expansion or regulatory positioning.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize platform/add-on/exit classification and deal cadence.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep deal summary tight and evidence-based.`
  },
  deal_team: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Prioritize operating partners and leaders tied to industrial operations.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Prioritize partners/leaders focused on financial services and regulatory expertise.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize partners, operating partners, and sector leads tied to the target.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Limit to verified stakeholders only; avoid speculation.`
  },
  portfolio_maturity: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize long-held industrial assets and operational exit signals.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize regulatory approvals, divestitures, or recap signals.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize holding period signals, exit watchlist cues, and sponsor intent.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep exit signals grounded in public activity only.`
  },
  leadership_and_governance: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize operating leadership and governance signals tied to operations.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize compliance, risk, and governance oversight signals.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize operating partners and governance moves tied to portfolio oversight.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep leadership list concise and evidence-based.`
  },
  strategic_priorities: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize capex, automation, throughput, and supply chain priorities.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize digital, risk/compliance, and revenue-mix priorities.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize value-creation priorities and operating model shifts.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep priorities focused on the most material themes only.`
  },
  operating_capabilities: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize manufacturing, supply chain, and operational excellence capabilities.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize risk, compliance, digital, and operating efficiency capabilities.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize shared services, operating partner support, and transformation capabilities.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep capability list concise and evidence-based.`
  },
  segment_analysis: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Maintain segment-level operational performance focus and competitor framing.
- Emphasize capacity, efficiency, and industrial end-market dynamics.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Use segments aligned to business lines (banking, insurance, wealth, payments).
- Focus on performance drivers, operating pressure, and regulatory exposure per segment.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Use portfolio clusters or sector buckets instead of traditional product segments.
- Emphasize operating complexity and value-creation themes within clusters.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Limit to key segments only; focus on the most material drivers and context.
- Keep segment narratives brief and avoid excess detail.`
  },
  trends: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize industrial production indicators, automation, supply chain, and capex cycles.
- Tie trends to operational impact and capacity utilization.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize regulatory, market, and competitive forces affecting the institution.
- Tie trends to operating pressure, capital, and transformation priorities.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize deal environment, sector tailwinds/headwinds, and value-creation themes.
- Tie trends to portfolio exposure and strategy.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Include only 2-4 high-impact trends; explain why they matter now.
- Keep trend rationale concise.`
  },
  peer_benchmarking: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Keep peer set focused on industrial comparables and operational metrics.
- Emphasize capacity, margin structure, and regional share.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Compare against relevant financial peers and operating ratios.
- Highlight business-line mix or regulatory positioning differences.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Compare to peer firms or similar portfolio strategies where meaningful.
- Avoid forcing detailed financial comparisons if not available.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep peer set small and focus on 2-3 differentiators.
- Keep benchmarking commentary brief and high-signal.`
  },
  sku_opportunities: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Preserve current operational issue framing and SKU alignment style.
- Emphasize efficiency, throughput, and supply chain constraints.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Map operating tensions to SSA problem areas (1-3 SKUs per theme).
- Keep alignment analytical and non-prescriptive.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Translate value-creation themes into SSA-relevant problem areas.
- Focus on operating model improvements and transformation themes.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Limit to 1-3 themes; prioritize relevance to the stated context.
- Keep issue descriptions short and direct.`
  },
  recent_news: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Emphasize operational investments, capacity changes, and supply chain moves.
- Focus on regional facility and manufacturing-related developments.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Emphasize earnings commentary, regulatory updates, and leadership changes.
- Highlight market positioning and transformation announcements.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Emphasize deal announcements, portfolio news, and firm press releases.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep concise; include only news tied to the meeting context.`
  },
  conversation_starters: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Keep tone practical and operational; align with current Industrials output style.
- Focus on execution risks, capacity, and end-market signals.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Use call-ready questions tied to performance signals, leadership focus, or regulatory context.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Use hypothesis-driven questions about portfolio patterns and operating themes.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Keep questions short, focused, and tied to immediate context.`
  },
  appendix: {
    INDUSTRIALS: `## REPORT TYPE ADDENDUM: INDUSTRIALS
- Include sources tied to operations, manufacturing footprint, and industrial benchmarks.`,
    FS: `## REPORT TYPE ADDENDUM: FINANCIAL SERVICES
- Include filings, earnings materials, regulatory docs, and credible news.`,
    PE: `## REPORT TYPE ADDENDUM: PRIVATE EQUITY
- Include deal announcements, firm press, portfolio news, and Pitchbook-style sources.`,
    GENERIC: `## REPORT TYPE ADDENDUM: GENERIC
- Include only sources referenced in sections.`
  }
};

export function appendReportTypeAddendum(
  sectionId: SectionId,
  reportType: ReportTypeId | undefined,
  basePrompt: string
): string {
  const prompt = typeof basePrompt === 'string' ? basePrompt : String(basePrompt ?? '');
  if (!reportType) return prompt;
  const addendum = REPORT_TYPE_ADDENDUMS[sectionId]?.[reportType];
  if (!addendum) return prompt;
  const marker = '## CRITICAL INSTRUCTIONS';
  const insertion = `${marker}\n\n### CRITICAL REPORT TYPE ADDENDUM\n\n${addendum}\n\n`;
  if (prompt.includes(marker)) {
    return prompt.replace(marker, insertion);
  }
  return `${prompt}\n\n---\n\n${addendum}\n`;
}
