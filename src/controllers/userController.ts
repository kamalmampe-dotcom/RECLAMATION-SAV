/**
 * Contrôleur de gestion des utilisateurs (réservé ADMIN).
 */
import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { userService } from '../services/userService.js';
import { createUserSchema, updateUserSchema } from '../validation/schemas.js';
import { asyncHandler } from '../lib/errors.js';
import { currentUser } from '../middleware/auth.js';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { siteId, role, active } = req.query;
  const users = await userService.list({
    siteId: typeof siteId === 'string' ? siteId : undefined,
    role: typeof role === 'string' ? (role as Role) : undefined,
    active: active === undefined ? undefined : active === 'true',
  });
  res.json({ users });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.params.id);
  res.json({ user });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const input = createUserSchema.parse(req.body);
  const actor = currentUser(req)!;
  const user = await userService.create(input, actor.userId, req.ip);
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const input = updateUserSchema.parse(req.body);
  const actor = currentUser(req)!;
  const user = await userService.update(req.params.id, input, actor.userId, req.ip);
  res.json({ user });
});

export const setUserActive = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  const active = Boolean(req.body?.active);
  const user = await userService.setActive(req.params.id, active, actor.userId, req.ip);
  res.json({ user });
});
