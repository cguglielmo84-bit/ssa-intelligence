import { PrismaClient } from '@prisma/client';
import { ResearchOrchestrator } from '../src/services/orchestrator.js';

const prisma = new PrismaClient();

const DEFAULT_JOB_DURATION_MS = Number(process.env.HARNESS_JOB_DURATION_MS ?? 6000);
const DEFAULT_POLL_INTERVAL_MS = Number(process.env.HARNESS_POLL_INTERVAL_MS ?? 250);
const DEFAULT_POLL_TIMEOUT_MS = Number(process.env.HARNESS_POLL_TIMEOUT_MS ?? 15000);
const KEEP_DATA = process.env.HARNESS_KEEP_DATA === '1';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecordNotFound = (error: unknown): boolean => {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
  );
};

class QueueHarnessOrchestrator extends ResearchOrchestrator {
  private harnessPrisma: PrismaClient;
  private jobDurationMs: number;
  private tickMs: number;

  constructor(prismaClient: PrismaClient, jobDurationMs: number, tickMs: number) {
    super(prismaClient);
    this.harnessPrisma = prismaClient;
    this.jobDurationMs = jobDurationMs;
    this.tickMs = tickMs;
  }

  async executeJob(jobId: string) {
    const started = Date.now();

    try {
      const existing = await this.harnessPrisma.researchJob.findUnique({
        where: { id: jobId },
        select: { status: true }
      });
      if (!existing || existing.status === 'cancelled') {
        return;
      }

      await this.harnessPrisma.researchJob.update({
        where: { id: jobId },
        data: { currentStage: 'foundation' }
      }).catch((error) => {
        if (!isRecordNotFound(error)) {
          throw error;
        }
      });

      await this.harnessPrisma.researchSubJob.updateMany({
        where: { researchId: jobId },
        data: { status: 'running', startedAt: new Date() }
      });

      while (Date.now() - started < this.jobDurationMs) {
        const stillActive = await this.harnessPrisma.researchJob.findUnique({
          where: { id: jobId },
          select: { status: true }
        });
        if (!stillActive || stillActive.status === 'cancelled') {
          return;
        }
        await sleep(this.tickMs);
      }

      await this.harnessPrisma.researchSubJob.updateMany({
        where: { researchId: jobId },
        data: { status: 'completed', completedAt: new Date(), duration: this.jobDurationMs }
      });

      await this.harnessPrisma.researchJob.update({
        where: { id: jobId },
        data: { status: 'completed', currentStage: null, completedAt: new Date(), progress: 1 }
      }).catch((error) => {
        if (!isRecordNotFound(error)) {
          throw error;
        }
      });
    } catch (error) {
      console.error('[harness] executeJob error:', error);
      try {
        await this.harnessPrisma.researchJob.update({
          where: { id: jobId },
          data: { status: 'failed', currentStage: null }
        });
      } catch (updateError) {
        if (!isRecordNotFound(updateError)) {
          console.error('[harness] failed to mark job as failed:', updateError);
        }
      }
    } finally {
      this.processQueue().catch(console.error);
    }
  }
}

async function waitForStatus(
  jobId: string,
  targetStatus: string,
  timeoutMs: number,
  pollMs: number
): Promise<string | null> {
  const start = Date.now();
  let firstMissingAt: number | null = null;
  while (Date.now() - start < timeoutMs) {
    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      select: { status: true }
    });
    if (!job) {
      if (firstMissingAt === null) {
        firstMissingAt = Date.now();
        console.log('[harness] job missing on lookup', { jobId, targetStatus });
      }
      if (Date.now() - firstMissingAt > Math.min(2000, timeoutMs)) {
        return null;
      }
      await sleep(pollMs);
      continue;
    }
    if (job.status === targetStatus) {
      return job.status;
    }
    if (firstMissingAt !== null) {
      console.log('[harness] job reappeared after missing', { jobId, status: job.status });
      firstMissingAt = null;
    }
    await sleep(pollMs);
  }
  return null;
}

