/**
 * Contrôleur NPS — endpoints publics (lien envoyé au client par email).
 */
import type { Request, Response } from 'express';
import { npsService } from '../services/npsService.js';
import { npsSubmitSchema } from '../validation/schemas.js';
import { asyncHandler } from '../lib/errors.js';

export const getNps = asyncHandler(async (req: Request, res: Response) => {
  const survey = await npsService.getPublic(req.params.id);
  res.json({ survey });
});

export const submitNps = asyncHandler(async (req: Request, res: Response) => {
  const { score, comment } = npsSubmitSchema.parse(req.body);
  const result = await npsService.submit(req.params.id, score, comment);
  res.json(result);
});
