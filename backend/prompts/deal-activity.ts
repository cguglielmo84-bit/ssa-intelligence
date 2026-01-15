/**
 * Report-Specific Section: Recent Investments and Add-ons
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

export interface DealActivityInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface DealActivityOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  summary: string;
  deals: Array<{
    company: string;
    date: string;
    deal_type: string;
    rationale: string;
    source: string;
  }>;
  sources_used: string[];
}

export function buildDealActivityPrompt(input: DealActivityInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Recent Investments and Add-ons - Research Prompt

You are summarizing recent investments, add-ons, or exits for ${companyName}. Focus on the last 12-24 months where possible.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface DealActivityOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  summary: string;
  deals: Array<{
    company: string;
    date: string;
    deal_type: string;
    rationale: string;
    source: string;
  }>;
  sources_used: string[];
}
\`\`\`

## Guidance
- Include at least 3 transactions with sources.
- Note whether each is a platform, add-on, or exit when known.
- Summarize what the activity signals about current focus.
`;
}
