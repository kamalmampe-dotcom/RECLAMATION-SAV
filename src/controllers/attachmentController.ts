/**
 * Contrôleur des pièces jointes des réclamations.
 */
import type { Request, Response } from 'express';
import { attachmentService } from '../services/attachmentService.js';
import { asyncHandler, badRequest } from '../lib/errors.js';
import { currentUser } from '../middleware/auth.js';

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  const attachments = await attachmentService.list(req.params.id, actor);
  res.json({ attachments });
});

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  if (!req.file) throw badRequest('Aucun fichier fourni (champ "file")');
  const attachment = await attachmentService.upload(req.params.id, req.file, actor, req.ip);
  res.status(201).json({ attachment });
});

export const downloadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const actor = currentUser(req)!;
  const result = await attachmentService.getForDownload(req.params.attId, actor);
  if (result.kind === 'url') {
    res.redirect(result.url);
    return;
  }
  res.setHeader('Content-Type', result.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName)}"`);
  res.send(result.buffer);
});
