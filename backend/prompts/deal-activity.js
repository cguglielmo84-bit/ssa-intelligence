/**
 * Report-Specific Section: Recent Investments and Add-ons
 */

export function buildDealActivityPrompt(input) {
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
