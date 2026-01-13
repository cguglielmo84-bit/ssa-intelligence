/**
 * Backfill domains for existing companies using Claude inference.
 * Skips PPG Industries intentionally to test new-run inference.
 */
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ensureDomainForJob } from '../src/services/domain-infer.ts';

dotenv.config();

const prisma = new PrismaClient();

const SKIP_COMPANIES = ['ppg industries'];

const requiredEnv = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const logError = (err: unknown) => {
  if (err instanceof Error) {
    console.error(err.stack || err.message);
    return;
  }
  try {
    console.error('Unknown error:', JSON.stringify(err, null, 2));
  } catch {
    console.error('Unknown error:', err);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:');
  logError(reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:');
  logError(err);
  process.exit(1);
});

async function main() {
  const jobs = await prisma.researchJob.findMany({
    select: { id: true, companyName: true, domain: true },
  });

  console.log(`Found ${jobs.length} jobs. Backfilling domains (skipping: ${SKIP_COMPANIES.join(', ')})`);

  for (const job of jobs) {
    const key = (job.companyName || '').trim().toLowerCase();
    if (SKIP_COMPANIES.includes(key)) {
      console.log(`Skipping ${job.companyName}`);
      continue;
    }
    if (job.domain) {
      console.log(`Already has domain: ${job.companyName} (${job.domain})`);
      continue;
    }
    console.log(`Inferring domain for ${job.companyName}...`);
    await ensureDomainForJob(prisma, job.id, job.companyName);
  }

  console.log('Backfill complete.');
}

main()
  .catch((err) => {
    console.error('Backfill failed:');
    logError(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
