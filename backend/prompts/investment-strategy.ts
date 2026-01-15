/**
 * Report-Specific Section: Investment Strategy and Focus
 */

import type { ReportTypeId } from './report-type-addendums.js';

export interface FoundationOutput {
  company_basics: {
    legal_name: string;
    ticker?: string;
    ownership: 'Public' | 'Private' | 'Subsidiary';
    headquarters: string;
    global_revenue_usd: number;
    global_employees: number;
    fiscal_year_end: string;
  };
  geography_specifics: {
    regional_revenue_usd: number;
    regional_revenue_pct: number;
    regional_employees: number;
    facilities: Array<{
      name: string;
      location: string;
      type: string;
    }>;
    key_facts: string[];
  };
  source_catalog: Array<{
    id: string;
    citation: string;
    url?: string;
    type: string;
    date: string;
  }>;
}

export interface InvestmentStrategyInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface InvestmentStrategyOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  strategy_summary: string;
  focus_areas: string[];
  sector_focus: string[];
  platform_vs_addon_patterns: string[];
  sources_used: string[];
}

export function buildInvestmentStrategyPrompt(input: InvestmentStrategyInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Investment Strategy and Focus - Research Prompt

You are a private equity research analyst preparing a concise strategy readout for ${companyName}. Focus on investment strategy, sector focus, and platform vs. add-on patterns. Keep analysis evidence-based and neutral.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface InvestmentStrategyOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  strategy_summary: string;
  focus_areas: string[]; // 3-6 items
  sector_focus: string[]; // 2-6 items
  platform_vs_addon_patterns: string[]; // 2-5 items
  sources_used: string[]; // S# references
}
\`\`\`

## Guidance
- Summarize the firm’s investment posture and how it differentiates.
- Use source-backed signals from the foundation catalog.
- Avoid generic PE language; highlight observed patterns.
`;
}
