/**
 * Report-Specific Section: Leadership and Governance
 */

export function buildLeadershipAndGovernancePrompt(input) {
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
