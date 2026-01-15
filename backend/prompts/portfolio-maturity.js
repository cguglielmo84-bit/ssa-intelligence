/**
 * Report-Specific Section: Portfolio Maturity and Exit Watchlist
 */

export function buildPortfolioMaturityPrompt(input) {
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
