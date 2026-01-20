type SubJobLike = {
  status: string;
  stage?: string | null;
};

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export const computeTerminalProgress = (subJobs: SubJobLike[]): number => {
  if (!subJobs.length) {
    return 0;
  }

  const terminalCount = subJobs.filter((subJob) =>
    TERMINAL_STATUSES.has(subJob.status)
  ).length;

  return terminalCount / subJobs.length;
};

export const computeFinalStatus = (jobStatus: string, subJobs: SubJobLike[]): string => {
  if (jobStatus === 'cancelled' || jobStatus === 'failed') {
    return jobStatus;
  }

  if (subJobs.some((subJob) => subJob.stage === 'foundation' && subJob.status === 'failed')) {
    return 'failed';
  }

  const allTerminal = subJobs.every((subJob) =>
    TERMINAL_STATUSES.has(subJob.status)
  );

  if (!allTerminal) {
    return jobStatus;
  }

  if (subJobs.some((subJob) => subJob.status === 'failed')) {
    return 'completed_with_errors';
  }

  if (subJobs.some((subJob) => subJob.status === 'cancelled')) {
    return 'cancelled';
  }

  return 'completed';
};
