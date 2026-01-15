/**
 * Report-Specific Section: Operating Capabilities
 */

export function buildOperatingCapabilitiesPrompt(input) {
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
