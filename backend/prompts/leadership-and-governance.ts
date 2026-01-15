/**
 * Report-Specific Section: Leadership and Governance
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

export interface LeadershipAndGovernanceInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface LeadershipAndGovernanceOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  leadership: Array<{
    name: string;
    title: string;
    focus_area?: string;
    source: string;
  }>;
  governance_notes: string;
  sources_used: string[];
}

export function buildLeadershipAndGovernancePrompt(input: LeadershipAndGovernanceInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Leadership and Governance - Research Prompt

Summarize leadership and governance signals for ${companyName}. Highlight key leaders, accountability signals, and governance notes that matter for exec-level conversations.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface LeadershipAndGovernanceOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  leadership: Array<{
    name: string;
    title: string;
    focus_area?: string;
    source: string;
  }>;
  governance_notes: string;
  sources_used: string[];
}
\`\`\`

## Guidance
- Include at least 3 leaders with source references.
- Governance notes should focus on accountability and operating structure.
`;
}
