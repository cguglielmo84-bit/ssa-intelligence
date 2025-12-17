-- Add thumbnail URL storage for report previews
ALTER TABLE "ResearchJob" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
