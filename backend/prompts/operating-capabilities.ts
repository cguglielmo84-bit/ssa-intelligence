/**
 * Report-Specific Section: Operating Capabilities
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

export interface OperatingCapabilitiesInput {
  foundation: FoundationOutput;
  companyName: string;
  geography: string;
  reportType?: ReportTypeId;
}

export interface OperatingCapabilitiesOutput {
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
  capabilities: Array<{
    capability: string;
    description: string;
    maturity?: 'Early' | 'Developing' | 'Advanced';
    source: string;
  }>;
  gaps?: string[];
  sources_used: string[];
}

export function buildOperatingCapabilitiesPrompt(input: OperatingCapabilitiesInput): string {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Operating Capabilities - Research Prompt

Summarize operating capabilities for ${companyName}, including digital, talent, shared services, or hub capacity where relevant. Focus on evidence-based signals.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface OperatingCapabilitiesOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  capabilities: Array<{ capability: string; description: string; maturity?: 'Early' | 'Developing' | 'Advanced'; source: string }>;
  gaps?: string[];
  sources_used: string[];
}
\`\`\`

## Guidance
- Include 3-8 capabilities with sources.
- Use gaps only when supported by evidence.
`;
}
