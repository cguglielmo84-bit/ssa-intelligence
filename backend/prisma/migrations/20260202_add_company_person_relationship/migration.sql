-- Add company_id FK to tracked_people table
ALTER TABLE "tracked_people" ADD COLUMN "company_id" TEXT;

-- Add index for efficient lookups
CREATE INDEX "tracked_people_company_id_idx" ON "tracked_people"("company_id");

-- Add foreign key constraint
ALTER TABLE "tracked_people" ADD CONSTRAINT "tracked_people_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "tracked_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill company_id from companyAffiliation where names match (case-insensitive)
UPDATE "tracked_people" p
SET "company_id" = c."id"
FROM "tracked_companies" c
WHERE LOWER(p."company_affiliation") = LOWER(c."name")
  AND p."company_id" IS NULL
  AND p."company_affiliation" IS NOT NULL;
