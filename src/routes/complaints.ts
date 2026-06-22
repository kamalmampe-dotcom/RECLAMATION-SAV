import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  assignComplaint,
  createComplaint,
  getComplaint,
  listComplaints,
  qualifyComplaint,
  updateComplaintStatus,
} from '../controllers/complaintController.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('COMPLAINT_VIEW'), listComplaints);
router.post('/', requirePermission('COMPLAINT_CREATE'), createComplaint);
router.get('/:id', requirePermission('COMPLAINT_VIEW'), getComplaint);

router.patch('/:id/qualify', requirePermission('COMPLAINT_QUALIFY'), qualifyComplaint);
router.patch('/:id/assign', requirePermission('COMPLAINT_ASSIGN'), assignComplaint);
router.patch('/:id/status', requirePermission('COMPLAINT_TREAT'), updateComplaintStatus);

export default router;
