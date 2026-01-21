# SSA Intelligence Storage and Persistence Overview

This summarizes how research data is stored, updated, and accessed.

## Stack
- Postgres is the source of truth for jobs, outputs, users, and groups.
- Prisma manages the schema and query layer (`backend/prisma/schema.prisma`).
- Redis is configured in the environment but not required by the current codebase.

## Core tables
### ResearchJob
One row per research run.

Key fields:
- Status and tracking: `status`, `currentStage`, `progress`, `queuedAt`, `startedAt`, `completedAt`.
- Inputs: `companyName`, `geography`, `industry`, `domain`, `focusAreas`.
- Prompt configuration: `reportType`, `selectedSections`, `userAddedPrompt`, `visibilityScope`.
- Outputs (base sections): `foundation`, `execSummary`, `financialSnapshot`, `companyOverview`, `segmentAnalysis`, `trends`, `peerBenchmarking`, `skuOpportunities`, `recentNews`, `conversationStarters`, `appendix`.
- Metadata: `metadata` (includes `blueprintVersion`, `reportInputs`, and source tracking), `overallConfidence`, `overallConfidenceScore`.
- Usage/cost: `promptTokens`, `completionTokens`, `costUsd`, `thumbnailUrl`.

Note: report-specific section outputs (PE/FS) are stored only in `ResearchSubJob.output` and are surfaced by the API.

### ResearchSubJob
One row per stage (foundation + each selected section).
- `stage`, `status`, `dependencies`, `attempts`, `lastError`.
- `output` JSON and `sourcesUsed`.
- Token and cost fields per stage.

### Group access
- `Group`, `GroupMembership`, and `ResearchJobGroup` support group sharing.

## Orchestration flow
1) `ResearchOrchestrator.createJob` inserts a `ResearchJob` and all `ResearchSubJob` rows.
2) Selected sections are expanded with dependencies; `foundation` and `appendix` are always included.
3) The queue runs jobs in order, updating `ResearchSubJob` and denormalizing base section outputs into `ResearchJob`.
4) Final status and confidence are computed once all stages complete.

## API and data consumption
- `GET /api/research/:id` returns a `sections` map that merges `ResearchJob` fields with `ResearchSubJob.output` (for report-specific sections).
- `GET /api/research/jobs/:id` returns status/progress only.
- `GET /api/report-blueprints` exposes the blueprint configuration used by the UI.

## Inspecting data
Prisma Studio:
```
cd backend
npx prisma studio --schema prisma/schema.prisma
```

SQL (psql):
```
psql "${DATABASE_URL}"
SELECT id, status, companyName, progress FROM "ResearchJob" ORDER BY "createdAt" DESC LIMIT 10;
```

## Resetting data (local/dev)
Be careful; this is destructive.
```
cd backend
$script='TRUNCATE TABLE "ResearchSubJob", "ResearchJob", "ResearchJobGroup" CASCADE;';
$script | npx prisma db execute --stdin --schema prisma/schema.prisma
```