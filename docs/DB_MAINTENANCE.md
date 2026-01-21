# Database Maintenance (Render)

Runbook for applying Prisma schema changes in Render or other hosted Postgres environments.

## Prereqs
- Set `DATABASE_URL` in `backend/.env` to the Render Postgres connection string (include `sslmode=require`).
- Run commands from the repo root unless noted.

## Commands

### 1) Check for duplicate normalized combos (unique constraint)
```
cd backend
npx prisma db execute --file prisma/find_duplicates.sql --schema prisma/schema.prisma
```
If rows return, update one record per duplicate set to make the normalized fields unique, then rerun until no rows are returned.

### 2) Apply migrations
```
cd backend
npx prisma migrate deploy --schema prisma/schema.prisma
```
This applies migrations to the database referenced by `DATABASE_URL`.

### 3) Generate Prisma client (optional)
```
cd backend
npx prisma generate --schema prisma/schema.prisma
```

## Notes
- Always take a Render DB backup before migrations.
- If `prisma migrate deploy` fails, fix the reported issue (usually duplicates), then rerun.
- The backend Dockerfile uses the Playwright base image, so Chromium/PDF dependencies are already included.