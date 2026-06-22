/**
 * Erreurs applicatives + wrapper async pour les contrôleurs Express.
 */
import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, code?: string) => new AppError(400, msg, code);
export const unauthorized = (msg = 'Non authentifié') => new AppError(401, msg, 'UNAUTHENTICATED');
export const forbidden = (msg = 'Accès interdit') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Ressource introuvable') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string) => new AppError(409, msg, 'CONFLICT');

/** Enveloppe un handler async pour propager les erreurs vers le middleware d'erreur. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}
