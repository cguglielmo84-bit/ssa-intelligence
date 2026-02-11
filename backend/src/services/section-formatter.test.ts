import { describe, it, expect } from 'vitest';
import { formatSectionContent } from './section-formatter.js';

describe('section-formatter', () => {
  it('formats investment strategy section', () => {
    const investment = formatSectionContent('investment_strategy', {
      strategy_summary: 'Strategy summary',
      focus_areas: ['Focus A'],
    });
    expect(investment).toContain('Strategy summary');
    expect(investment).toContain('**Focus Areas**');
  });

  it('formats portfolio snapshot section with table', () => {
    const portfolio = formatSectionContent('portfolio_snapshot', {
      summary: 'Portfolio summary',
      portfolio_companies: [
        {
          name: 'Alpha',
          sector: 'Tech',
          platform_or_addon: 'Platform',
          geography: 'NA',
          notes: 'Note',
          source: 'S1',
        },
      ],
    });
    expect(portfolio).toContain('**Portfolio Companies**');
    expect(portfolio).toContain('| Name | Sector | Type | Geography | Notes | Source |');
  });
});
