/**
 * Report-Specific Section: Portfolio Snapshot
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

export interface PortfolioSnapshotInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface PortfolioSnapshotOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  summary: string;
  portfolio_companies: Array<{
    name: string;
    sector: string;
    platform_or_addon: string;
    geography?: string;
    notes?: string;
    source: string;
  }>;
  sources_used: string[];
}

export function buildPortfolioSnapshotPrompt(input: PortfolioSnapshotInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Portfolio Snapshot - Research Prompt

You are preparing a PE portfolio snapshot for ${companyName}. Provide a concise overview of the current portfolio, grouped by sector or platform when possible.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface PortfolioSnapshotOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  summary: string;
  portfolio_companies: Array<{
    name: string;
    sector: string;
    platform_or_addon: string;
    geography?: string;
    notes?: string;
    source: string;
  }>;
  sources_used: string[];
}
\`\`\`

## Guidance
- Include at least 4 portfolio companies with credible sources.
- Note platform vs add-on where visible.
- Keep the summary focused on portfolio composition patterns.
`;
}
