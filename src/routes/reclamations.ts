import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as reclamationController from '../controllers/reclamationController.js';
import { User } from '../models/User.js';

const router = Router();
const upload = multer({ dest: 'public/uploads/' });

router.use(requireAuth);

router.get('/', reclamationController.list);
router.post('/', requireRole('call_center'), reclamationController.create);
router.get('/stats', reclamationController.getStats);
router.get('/:id', reclamationController.getById);

router.patch('/:id/affecter', requireRole('chef_atelier'), reclamationController.affecter);
router.patch('/:id/statut', reclamationController.updateStatut);
router.patch('/:id', reclamationController.updateDetailed);

router.post('/:id/actions', reclamationController.createActionCorrective);
router.patch('/:id/actions/:actionId', reclamationController.updateActionCorrective);

router.post('/:id/notes', reclamationController.addNote);
router.post('/:id/fichiers', upload.single('fichier'), reclamationController.uploadFile);
router.get('/:id/fichiers', reclamationController.getFiles);

// User info
router.get('/config/conseillers', requireRole('chef_atelier'), async (req, res) => {
  const conseillers = await User.getByRole('conseiller_sav');
  res.json(conseillers);
});

export default router;
