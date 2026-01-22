/**
 * @param {Array<{ id: string; memberCount?: number }>} groups
 * @param {{ groups?: Array<{ id: string }> } | null | undefined} deletedUser
 * @returns {Array<{ id: string; memberCount?: number }>}
 */
export const applyUserDeletionToGroups = (groups, deletedUser) => {
  if (!deletedUser?.groups?.length) {
    return groups;
  }

  const deletedGroupIds = new Set(deletedUser.groups.map((group) => group.id));

  return groups.map((group) => {
    if (!deletedGroupIds.has(group.id)) {
      return group;
    }

    const currentCount = typeof group.memberCount === 'number' ? group.memberCount : 0;
    return {
      ...group,
      memberCount: Math.max(0, currentCount - 1),
    };
  });
};
