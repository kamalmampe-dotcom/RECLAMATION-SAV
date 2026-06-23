/**
 * Contrôleur KPI (pilotage).
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { kpiService } from '../services/kpiService.js';
import { asyncHandler } from '../lib/errors.js';

const querySchema = z.object({
  siteId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(1).max(3650).optional(),
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const { siteId, days } = querySchema.parse(req.query);
  const data = await kpiService.overview({ siteId, days });
  res.json(data);
});
