-- Migration: Add automatic bug reports for permanent stage failures
-- Made idempotent (IF NOT EXISTS) since some objects may already exist on target DB.

-- ============================================================================
-- ENUMS (idempotent: skip if already exists)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "BugReportSeverity" AS ENUM ('critical', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BugReportStatus" AS ENUM ('open', 'acknowledged', 'investigating', 'resolved', 'wont_fix');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BugReportCategory" AS ENUM ('rate_limit', 'server_error', 'parse_error', 'content_error', 'timeout', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "bug_reports" (
    "id" TEXT NOT NULL,
    "severity" "BugReportSeverity" NOT NULL,
    "status" "BugReportStatus" NOT NULL DEFAULT 'open',
    "category" "BugReportCategory" NOT NULL DEFAULT 'unknown',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "error_fingerprint" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "sub_job_id" TEXT,
    "stage" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "geography" TEXT,
    "industry" TEXT,
    "attempts" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "error_context" JSONB NOT NULL DEFAULT '{}',
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES (idempotent: IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "bug_reports_status_idx" ON "bug_reports"("status");
CREATE INDEX IF NOT EXISTS "bug_reports_severity_idx" ON "bug_reports"("severity");
CREATE INDEX IF NOT EXISTS "bug_reports_category_idx" ON "bug_reports"("category");
CREATE INDEX IF NOT EXISTS "bug_reports_stage_idx" ON "bug_reports"("stage");
CREATE INDEX IF NOT EXISTS "bug_reports_job_id_idx" ON "bug_reports"("job_id");
CREATE INDEX IF NOT EXISTS "bug_reports_error_fingerprint_idx" ON "bug_reports"("error_fingerprint");
CREATE INDEX IF NOT EXISTS "bug_reports_created_at_idx" ON "bug_reports"("created_at");
CREATE INDEX IF NOT EXISTS "bug_reports_status_severity_idx" ON "bug_reports"("status", "severity");
