import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getOverview } from '../controllers/kpiController.js';

const router = Router();

// Réservé aux rôles de pilotage (ADMIN, DIRECTION, RESPONSABLE_SAV).
router.use(requireAuth, requirePermission('KPI_VIEW'));
router.get('/overview', getOverview);

export default router;
