/**
 * Suivi de présence : met à jour `lastSeenAt` de l'utilisateur connecté.
 * Écriture limitée (au plus une fois par minute et par utilisateur) et
 * non bloquante — n'impacte pas le temps de réponse.
 */
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { currentUser } from './auth.js';

const lastWrite = new Map<string, number>();
const THROTTLE_MS = 60_000;

export function trackPresence(req: Request, _res: Response, next: NextFunction): void {
  const user = currentUser(req);
  if (user) {
    const now = Date.now();
    if (now - (lastWrite.get(user.userId) ?? 0) > THROTTLE_MS) {
      lastWrite.set(user.userId, now);
      prisma.user
        .update({ where: { id: user.userId }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
    }
  }
  next();
}
