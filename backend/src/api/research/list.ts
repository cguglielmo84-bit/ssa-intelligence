/**
 * GET /api/research
 * List all research jobs for a user
 */

import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { buildVisibilityWhere } from '../../middleware/auth.js';
import { filterJobsByDerivedStatus } from './list-utils.js';
import { buildCompletedStages } from '../../services/stage-tracking-utils.js';
import { SECTION_NUMBER_MAP } from '../../lib/constants.js';
import { deriveJobStatus } from './status-utils.js';
import { safeErrorMessage } from '../../lib/error-utils.js';

interface ListQueryParams {
  limit?: string;
  offset?: string;
  status?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'companyName';
  sortOrder?: 'asc' | 'desc';
}

export async function listResearch(req: Request, res: Response) {
  try {
    const query = req.query as ListQueryParams;

    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse pagination with NaN guard
    const limit = Math.max(1, Math.min(parseInt(query.limit || '50') || 50, 100));
    const offset = Math.max(0, parseInt(query.offset || '0') || 0);

    // Parse sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const statusFilter = query.status;
    const shouldFilterByDerivedStatus = Boolean(statusFilter);

    // Build where clause
    const visibilityWhere = buildVisibilityWhere(req.auth);
    const where = visibilityWhere;

    // Fetch jobs
    const baseQuery = {
      where,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        status: true,
        companyName: true,
        geography: true,
        industry: true,
        domain: true,
        progress: true,
        currentStage: true,
        reportType: true,
        visibilityScope: true,
        selectedSections: true,
        userAddedPrompt: true,
        overallConfidence: true,
        overallConfidenceScore: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        queuedAt: true,
        thumbnailUrl: true,
        // include sub-job status for effective status + generated sections
        subJobs: {
          select: { stage: true, status: true }
        },
        jobGroups: {
          select: {
            group: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    };

    // Note: take:1000 is an upper bound for in-memory derived status filtering.
    // If a user has >1000 jobs, total count may be approximate for derived status filters.
    const jobs = shouldFilterByDerivedStatus
      ? await prisma.researchJob.findMany({ ...baseQuery, take: 1000 })
      : await prisma.researchJob.findMany({
          ...baseQuery,
          take: limit,
          skip: offset
        });

    const filteredJobs = filterJobsByDerivedStatus(jobs, statusFilter);
    const pagedJobs = shouldFilterByDerivedStatus
      ? filteredJobs.slice(offset, offset + limit)
      : filteredJobs;
    const total = shouldFilterByDerivedStatus
      ? filteredJobs.length
      : await prisma.researchJob.count({ where });

    // Map to response format
    const results = pagedJobs.map(job => ({
      id: job.id,
      status: deriveJobStatus({ status: job.status, subJobs: job.subJobs }),
      companyName: job.companyName,
      geography: job.geography,
      industry: job.industry,
      domain: job.domain || null,
      reportType: job.reportType,
      visibilityScope: job.visibilityScope,
      selectedSections: job.selectedSections,
      userAddedPrompt: job.userAddedPrompt,
      progress: job.progress,
      currentStage: job.currentStage,
      overallConfidence: job.overallConfidence,
      overallConfidenceScore: job.overallConfidenceScore,
      promptTokens: job.promptTokens,
      completionTokens: job.completionTokens,
      costUsd: job.costUsd,
      createdAt: job.createdAt,
      queuedAt: job.queuedAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      thumbnailUrl: job.thumbnailUrl || null,
      metadata: {
        companyName: job.companyName,
        geography: job.geography,
        industry: job.industry
      },
      generatedSections: job.subJobs
        .filter(subJob => subJob.status === 'completed' && subJob.stage !== 'foundation')
        .map(subJob => {
          return SECTION_NUMBER_MAP[subJob.stage] || 0;
        })
        .filter(n => n > 0)
      ,
      generatedStages: buildCompletedStages(job.subJobs, job.selectedSections),
      groups: job.jobGroups.map((entry) => entry.group)
    }));

    return res.json({
      results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error listing research:', error);
    
    return res.status(500).json({
      error: 'Failed to list research',
      message: safeErrorMessage(error)
    });
  }
}
