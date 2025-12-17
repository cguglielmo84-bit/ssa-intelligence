/**
 * Backfill domains for existing companies using Claude inference.
 * Skips PPG Industries intentionally to test new-run inference.
 */
import { PrismaClient } from '@prisma/client';
import { ensureDomainForJob } from '../src/services/domain-infer.ts';

const prisma = new PrismaClient();

const SKIP_COMPANIES = ['ppg industries'];

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
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
