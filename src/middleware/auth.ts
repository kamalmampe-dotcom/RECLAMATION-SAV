/**
 * Middleware d'authentification & RBAC — basé EXCLUSIVEMENT sur la session serveur.
 * (L'ancien mécanisme via en-têtes `x-user-id`/`x-user-role`, falsifiable, est supprimé.)
 */
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/errors.js';
import { can, type Permission, type SessionUser } from '../lib/rbac.js';

/** Récupère l'utilisateur courant depuis la session (ou null). */
export function currentUser(req: Request): SessionUser | null {
  if (req.session?.userId && req.session.role) {
    return { userId: req.session.userId, role: req.session.role, siteId: req.session.siteId ?? null };
  }
  return null;
}

/** Exige une session authentifiée. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!currentUser(req)) {
    return next(unauthorized());
  }
  next();
}

/** Exige l'un des rôles indiqués. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = currentUser(req);
    if (!user) return next(unauthorized());
    if (!roles.includes(user.role)) return next(forbidden());
    next();
  };
}

/** Exige une permission de la matrice RBAC. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = currentUser(req);
    if (!user) return next(unauthorized());
    if (!can(user.role, permission)) return next(forbidden());
    next();
  };
}
