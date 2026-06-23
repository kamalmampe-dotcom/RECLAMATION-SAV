import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  setUserActive,
  updateUser,
} from '../controllers/userController.js';

const router = Router();

// Toute la gestion des utilisateurs est réservée au rôle ADMIN (permission USER_MANAGE).
router.use(requireAuth, requirePermission('USER_MANAGE'));

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.patch('/:id/active', setUserActive);
router.delete('/:id', deleteUser);

export default router;
