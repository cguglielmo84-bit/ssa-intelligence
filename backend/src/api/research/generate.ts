/**
 * POST /api/research/generate
 * Create a new research job
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ResearchOrchestrator } from '../../services/orchestrator.js';

const prisma = new PrismaClient();

interface GenerateRequestBody {
  companyName: string;
  geography: string;
  focusAreas?: string[];
  industry?: string;
  requestedBy?: string;
}

// Normalize and validate user-provided text inputs to avoid empty/garbage jobs
const normalizeInput = (value: string | undefined | null) => {
  if (!value) return '';
  // Trim, collapse whitespace, strip surrounding quotes
  const collapsed = value.trim().replace(/\s+/g, ' ');
  return collapsed.replace(/^"+|"+$/g, '');
};

const toTitleLike = (value: string) => {
  if (!value) return value;
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const hasMeaningfulChars = (value: string) => /[A-Za-z0-9]/.test(value);

export async function generateResearch(req: Request, res: Response) {
  try {
    const body = req.body as GenerateRequestBody;

    // Validate required fields
    const normalizedCompany = normalizeInput(body.companyName);
    const normalizedGeo = normalizeInput(body.geography || 'Global');
    const normalizedIndustry = normalizeInput(body.industry || '');

    if (!normalizedCompany || normalizedCompany.length < 2 || !hasMeaningfulChars(normalizedCompany)) {
      return res.status(400).json({
        error: 'Missing or invalid companyName. Please provide a valid company name.'
      });
    }

    // Default geography to 'Global' if not provided
    const geography = normalizedGeo && hasMeaningfulChars(normalizedGeo) ? toTitleLike(normalizedGeo) : 'Global';
    const industry = normalizedIndustry && hasMeaningfulChars(normalizedIndustry) ? toTitleLike(normalizedIndustry) : undefined;
    const companyName = toTitleLike(normalizedCompany);

    // For demo purposes, use a default user
    // In production, get this from auth middleware
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    // Create orchestrator
    const orchestrator = new ResearchOrchestrator(prisma);

    // Create and start job
    const job = await orchestrator.createJob({
      companyName,
      geography,
      industry,
      focusAreas: body.focusAreas,
      userId
    });

    return res.status(201).json({
      jobId: job.id,
      status: 'pending',
      message: 'Research job created. Generating all 10 sections.',
      companyName: job.companyName,
      geography: job.geography
    });

  } catch (error) {
    console.error('Error creating research job:', error);
    
    return res.status(500).json({
      error: 'Failed to create research job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
