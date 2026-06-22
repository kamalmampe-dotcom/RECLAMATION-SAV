/**
 * Contrôleur des réclamations.
 */
import type { Request, Response } from 'express';
import { complaintService } from '../services/complaintService.js';
import { escalationService } from '../services/escalationService.js';
import { aiService } from '../services/aiService.js';
import {
  assignComplaintSchema,
  createComplaintSchema,
  listComplaintsQuerySchema,
  qualifyComplaintSchema,
  updateStatusSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../lib/errors.js';
import { currentUser } from '../middleware/auth.js';

export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  const input = createComplaintSchema.parse(req.body);
  const actor = currentUser(req)!;
  const complaint = await complaintService.create(input, actor, req.ip);
  res.status(201).json({ complaint });
});

export const listComplaints = asyncHandler(async (req: Request, res: Response) => {
  const q = listComplaintsQuerySchema.parse(req.query);
  const actor = currentUser(req)!;
  const result = await complaintService.list(
    actor,
    { status: q.status, priority: q.priority, siteId: q.siteId },
    q.page,
    q.pageSize,
  );
  res.json(result);
});

export const getComplaint = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  const complaint = await complaintService.getById(req.params.id, actor);
  res.json({ complaint });
});

export const qualifyComplaint = asyncHandler(async (req: Request, res: Response) => {
  const input = qualifyComplaintSchema.parse(req.body);
  const actor = currentUser(req)!;
  const complaint = await complaintService.qualify(req.params.id, input, actor, req.ip);
  res.json({ complaint });
});

export const assignComplaint = asyncHandler(async (req: Request, res: Response) => {
  const { assignedToId } = assignComplaintSchema.parse(req.body);
  const actor = currentUser(req)!;
  const complaint = await complaintService.assign(req.params.id, assignedToId, actor, req.ip);
  res.json({ complaint });
});

export const updateComplaintStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, comment } = updateStatusSchema.parse(req.body);
  const actor = currentUser(req)!;
  const complaint = await complaintService.changeStatus(req.params.id, status, comment, actor, req.ip);
  res.json({ complaint });
});

/** Déclenche manuellement le balayage d'escalade SLA (supervision). */
export const runEscalationSweep = asyncHandler(async (_req: Request, res: Response) => {
  const escalated = await escalationService.runSweep();
  res.json({ escalated });
});

/** Suggestion IA de classification (catégorie, causes, priorité, résumé). */
export const aiSuggest = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  const complaint = await complaintService.getById(req.params.id, actor);
  const suggestion = await aiService.suggest(complaint.description);
  res.json({ suggestion });
});
