-- ============================================================================
-- Data Migration: RevenueOwner → User
-- Run AFTER prisma migrate dev creates the new junction tables
-- ============================================================================

-- Step 1: Create User records for RevenueOwners that have an email but no matching User
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
SELECT
  ro.id,  -- reuse the RevenueOwner ID so article links are simpler
  ro.email,
  ro.name,
  'MEMBER'::"UserRole",
  NOW(),
  NOW()
FROM revenue_owners ro
WHERE ro.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE LOWER(u.email) = LOWER(ro.email))
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create User records for RevenueOwners with NULL email (synthetic email)
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
SELECT
  ro.id,
  LOWER(REPLACE(REPLACE(ro.name, ' ', '.'), '''', '')) || '.newsuser@ssaandco.com',
  ro.name,
  'MEMBER'::"UserRole",
  NOW(),
  NOW()
FROM revenue_owners ro
WHERE ro.email IS NULL
ON CONFLICT (email) DO NOTHING;

-- Step 3: Migrate call diet companies
-- For owners with email matching an existing User, use that User's ID
-- For owners we just created above, the ID matches the RevenueOwner ID
INSERT INTO user_call_diet_companies ("userId", "companyId")
SELECT
  COALESCE(u_existing.id, ro.id) AS "userId",
  cdc."companyId"
FROM call_diet_companies cdc
JOIN revenue_owners ro ON ro.id = cdc."revenueOwnerId"
LEFT JOIN "User" u_existing ON LOWER(u_existing.email) = LOWER(ro.email) AND u_existing.id != ro.id
ON CONFLICT DO NOTHING;

-- Step 4: Migrate call diet people
INSERT INTO user_call_diet_people ("userId", "personId")
SELECT
  COALESCE(u_existing.id, ro.id) AS "userId",
  cdp."personId"
FROM call_diet_people cdp
JOIN revenue_owners ro ON ro.id = cdp."revenueOwnerId"
LEFT JOIN "User" u_existing ON LOWER(u_existing.email) = LOWER(ro.email) AND u_existing.id != ro.id
ON CONFLICT DO NOTHING;

-- Step 5: Migrate call diet tags
INSERT INTO user_call_diet_tags ("userId", "tagId")
SELECT
  COALESCE(u_existing.id, ro.id) AS "userId",
  cdt."tagId"
FROM call_diet_tags cdt
JOIN revenue_owners ro ON ro.id = cdt."revenueOwnerId"
LEFT JOIN "User" u_existing ON LOWER(u_existing.email) = LOWER(ro.email) AND u_existing.id != ro.id
ON CONFLICT DO NOTHING;

-- Step 6: Migrate article-owner links to article-user links
INSERT INTO article_users ("article_id", "user_id")
SELECT
  aro."article_id",
  COALESCE(u_existing.id, ro.id) AS "user_id"
FROM article_revenue_owners aro
JOIN revenue_owners ro ON ro.id = aro."revenue_owner_id"
LEFT JOIN "User" u_existing ON LOWER(u_existing.email) = LOWER(ro.email) AND u_existing.id != ro.id
ON CONFLICT DO NOTHING;

-- Verification queries (run these to check migration results)
-- SELECT COUNT(*) FROM user_call_diet_companies;
-- SELECT COUNT(*) FROM user_call_diet_people;
-- SELECT COUNT(*) FROM user_call_diet_tags;
-- SELECT COUNT(*) FROM article_users;
-- SELECT COUNT(*) FROM call_diet_companies;
-- SELECT COUNT(*) FROM call_diet_people;
-- SELECT COUNT(*) FROM call_diet_tags;
-- SELECT COUNT(*) FROM article_revenue_owners;
