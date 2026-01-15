/**
 * Report-Specific Section: Investment Strategy and Focus
 */

export function buildInvestmentStrategyPrompt(input) {
  const { foundation, companyName } = input;
  const foundationJson = JSON.stringify(foundation, null, 2);

  return `# Investment Strategy and Focus - Research Prompt

You are a private equity research analyst preparing a concise strategy readout for ${companyName}. Focus on investment strategy, sector focus, and platform vs. add-on patterns. Keep analysis evidence-based and neutral.

## Input context (foundation)
\`\`\`json
${foundationJson}
\`\`\`

## Output requirements
Return ONLY valid JSON matching this schema:

\`\`\`typescript
interface InvestmentStrategyOutput {
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string };
  strategy_summary: string;
  focus_areas: string[]; // 3-6 items
  sector_focus: string[]; // 2-6 items
  platform_vs_addon_patterns: string[]; // 2-5 items
  sources_used: string[]; // S# references
}
\`\`\`

## Guidance
- Summarize the firm’s investment posture and how it differentiates.
- Use source-backed signals from the foundation catalog.
- Avoid generic PE language; highlight observed patterns.
`;
}
