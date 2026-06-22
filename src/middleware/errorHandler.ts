/**
 * Gestion centralisée des erreurs Express.
 * - ZodError       -> 400 + détail des champs
 * - AppError       -> status défini
 * - Prisma P2002   -> 409 (contrainte d'unicité)
 * - autre          -> 500 (loggé)
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Endpoint introuvable' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation échouée', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: 'Conflit : valeur déjà existante' });
    return;
  }
  logger.error({ err }, 'Erreur non gérée');
  res.status(500).json({ error: 'Erreur serveur' });
}
