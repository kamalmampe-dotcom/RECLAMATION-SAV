/**
 * Données de référence (sites, catégories, causes racines) — lecture seule,
 * accessibles à tout utilisateur authentifié (alimentent les formulaires).
 */
import { Router } from 'express';
import { requireAuth, requirePermission, currentUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { hasGlobalVisibility } from '../lib/rbac.js';
import { aiEnabled } from '../services/aiService.js';

const router = Router();
router.use(requireAuth);

// Configuration exposée au frontend (feature flags).
router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    res.json({ aiEnabled });
  }),
);

// Conseillers affectables (pour l'affectation d'une réclamation).
router.get(
  '/assignees',
  requirePermission('COMPLAINT_ASSIGN'),
  asyncHandler(async (req, res) => {
    const user = currentUser(req)!;
    const siteFilter = hasGlobalVisibility(user.role) ? {} : { siteId: user.siteId ?? '__none__' };
    const assignees = await prisma.user.findMany({
      where: { role: 'CONSEILLER_SAV', active: true, ...siteFilter },
      select: { id: true, fullName: true, site: { select: { code: true } } },
      orderBy: { fullName: 'asc' },
    });
    res.json({ assignees });
  }),
);

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
