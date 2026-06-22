/**
 * Contrôleur d'authentification.
 */
import type { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { auditService } from '../services/auditService.js';
import { userRepository } from '../repositories/userRepository.js';
import { changePasswordSchema, loginSchema } from '../validation/schemas.js';
import { asyncHandler, unauthorized } from '../lib/errors.js';
import { currentUser } from '../middleware/auth.js';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await authService.login(email, password);

  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.fullName = user.fullName;
  req.session.siteId = user.siteId;

  await auditService.record({
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    userId: user.id,
    ip: req.ip,
  });

  res.json({ success: true, user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user) {
    await auditService.record({ action: 'LOGOUT', entity: 'User', entityId: user.userId, userId: user.userId, ip: req.ip });
  }
  req.session.destroy(() => res.json({ success: true }));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const session = currentUser(req);
  if (!session) throw unauthorized();
  const user = await userRepository.findById(session.userId);
  res.json({ user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const session = currentUser(req);
  if (!session) throw unauthorized();
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(session.userId, currentPassword, newPassword);
  await auditService.record({
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: session.userId,
    userId: session.userId,
    ip: req.ip,
  });
  res.json({ success: true });
});
