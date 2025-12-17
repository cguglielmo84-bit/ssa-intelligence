-- Add domain fields for company logo/metadata
ALTER TABLE "ResearchJob" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "ResearchJob" ADD COLUMN IF NOT EXISTS "normalizedDomain" TEXT;
CREATE INDEX IF NOT EXISTS "ResearchJob_normalizedDomain_idx" ON "ResearchJob"("normalizedDomain");
