import { describe, it, expect } from 'vitest';
import {
  companyBasicsSchema,
  geographySpecificsSchema,
  peerBenchmarkingOutputSchema,
  segmentAnalysisOutputSchema,
  execSummaryOutputSchema
} from '../../prompts/validation.js';

// =============================================================================
// FOUNDATION: Revenue field validation (nonNegativeNumberOrString)
// =============================================================================

describe('foundation revenue validation', () => {
  const validBasics = {
    legal_name: 'Test Corp',
    ownership: 'Public' as const,
    headquarters: 'New York, NY',
    global_employees: 100,
    fiscal_year_end: 'December 31'
  };

  const validGeo = {
    regional_revenue_pct: 50,
    regional_employees: 50,
    facilities: [{ name: 'HQ', location: 'NY', type: 'Office' }],
    key_facts: ['Established 2020']
  };

  it('accepts zero revenue for pre-revenue companies', () => {
    const result = companyBasicsSchema.safeParse({
      ...validBasics,
      global_revenue_usd: 0
    });
    expect(result.success).toBe(true);
  });

  it('accepts positive revenue', () => {
    const result = companyBasicsSchema.safeParse({
      ...validBasics,
      global_revenue_usd: 50000
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative revenue', () => {
    const result = companyBasicsSchema.safeParse({
      ...validBasics,
      global_revenue_usd: -100
    });
    expect(result.success).toBe(false);
  });

  it('coerces string revenue to number', () => {
    const result = companyBasicsSchema.safeParse({
      ...validBasics,
      global_revenue_usd: '$1,200'
    });
    expect(result.success).toBe(true);
  });

  it('accepts string zero revenue', () => {
    const result = companyBasicsSchema.safeParse({
      ...validBasics,
      global_revenue_usd: '0'
    });
    expect(result.success).toBe(true);
  });

  it('accepts zero regional revenue', () => {
    const result = geographySpecificsSchema.safeParse({
      ...validGeo,
      regional_revenue_usd: 0
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative regional revenue', () => {
    const result = geographySpecificsSchema.safeParse({
      ...validGeo,
      regional_revenue_usd: -50
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SOURCES_USED: S# regex validation
// =============================================================================

describe('sources_used S# regex validation', () => {
  const makePeerBenchmarkingOutput = (sourcesUsed: string[]) => ({
    confidence: { level: 'MEDIUM', reason: 'test' },
    peer_comparison_table: {
      company_name: 'Test Corp',
      peers: [
        { name: 'Peer A', ticker: 'PA', geography_presence: 'North American operations with facilities across the eastern seaboard' },
        { name: 'Peer B', ticker: 'PB', geography_presence: 'Canadian integrated company with significant upstream and downstream presence' },
        { name: 'Peer C', ticker: 'PC', geography_presence: 'US-focused industrial company with growing international operations base' }
      ],
      metrics: Array.from({ length: 10 }, (_, i) => ({
        metric: `Metric ${i}`,
        company: 100,
        peer1: 90,
        peer2: 95,
        peer3: 85,
        industry_avg: 92,
        source: 'S1'
      }))
    },
    benchmark_summary: {
      overall_assessment: 'Test Corp performs well relative to peers across key financial metrics in the North American market with strong margin performance.',
      key_strengths: [
        { strength: 'Margins', description: 'Superior EBITDA margins driven by integration benefits and cost discipline across operations', geography_context: 'North American margins benefit from scale advantages' },
        { strength: 'Returns', description: 'Highest ROIC among peers reflecting disciplined capital allocation focused on high-return expansions', geography_context: 'Regional operations generate superior returns due to integration' }
      ],
      key_gaps: [
        { gap: 'Scale', description: 'Smallest revenue base among major peers limiting negotiating power and portfolio diversification', geography_context: 'Concentrated footprint vs more diversified global peers', magnitude: 'Moderate' },
        { gap: 'Growth', description: 'Below-peer revenue growth rate reflecting mature asset base with limited greenfield development pipeline', geography_context: 'Growth constrained by regional regulatory and capacity factors', magnitude: 'Significant' }
      ],
      competitive_positioning: 'Test Corp holds a strong competitive position in its core market, ranking first or second among peers on most profitability metrics while trailing on growth.'
    },
    sources_used: sourcesUsed
  });

  it('accepts valid S# source IDs', () => {
    const result = peerBenchmarkingOutputSchema.safeParse(
      makePeerBenchmarkingOutput(['S1', 'S2', 'S10'])
    );
    expect(result.success).toBe(true);
  });

  it('rejects full citation strings in sources_used', () => {
    const result = peerBenchmarkingOutputSchema.safeParse(
      makePeerBenchmarkingOutput(['Imperial Oil 2024 10-K filing', 'S2'])
    );
    expect(result.success).toBe(false);
  });

  it('rejects URL strings in sources_used', () => {
    const result = peerBenchmarkingOutputSchema.safeParse(
      makePeerBenchmarkingOutput(['https://example.com/report.pdf'])
    );
    expect(result.success).toBe(false);
  });

  it('rejects S# with trailing text', () => {
    const result = peerBenchmarkingOutputSchema.safeParse(
      makePeerBenchmarkingOutput(['S1 - Annual Report'])
    );
    expect(result.success).toBe(false);
  });

  it('accepts empty sources_used array', () => {
    const result = peerBenchmarkingOutputSchema.safeParse(
      makePeerBenchmarkingOutput([])
    );
    expect(result.success).toBe(true);
  });

  it('enforces S# regex on segment analysis sources_used', () => {
    // Test the sources_used field shape directly via schema introspection
    const sourcesSchema = segmentAnalysisOutputSchema.shape.sources_used;
    expect(sourcesSchema.safeParse(['S1', 'S12']).success).toBe(true);
    expect(sourcesSchema.safeParse(['not-a-source-id']).success).toBe(false);
    expect(sourcesSchema.safeParse(['S1 - Annual Report']).success).toBe(false);
  });
});
