/**
 * Report-Specific Section: Deal Team and Key Stakeholders
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

export interface DealTeamInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface DealTeamOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  stakeholders: Array<{
    name: string;
    title: string;
    role: string;
    focus_area?: string;
    source: string;
  }>;
  notes?: string;
  sources_used: string[];
}

export function buildDealTeamPrompt(input: DealTeamInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Deal Team and Key Stakeholders - Research Prompt

Identify the key partners, deal leads, or operating partners relevant to ${companyName}. Focus on credible public sources and avoid speculation.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface DealTeamOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  stakeholders: Array<{
    name: string;
    title: string;
    role: string;
    focus_area?: string;
    source: string;
  }>;
  notes?: string;
  sources_used: string[];
}
\`\`\`

## Guidance
- Include at least 2 stakeholders with source references.
- Use notes for any relationship pathways or coverage context.
`;
}
