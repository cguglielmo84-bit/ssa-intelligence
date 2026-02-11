/**
 * Tracked People API Routes
 * GET /api/news/people - List all tracked people
 * POST /api/news/people - Create a new tracked person
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/news/people - List all tracked people
router.get('/', async (req: Request, res: Response) => {
  try {
    const people = await prisma.trackedPerson.findMany({
      orderBy: { name: 'asc' },
      include: {
        company: {
          select: { id: true, name: true, ticker: true },
        },
        _count: {
          select: { userCallDiets: true, articles: true },
        },
      },
    });

    res.json(people);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// POST /api/news/people - Create a new tracked person
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, title, companyId, companyAffiliation } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if person already exists (case-insensitive)
    const existing = await prisma.trackedPerson.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      res.status(409).json({
        error: 'Person already exists',
        existing,
      });
      return;
    }

    // If companyId is provided, validate it exists and get the company name
    let resolvedCompanyAffiliation = companyAffiliation?.trim() || null;
    if (companyId) {
      const company = await prisma.trackedCompany.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        res.status(400).json({ error: 'Invalid companyId' });
        return;
      }
      // Use company name as the affiliation (denormalized for display)
      resolvedCompanyAffiliation = company.name;
    }

    const person = await prisma.trackedPerson.create({
      data: {
        name: name.trim(),
        title: title?.trim() || null,
        companyId: companyId || null,
        companyAffiliation: resolvedCompanyAffiliation,
      },
      include: {
        company: {
          select: { id: true, name: true, ticker: true },
        },
      },
    });

    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PUT /api/news/people/:id - Update a tracked person
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, title, companyId, companyAffiliation } = req.body;

    // Validate ID exists
    const existing = await prisma.trackedPerson.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }

    // Prepare update data
    const updateData: { name?: string; title?: string | null; companyId?: string | null; companyAffiliation?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name must be a non-empty string' });
        return;
      }

      // Check for duplicate name (case-insensitive), excluding current person
      const duplicate = await prisma.trackedPerson.findFirst({
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
          error: 'A person with this name already exists',
          existing: duplicate,
        });
        return;
      }

      updateData.name = name.trim();
    }

    if (title !== undefined) {
      updateData.title = title?.trim() || null;
    }

    // Handle companyId - if provided, also update companyAffiliation to keep in sync
    if (companyId !== undefined) {
      if (companyId) {
        const company = await prisma.trackedCompany.findUnique({
          where: { id: companyId },
        });
        if (!company) {
          res.status(400).json({ error: 'Invalid companyId' });
          return;
        }
        updateData.companyId = companyId;
        updateData.companyAffiliation = company.name; // Keep denormalized name in sync
      } else {
        // Clear company relationship
        updateData.companyId = null;
        // Only clear companyAffiliation if it wasn't explicitly provided
        if (companyAffiliation === undefined) {
          updateData.companyAffiliation = null;
        }
      }
    }

    // Handle companyAffiliation if explicitly provided (without companyId)
    if (companyAffiliation !== undefined && companyId === undefined) {
      updateData.companyAffiliation = companyAffiliation?.trim() || null;
      // Try to find and link to a matching company
      if (companyAffiliation) {
        const matchingCompany = await prisma.trackedCompany.findFirst({
          where: {
            name: {
              equals: companyAffiliation.trim(),
              mode: 'insensitive',
            },
          },
        });
        if (matchingCompany) {
          updateData.companyId = matchingCompany.id;
        }
      } else {
        updateData.companyId = null;
      }
    }

    // Update person
    const person = await prisma.trackedPerson.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, ticker: true },
        },
      },
    });

    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// DELETE /api/news/people/:id - Delete a tracked person
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const person = await prisma.trackedPerson.findUnique({
      where: { id },
    });

    if (!person) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }

    await prisma.trackedPerson.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

export default router;
