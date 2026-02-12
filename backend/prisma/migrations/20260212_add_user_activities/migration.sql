-- Migration: Add missing tables that were created via db push but never had migrations
-- Made idempotent (IF NOT EXISTS) since some objects may already exist on target DB.

-- ============================================================================
-- ENUMS (idempotent: skip if already exists)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('article_open', 'article_close', 'article_link_click', 'page_view', 'page_leave', 'pin', 'unpin', 'export_pdf', 'export_markdown', 'search', 'filter_change');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PromptStatus" AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user_pinned_articles" (
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_pinned_articles_pkey" PRIMARY KEY ("user_id","article_id")
);

CREATE TABLE IF NOT EXISTS "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "article_id" TEXT,
    "page_path" TEXT,
    "duration_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "prompts" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reportType" "ReportType",
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "status" "PromptStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "prompt_versions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reportType" "ReportType",
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "prompt_test_runs" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reportType" "ReportType",
    "promptContent" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "geography" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "prompt_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pricing_rates" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputRate" DOUBLE PRECISION NOT NULL,
    "outputRate" DOUBLE PRECISION NOT NULL,
    "cacheReadRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cacheWriteRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cost_events" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "subJobId" TEXT,
    "draftId" TEXT,
    "stage" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_events_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES (idempotent: IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "user_activities_user_id_idx" ON "user_activities"("user_id");
CREATE INDEX IF NOT EXISTS "user_activities_type_idx" ON "user_activities"("type");
CREATE INDEX IF NOT EXISTS "user_activities_created_at_idx" ON "user_activities"("created_at");
CREATE INDEX IF NOT EXISTS "user_activities_article_id_idx" ON "user_activities"("article_id");

CREATE UNIQUE INDEX IF NOT EXISTS "prompts_sectionId_reportType_version_key" ON "prompts"("sectionId", "reportType", "version");
CREATE INDEX IF NOT EXISTS "prompts_sectionId_reportType_status_idx" ON "prompts"("sectionId", "reportType", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "prompt_versions_sectionId_reportType_version_key" ON "prompt_versions"("sectionId", "reportType", "version");
CREATE INDEX IF NOT EXISTS "prompt_versions_sectionId_reportType_idx" ON "prompt_versions"("sectionId", "reportType");

CREATE INDEX IF NOT EXISTS "prompt_test_runs_sectionId_idx" ON "prompt_test_runs"("sectionId");

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_rates_provider_model_effectiveFrom_key" ON "pricing_rates"("provider", "model", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "pricing_rates_provider_model_idx" ON "pricing_rates"("provider", "model");
CREATE INDEX IF NOT EXISTS "pricing_rates_effectiveFrom_idx" ON "pricing_rates"("effectiveFrom");

CREATE INDEX IF NOT EXISTS "cost_events_jobId_idx" ON "cost_events"("jobId");
CREATE INDEX IF NOT EXISTS "cost_events_draftId_idx" ON "cost_events"("draftId");
CREATE INDEX IF NOT EXISTS "cost_events_stage_idx" ON "cost_events"("stage");
CREATE INDEX IF NOT EXISTS "cost_events_createdAt_idx" ON "cost_events"("createdAt");

-- ============================================================================
-- FOREIGN KEYS (idempotent: skip if already exists)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "user_pinned_articles" ADD CONSTRAINT "user_pinned_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_pinned_articles" ADD CONSTRAINT "user_pinned_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
