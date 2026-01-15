/**
 * Report-Specific Section: Portfolio Snapshot
 */

export function buildPortfolioSnapshotPrompt(input) {
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
