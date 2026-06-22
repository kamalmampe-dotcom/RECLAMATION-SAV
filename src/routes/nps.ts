/**
 * Enquête NPS — routes PUBLIQUES (aucune authentification : lien client).
 */
import { Router } from 'express';
import { getNps, submitNps } from '../controllers/npsController.js';

const router = Router();

router.get('/:id', getNps);
router.post('/:id', submitNps);

export default router;
