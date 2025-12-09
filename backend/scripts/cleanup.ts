import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANIES = ['Crane Co', 'STIHL'];

async function main() {
  console.log(`Searching for jobs matching: ${COMPANIES.join(', ')}`);

  const jobs = await prisma.researchJob.findMany({
    where: { companyName: { in: COMPANIES } },
    select: { id: true, companyName: true, status: true, createdAt: true },
  });

  if (!jobs.length) {
    console.log('No matching jobs found. No changes made.');
    return;
  }

  console.table(jobs);

  const ids = jobs.map((j) => j.id);

  const deletedSubJobs = await prisma.researchSubJob.deleteMany({
    where: { researchId: { in: ids } },
  });

  const deletedJobs = await prisma.researchJob.deleteMany({
    where: { id: { in: ids } },
  });

  console.log({
    deletedSubJobs: deletedSubJobs.count,
    deletedJobs: deletedJobs.count,
  });
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
