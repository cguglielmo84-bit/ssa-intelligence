/**
 * Report-Specific Section: Strategic Priorities and Transformation
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

export interface StrategicPrioritiesInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface StrategicPrioritiesOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  priorities: Array<{
    priority: string;
    description: string;
    source: string;
  }>;
  transformation_themes: string[];
  sources_used: string[];
}

export function buildStrategicPrioritiesPrompt(input: StrategicPrioritiesInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Strategic Priorities and Transformation - Research Prompt

Summarize ${companyName}'s strategic priorities and transformation agenda. Focus on operational and strategic signals that affect execution.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface StrategicPrioritiesOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  priorities: Array<{ priority: string; description: string; source: string }>;
  transformation_themes: string[];
  sources_used: string[];
}
\`\`\`

## Guidance
- Include 3-6 priorities with clear descriptions.
- Highlight 2-5 transformation themes (digital, efficiency, platform, etc.).
`;
}
