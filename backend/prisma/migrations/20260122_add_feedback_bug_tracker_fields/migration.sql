-- Add bug tracker enhancements to Feedback table

-- Create FeedbackType enum
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('bug', 'issue', 'feature', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create FeedbackStatus enum
DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'reviewed', 'in_progress', 'resolved', 'wont_fix');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Feedback table
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "type" "FeedbackType" NOT NULL DEFAULT 'other';
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "status" "FeedbackStatus" NOT NULL DEFAULT 'new';
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "resolution_notes" TEXT;
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Rename columns to use snake_case (if they exist with old names)
DO $$ BEGIN
    ALTER TABLE "Feedback" RENAME COLUMN "pagePath" TO "page_path";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Feedback" RENAME COLUMN "reportId" TO "report_id";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");
