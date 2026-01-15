/**
 * Report-Specific Section: Deal Team and Key Stakeholders
 */

export function buildDealTeamPrompt(input) {
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
