/**
 * Données de référence (sites, catégories, causes racines) — lecture seule,
 * accessibles à tout utilisateur authentifié (alimentent les formulaires).
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/sites',
  asyncHandler(async (_req, res) => {
    const sites = await prisma.site.findMany({ where: { active: true }, orderBy: { city: 'asc' } });
    res.json({ sites });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ categories });
  }),
);

router.get(
  '/root-causes',
  asyncHandler(async (_req, res) => {
    const rootCauses = await prisma.rootCause.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ rootCauses });
  }),
);

export default router;
