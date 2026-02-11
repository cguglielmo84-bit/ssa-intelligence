import { describe, it, expect } from 'vitest';
import { applyUserDeletionToGroups } from './adminUsers.ts';

describe('applyUserDeletionToGroups', () => {
  it('decrements memberCount for each group the deleted user belonged to', () => {
    const groups = [
      { id: 'alpha', name: 'Alpha', slug: 'alpha', memberCount: 3 },
      { id: 'bravo', name: 'Bravo', slug: 'bravo', memberCount: 1 },
      { id: 'charlie', name: 'Charlie', slug: 'charlie', memberCount: 5 }
    ];
    const deletedUser = {
      id: 'user-1',
      email: 'user-1@example.com',
      role: 'MEMBER',
      groups: [
        { id: 'alpha', name: 'Alpha', slug: 'alpha' },
        { id: 'charlie', name: 'Charlie', slug: 'charlie' }
      ]
    };

    const updated = applyUserDeletionToGroups(groups, deletedUser);

    expect(updated.find((group) => group.id === 'alpha')?.memberCount).toBe(2);
    expect(updated.find((group) => group.id === 'bravo')?.memberCount).toBe(1);
    expect(updated.find((group) => group.id === 'charlie')?.memberCount).toBe(4);
  });

  it('clamps memberCount at zero when values are missing or already zero', () => {
    const groups = [
      { id: 'alpha', name: 'Alpha', slug: 'alpha' },
      { id: 'bravo', name: 'Bravo', slug: 'bravo', memberCount: 0 }
    ];
    const deletedUser = {
      id: 'user-2',
      email: 'user-2@example.com',
      role: 'MEMBER',
      groups: [
        { id: 'alpha', name: 'Alpha', slug: 'alpha' },
        { id: 'bravo', name: 'Bravo', slug: 'bravo' }
      ]
    };

    const updated = applyUserDeletionToGroups(groups, deletedUser);

    expect(updated.find((group) => group.id === 'alpha')?.memberCount).toBe(0);
    expect(updated.find((group) => group.id === 'bravo')?.memberCount).toBe(0);
  });
});
