import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getAuditLogs, getEmailLogs } from '../controllers/adminController.js';

const router = Router();

// Réservé aux administrateurs.
router.use(requireAuth, requirePermission('USER_MANAGE'));

router.get('/audit-logs', getAuditLogs);
router.get('/email-logs', getEmailLogs);

export default router;
