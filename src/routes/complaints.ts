import { Router } from 'express';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import {
  addCorrectiveAction,
  addNote,
  aiSuggest,
  assignComplaint,
  createComplaint,
  getComplaint,
  getComplaintStats,
  getDuplicates,
  linkRepairOrder,
  listComplaints,
  mergeComplaint,
  qualifyComplaint,
  runEscalationSweep,
  updateComplaintStatus,
  updateCorrectiveAction,
} from '../controllers/complaintController.js';
import {
  downloadAttachment,
  listAttachments,
  uploadAttachment,
} from '../controllers/attachmentController.js';

const router = Router();

router.use(requireAuth);

// Supervision : déclenchement manuel du balayage d'escalade (avant les routes /:id).
router.post('/ops/escalation-sweep', requirePermission('KPI_VIEW'), runEscalationSweep);

// Téléchargement d'une pièce jointe (route à plat, avant /:id).
router.get('/attachments/:attId/download', requirePermission('COMPLAINT_VIEW'), downloadAttachment);

router.get('/stats', requirePermission('COMPLAINT_VIEW'), getComplaintStats);

router.get('/', requirePermission('COMPLAINT_VIEW'), listComplaints);
router.post('/', requirePermission('COMPLAINT_CREATE'), createComplaint);
router.get('/:id', requirePermission('COMPLAINT_VIEW'), getComplaint);

router.post('/:id/ai-suggest', requirePermission('COMPLAINT_QUALIFY'), aiSuggest);
router.patch('/:id/qualify', requirePermission('COMPLAINT_QUALIFY'), qualifyComplaint);
router.patch('/:id/assign', requirePermission('COMPLAINT_ASSIGN'), assignComplaint);
router.patch('/:id/status', requireAnyPermission('COMPLAINT_TREAT', 'COMPLAINT_CLOSE'), updateComplaintStatus);

// Notes internes (tout intervenant autorisé à consulter peut annoter).
router.post('/:id/notes', requirePermission('COMPLAINT_VIEW'), addNote);

// Actions correctives.
router.post('/:id/corrective-actions', requirePermission('COMPLAINT_TREAT'), addCorrectiveAction);
router.patch('/:id/corrective-actions/:actionId', requirePermission('COMPLAINT_TREAT'), updateCorrectiveAction);

// Ordre de réparation (OR).
router.post('/:id/repair-order', requirePermission('COMPLAINT_TREAT'), linkRepairOrder);

// Doublons & fusion.
router.get('/:id/duplicates', requirePermission('COMPLAINT_VIEW'), getDuplicates);
router.post('/:id/merge', requirePermission('COMPLAINT_QUALIFY'), mergeComplaint);

// Pièces jointes d'une réclamation.
router.get('/:id/attachments', requirePermission('COMPLAINT_VIEW'), listAttachments);
router.post('/:id/attachments', requirePermission('COMPLAINT_TREAT'), uploadSingle, uploadAttachment);

export default router;
