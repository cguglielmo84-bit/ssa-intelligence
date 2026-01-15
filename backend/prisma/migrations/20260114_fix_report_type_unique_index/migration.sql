ALTER TABLE "ResearchJob"
  DROP CONSTRAINT IF EXISTS "ResearchJob_userId_normalizedCompany_normalizedGeography_normal";

ALTER TABLE "ResearchJob"
  ADD CONSTRAINT "ResearchJob_userId_normalizedCompany_normalizedGeography_normalizedIndustry_reportType_key"
  UNIQUE ("userId", "normalizedCompany", "normalizedGeography", "normalizedIndustry", "reportType");
