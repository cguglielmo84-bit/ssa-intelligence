/**
 * Report-Specific Section: Strategic Priorities and Transformation
 */

export function buildStrategicPrioritiesPrompt(input) {
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