async function logRunningJobs() {
  const runningJobs = await prisma.researchJob.findMany({
    where: { status: 'running' },
    select: {
      id: true,
      currentStage: true,
      startedAt: true,
      updatedAt: true,
      subJobs: { select: { status: true } }
    }
  });

  const summaries = runningJobs.map((job) => {
    const counts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
    for (const subJob of job.subJobs) {
      switch (subJob.status) {
        case 'pending':
          counts.pending += 1;
          break;
        case 'running':
          counts.running += 1;
          break;
        case 'completed':
          counts.completed += 1;
          break;
        case 'failed':
          counts.failed += 1;
          break;
        case 'cancelled':
          counts.cancelled += 1;
          break;
        default:
          break;
      }
    }
    return {
      id: job.id,
      currentStage: job.currentStage,
      startedAt: job.startedAt?.toISOString() ?? null,
      updatedAt: job.updatedAt?.toISOString() ?? null,
      subJobCounts: counts
    };
  });

  console.log('[harness] running job summaries', summaries);
}

async function main() {
  const orchestrator = new QueueHarnessOrchestrator(
    prisma,
    DEFAULT_JOB_DURATION_MS,
    DEFAULT_POLL_INTERVAL_MS
  );

  const user = await prisma.user.create({
    data: {
      email: `queue-harness-${Date.now()}@example.com`,
      name: 'Queue Harness'
    }
  });

  console.log('[harness] creating job A');
  const jobA = await orchestrator.createJob({
    companyName: `Queue Harness A ${Date.now()}`,
    geography: 'NA',
    userId: user.id
  });
  console.log('[harness] job A id:', jobA.id);
  const jobAFresh = await prisma.researchJob.findUnique({
    where: { id: jobA.id },
    select: { status: true }
  });
  console.log('[harness] job A initial status:', jobAFresh?.status ?? 'missing');

  const jobAStatus = await waitForStatus(
    jobA.id,
    'running',
    DEFAULT_POLL_TIMEOUT_MS,
    DEFAULT_POLL_INTERVAL_MS
  );
  console.log('[harness] job A status:', jobAStatus ?? 'missing');

  console.log('[harness] cancelling job A');
  await prisma.researchJob.deleteMany({ where: { id: jobA.id } });

  console.log('[harness] creating job B');
  const jobB = await orchestrator.createJob({
    companyName: `Queue Harness B ${Date.now()}`,
    geography: 'NA',
    userId: user.id
  });
  console.log('[harness] job B id:', jobB.id);
  const jobBFresh = await prisma.researchJob.findUnique({
    where: { id: jobB.id },
    select: { status: true }
  });
  console.log('[harness] job B initial status:', jobBFresh?.status ?? 'missing');

  const jobBStart = Date.now();
  const jobBStatus = await waitForStatus(
    jobB.id,
    'running',
    DEFAULT_POLL_TIMEOUT_MS,
    DEFAULT_POLL_INTERVAL_MS
  );
  const jobBDelayMs = jobBStatus ? Date.now() - jobBStart : null;
  console.log(
    '[harness] job B status:',
    jobBStatus ?? 'missing',
    'delayMs:',
    jobBDelayMs ?? 'n/a'
  );

  await logRunningJobs();

  const jobBFinal = await waitForStatus(
    jobB.id,
    'completed',
    DEFAULT_POLL_TIMEOUT_MS,
    DEFAULT_POLL_INTERVAL_MS
  );
  console.log('[harness] job B final status:', jobBFinal ?? 'timeout');

  if (jobBStatus !== 'running') {
    throw new Error('Job B did not reach running status within timeout.');
  }

  if (jobBFinal !== 'completed') {
    throw new Error('Job B did not reach completed status within timeout.');
  }

  if (!KEEP_DATA) {
    await prisma.researchJob.deleteMany({
      where: { id: { in: [jobA.id, jobB.id] } }
    });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error('[harness] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
