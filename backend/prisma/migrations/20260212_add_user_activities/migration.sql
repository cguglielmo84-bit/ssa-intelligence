-- Migration: Add missing tables that were created via db push but never had migrations
-- Tables: user_pinned_articles, user_activities, prompts, prompt_versions, prompt_test_runs, pricing_rates, cost_events
-- Enums: ActivityType, PromptStatus

-- ============================================================================
-- ENUMS
-- ============================================================================

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('article_open', 'article_close', 'article_link_click', 'page_view', 'page_leave', 'pin', 'unpin', 'export_pdf', 'export_markdown', 'search', 'filter_change');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('draft', 'published', 'archived');

-- ============================================================================
-- TABLES
-- ============================================================================

-- CreateTable: user_pinned_articles
CREATE TABLE "user_pinned_articles" (
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pinned_articles_pkey" PRIMARY KEY ("user_id","article_id")
);

-- CreateTable: user_activities
CREATE TABLE "user_activities" (
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

-- CreateTable: prompts
CREATE TABLE "prompts" (
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

-- CreateTable: prompt_versions
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reportType" "ReportType",
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: prompt_test_runs
CREATE TABLE "prompt_test_runs" (
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

-- CreateTable: pricing_rates
CREATE TABLE "pricing_rates" (
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

-- CreateTable: cost_events
CREATE TABLE "cost_events" (
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
-- INDEXES
-- ============================================================================

-- user_activities indexes
CREATE INDEX "user_activities_user_id_idx" ON "user_activities"("user_id");
CREATE INDEX "user_activities_type_idx" ON "user_activities"("type");
CREATE INDEX "user_activities_created_at_idx" ON "user_activities"("created_at");
CREATE INDEX "user_activities_article_id_idx" ON "user_activities"("article_id");

-- prompts indexes
CREATE UNIQUE INDEX "prompts_sectionId_reportType_version_key" ON "prompts"("sectionId", "reportType", "version");
CREATE INDEX "prompts_sectionId_reportType_status_idx" ON "prompts"("sectionId", "reportType", "status");

-- prompt_versions indexes
CREATE UNIQUE INDEX "prompt_versions_sectionId_reportType_version_key" ON "prompt_versions"("sectionId", "reportType", "version");
CREATE INDEX "prompt_versions_sectionId_reportType_idx" ON "prompt_versions"("sectionId", "reportType");

-- prompt_test_runs indexes
CREATE INDEX "prompt_test_runs_sectionId_idx" ON "prompt_test_runs"("sectionId");

-- pricing_rates indexes
CREATE UNIQUE INDEX "pricing_rates_provider_model_effectiveFrom_key" ON "pricing_rates"("provider", "model", "effectiveFrom");
CREATE INDEX "pricing_rates_provider_model_idx" ON "pricing_rates"("provider", "model");
CREATE INDEX "pricing_rates_effectiveFrom_idx" ON "pricing_rates"("effectiveFrom");

-- cost_events indexes
CREATE INDEX "cost_events_jobId_idx" ON "cost_events"("jobId");
CREATE INDEX "cost_events_draftId_idx" ON "cost_events"("draftId");
CREATE INDEX "cost_events_stage_idx" ON "cost_events"("stage");
CREATE INDEX "cost_events_createdAt_idx" ON "cost_events"("createdAt");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- user_pinned_articles
ALTER TABLE "user_pinned_articles" ADD CONSTRAINT "user_pinned_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_pinned_articles" ADD CONSTRAINT "user_pinned_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- user_activities
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- cost_events
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
