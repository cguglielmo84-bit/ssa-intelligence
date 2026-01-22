import type { SectionId } from '../types';

const LOCKED_SECTIONS = new Set<SectionId>(['appendix']);

export const isSectionLocked = (sectionId: SectionId) => LOCKED_SECTIONS.has(sectionId);

export const enforceLockedSections = (sections: SectionId[]) => {
  const set = new Set<SectionId>(sections);
  LOCKED_SECTIONS.forEach((sectionId) => set.add(sectionId));
  return Array.from(set);
};
