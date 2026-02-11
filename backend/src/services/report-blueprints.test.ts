import { describe, it, expect } from 'vitest';
import { getReportBlueprint } from './report-blueprints.js';

describe('report-blueprints', () => {
  it('returns FS blueprint with correct section order', () => {
    const fsBlueprint = getReportBlueprint('FS');
    expect(fsBlueprint).toBeTruthy();

    const sectionIds = fsBlueprint!.sections.map((section) => section.id);
    expect(sectionIds[0]).toBe('exec_summary');
    expect(sectionIds[1]).toBe('financial_snapshot');
  });
});
