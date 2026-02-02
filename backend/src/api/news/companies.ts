/**
 * Tracked Companies API Routes
 * GET /api/news/companies - List all tracked companies
 * POST /api/news/companies - Create a new tracked company
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/news/companies - List all tracked companies
router.get('/', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.trackedCompany.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { callDiets: true, articles: true, people: true },
        },
      },
    });

    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// POST /api/news/companies - Create a new tracked company
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ticker } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if company already exists (case-insensitive)
    const existing = await prisma.trackedCompany.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      res.status(409).json({
        error: 'Company already exists',
        existing,
      });
      return;
    }

    const company = await prisma.trackedCompany.create({
      data: {
        name: name.trim(),
        ticker: ticker?.trim() || null,
      },
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// PUT /api/news/companies/:id - Update a tracked company
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, ticker, cik } = req.body;

    // Validate ID exists
    const existing = await prisma.trackedCompany.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Prepare update data
    const updateData: { name?: string; ticker?: string | null; cik?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name must be a non-empty string' });
        return;
      }

      // Check for duplicate name (case-insensitive), excluding current company
      const duplicate = await prisma.trackedCompany.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive',
          },
          NOT: { id },
        },
      });

      if (duplicate) {
        res.status(409).json({
          error: 'A company with this name already exists',
          existing: duplicate,
        });
        return;
      }

      updateData.name = name.trim();
    }

    if (ticker !== undefined) {
      updateData.ticker = ticker?.trim() || null;
    }

    if (cik !== undefined) {
      updateData.cik = cik?.trim() || null;
    }

    // Update company
    const company = await prisma.trackedCompany.update({
      where: { id },
      data: updateData,
    });

    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// DELETE /api/news/companies/:id - Delete a tracked company
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const company = await prisma.trackedCompany.findUnique({
      where: { id },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    await prisma.trackedCompany.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
