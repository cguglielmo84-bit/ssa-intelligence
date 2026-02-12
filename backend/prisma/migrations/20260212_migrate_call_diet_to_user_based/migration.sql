-- Migration: Replace RevenueOwner-based junction tables with User-based junction tables
-- The news branch (PR #44) refactored call-diet ownership from a standalone RevenueOwner
-- model to the existing User model. These changes were applied via `db push` locally but
-- never captured in a migration, causing production 500s on all /api/news/* endpoints.
--
-- Made idempotent (IF EXISTS / IF NOT EXISTS) for safety across environments.

-- ============================================================================
-- 1. DROP OLD JUNCTION TABLES (RevenueOwner-based)
-- ============================================================================

-- Drop foreign keys first
ALTER TABLE IF EXISTS "call_diet_companies" DROP CONSTRAINT IF EXISTS "call_diet_companies_revenueOwnerId_fkey";
ALTER TABLE IF EXISTS "call_diet_companies" DROP CONSTRAINT IF EXISTS "call_diet_companies_companyId_fkey";
ALTER TABLE IF EXISTS "call_diet_people" DROP CONSTRAINT IF EXISTS "call_diet_people_revenueOwnerId_fkey";
ALTER TABLE IF EXISTS "call_diet_people" DROP CONSTRAINT IF EXISTS "call_diet_people_personId_fkey";
ALTER TABLE IF EXISTS "call_diet_tags" DROP CONSTRAINT IF EXISTS "call_diet_tags_revenueOwnerId_fkey";
ALTER TABLE IF EXISTS "call_diet_tags" DROP CONSTRAINT IF EXISTS "call_diet_tags_tagId_fkey";
ALTER TABLE IF EXISTS "article_revenue_owners" DROP CONSTRAINT IF EXISTS "article_revenue_owners_article_id_fkey";
ALTER TABLE IF EXISTS "article_revenue_owners" DROP CONSTRAINT IF EXISTS "article_revenue_owners_revenue_owner_id_fkey";

-- Drop old tables
DROP TABLE IF EXISTS "call_diet_companies";
DROP TABLE IF EXISTS "call_diet_people";
DROP TABLE IF EXISTS "call_diet_tags";
DROP TABLE IF EXISTS "article_revenue_owners";
DROP TABLE IF EXISTS "revenue_owners";

-- ============================================================================
-- 2. CREATE NEW JUNCTION TABLES (User-based)
-- ============================================================================

-- User <-> TrackedCompany (call diet)
CREATE TABLE IF NOT EXISTS "user_call_diet_companies" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "user_call_diet_companies_pkey" PRIMARY KEY ("userId","companyId")
);

-- User <-> TrackedPerson (call diet)
CREATE TABLE IF NOT EXISTS "user_call_diet_people" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "user_call_diet_people_pkey" PRIMARY KEY ("userId","personId")
);

-- User <-> NewsTag (call diet)
CREATE TABLE IF NOT EXISTS "user_call_diet_tags" (
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "user_call_diet_tags_pkey" PRIMARY KEY ("userId","tagId")
);

-- NewsArticle <-> User (many-to-many)
CREATE TABLE IF NOT EXISTS "article_users" (
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "article_users_pkey" PRIMARY KEY ("article_id","user_id")
);

-- ============================================================================
-- 3. FOREIGN KEYS
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "user_call_diet_companies" ADD CONSTRAINT "user_call_diet_companies_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_call_diet_companies" ADD CONSTRAINT "user_call_diet_companies_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "tracked_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_call_diet_people" ADD CONSTRAINT "user_call_diet_people_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_call_diet_people" ADD CONSTRAINT "user_call_diet_people_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "tracked_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_call_diet_tags" ADD CONSTRAINT "user_call_diet_tags_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_call_diet_tags" ADD CONSTRAINT "user_call_diet_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "news_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "article_users" ADD CONSTRAINT "article_users_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "article_users" ADD CONSTRAINT "article_users_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
