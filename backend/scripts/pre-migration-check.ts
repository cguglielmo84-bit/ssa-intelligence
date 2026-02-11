/**
 * Pre-Migration Check Script
 * Reports edge cases before migrating RevenueOwner data to User model
 *
 * Run: npx tsx backend/scripts/pre-migration-check.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Pre-Migration Check: RevenueOwner → User ===\n');

  // 1. All revenue owners
  const allOwners = await prisma.revenueOwner.findMany({
    include: {
      _count: { select: { companies: true, people: true, tags: true, articles: true } },
    },
  });
  console.log(`Total RevenueOwners: ${allOwners.length}`);

  // 2. Revenue owners with NULL email
  const nullEmailOwners = allOwners.filter(o => !o.email);
  console.log(`\nRevenueOwners with NULL email: ${nullEmailOwners.length}`);
  for (const o of nullEmailOwners) {
    console.log(`  - "${o.name}" (id: ${o.id}) — companies: ${o._count.companies}, people: ${o._count.people}, tags: ${o._count.tags}, articles: ${o._count.articles}`);
  }

  // 3. Revenue owners with email — check for matching User records
  const emailOwners = allOwners.filter(o => o.email);
  console.log(`\nRevenueOwners with email: ${emailOwners.length}`);

  let matchCount = 0;
  let noMatchCount = 0;
  const noMatchList: { name: string; email: string }[] = [];

  for (const o of emailOwners) {
    const user = await prisma.user.findUnique({ where: { email: o.email! } });
    if (user) {
      matchCount++;
    } else {
      noMatchCount++;
      noMatchList.push({ name: o.name, email: o.email! });
    }
  }

  console.log(`  Matching User records found: ${matchCount}`);
  console.log(`  No matching User record: ${noMatchCount}`);
  for (const item of noMatchList) {
    console.log(`    - "${item.name}" <${item.email}> — will create new MEMBER User`);
  }

  // 4. Duplicate email detection
  const emailMap = new Map<string, string[]>();
  for (const o of emailOwners) {
    const key = o.email!.toLowerCase();
    if (!emailMap.has(key)) emailMap.set(key, []);
    emailMap.get(key)!.push(o.name);
  }
  const dupes = [...emailMap.entries()].filter(([, names]) => names.length > 1);
  console.log(`\nDuplicate emails across RevenueOwners: ${dupes.length}`);
  for (const [email, names] of dupes) {
    console.log(`  - ${email}: ${names.join(', ')}`);
  }

  // 5. Article counts that would be migrated
  const totalArticleLinks = await prisma.articleRevenueOwner.count();
  console.log(`\nTotal ArticleRevenueOwner links: ${totalArticleLinks}`);

  // 6. Call diet counts
  const totalCompanyLinks = await prisma.callDietCompany.count();
  const totalPeopleLinks = await prisma.callDietPerson.count();
  const totalTagLinks = await prisma.callDietTag.count();
  console.log(`Total CallDietCompany links: ${totalCompanyLinks}`);
  console.log(`Total CallDietPerson links: ${totalPeopleLinks}`);
  console.log(`Total CallDietTag links: ${totalTagLinks}`);

  console.log('\n=== Check Complete ===');
}

main()
  .catch(e => {
    console.error('Error running pre-migration check:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
