/**
 * Report-Specific Section: Portfolio Maturity and Exit Watchlist
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

export interface PortfolioMaturityInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface PortfolioMaturityOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  summary: string;
  holdings: Array<{
    company: string;
    acquisition_period?: string;
    holding_period_years?: number;
    exit_signal: string;
    source: string;
  }>;
  sources_used: string[];
}

export function buildPortfolioMaturityPrompt(input: PortfolioMaturityInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Portfolio Maturity and Exit Watchlist - Research Prompt

Identify longer-held portfolio assets for ${companyName} and summarize potential exit signals. Use public evidence; avoid speculation.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface PortfolioMaturityOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  summary: string;
  holdings: Array<{
    company: string;
    acquisition_period?: string;
    holding_period_years?: number;
    exit_signal: string;
    source: string;
  }>;
  sources_used: string[];
}
\`\`\`

## Guidance
- Include at least 2 holdings if evidence exists.
- Exit signals should be grounded in public activity (refinancing, leadership changes, etc.).
`;
}
