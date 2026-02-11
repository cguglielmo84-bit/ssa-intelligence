/**
 * User Call Diet API Routes
 * CRUD for managing a user's tracked companies, people, and tags
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/news/users/:userId/call-diet - Get user's full call diet
router.get('/:userId/call-diet', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Auth check: self or admin
    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        callDietCompanies: { include: { company: true } },
        callDietPeople: { include: { person: true } },
        callDietTags: { include: { tag: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      companies: user.callDietCompanies.map(c => c.company),
      people: user.callDietPeople.map(p => p.person),
      tags: user.callDietTags.map(t => t.tag),
    });
  } catch (error) {
    console.error('Error fetching user call diet:', error);
    res.status(500).json({ error: 'Failed to fetch call diet' });
  }
});

// ============================================================================
// Companies
// ============================================================================

// POST /api/news/users/:userId/call-diet/companies
router.post('/:userId/call-diet/companies', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { companyId, name, ticker, cik } = req.body;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let targetCompanyId = companyId;

    if (!companyId && name) {
      let company = await prisma.trackedCompany.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' } },
      });

      if (!company) {
        company = await prisma.trackedCompany.create({
          data: {
            name: name.trim(),
            ticker: ticker?.trim() || null,
            cik: cik?.trim() || null,
          },
        });
      } else if (cik && !company.cik) {
        company = await prisma.trackedCompany.update({
          where: { id: company.id },
          data: { cik: cik.trim() },
        });
      }

      targetCompanyId = company.id;
    }

    if (!targetCompanyId) {
      res.status(400).json({ error: 'Either companyId or name is required' });
      return;
    }

    await prisma.userCallDietCompany.upsert({
      where: {
        userId_companyId: { userId, companyId: targetCompanyId },
      },
      create: { userId, companyId: targetCompanyId },
      update: {},
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding company to user call diet:', error);
    res.status(500).json({ error: 'Failed to add company' });
  }
});

// DELETE /api/news/users/:userId/call-diet/companies/:companyId
router.delete('/:userId/call-diet/companies/:companyId', async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = req.params;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.userCallDietCompany.delete({
      where: { userId_companyId: { userId, companyId } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing company from user call diet:', error);
    res.status(500).json({ error: 'Failed to remove company' });
  }
});

// POST /api/news/users/:userId/call-diet/companies/bulk-delete
router.post('/:userId/call-diet/companies/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { companyIds } = req.body;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      res.status(400).json({ error: 'companyIds must be a non-empty array' });
      return;
    }

    const result = await prisma.userCallDietCompany.deleteMany({
      where: { userId, companyId: { in: companyIds } },
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error bulk removing companies from user call diet:', error);
    res.status(500).json({ error: 'Failed to remove companies' });
  }
});

// ============================================================================
// People
// ============================================================================

// POST /api/news/users/:userId/call-diet/people
router.post('/:userId/call-diet/people', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { personId, name, companyAffiliation } = req.body;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let targetPersonId = personId;

    if (!personId && name) {
      let person = await prisma.trackedPerson.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' } },
      });

      if (!person) {
        person = await prisma.trackedPerson.create({
          data: { name: name.trim(), companyAffiliation: companyAffiliation?.trim() || null },
        });
      }

      targetPersonId = person.id;
    }

    if (!targetPersonId) {
      res.status(400).json({ error: 'Either personId or name is required' });
      return;
    }

    await prisma.userCallDietPerson.upsert({
      where: { userId_personId: { userId, personId: targetPersonId } },
      create: { userId, personId: targetPersonId },
      update: {},
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding person to user call diet:', error);
    res.status(500).json({ error: 'Failed to add person' });
  }
});

// DELETE /api/news/users/:userId/call-diet/people/:personId
router.delete('/:userId/call-diet/people/:personId', async (req: Request, res: Response) => {
  try {
    const { userId, personId } = req.params;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.userCallDietPerson.delete({
      where: { userId_personId: { userId, personId } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing person from user call diet:', error);
    res.status(500).json({ error: 'Failed to remove person' });
  }
});

// POST /api/news/users/:userId/call-diet/people/bulk-delete
router.post('/:userId/call-diet/people/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { personIds } = req.body;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!Array.isArray(personIds) || personIds.length === 0) {
      res.status(400).json({ error: 'personIds must be a non-empty array' });
      return;
    }

    const result = await prisma.userCallDietPerson.deleteMany({
      where: { userId, personId: { in: personIds } },
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error bulk removing people from user call diet:', error);
    res.status(500).json({ error: 'Failed to remove people' });
  }
});

// ============================================================================
// Tags
// ============================================================================

// POST /api/news/users/:userId/call-diet/tags
router.post('/:userId/call-diet/tags', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { tagId } = req.body;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!tagId) {
      res.status(400).json({ error: 'tagId is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tag = await prisma.newsTag.findUnique({ where: { id: tagId } });
    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    await prisma.userCallDietTag.upsert({
      where: { userId_tagId: { userId, tagId } },
      create: { userId, tagId },
      update: {},
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding tag to user call diet:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// DELETE /api/news/users/:userId/call-diet/tags/:tagId
router.delete('/:userId/call-diet/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const { userId, tagId } = req.params;

    if (!req.auth?.isAdmin && req.auth?.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.userCallDietTag.delete({
      where: { userId_tagId: { userId, tagId } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from user call diet:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

export default router;
