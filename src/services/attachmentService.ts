/**
 * Service des pièces jointes des réclamations (Supabase Storage + métadonnées).
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { storage } from '../lib/storage.js';
import { auditService } from './auditService.js';
import { complaintService } from './complaintService.js';
import { notFound } from '../lib/errors.js';
import type { SessionUser } from '../lib/rbac.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export const attachmentService = {
  async list(complaintId: string, actor: SessionUser) {
    await complaintService.getById(complaintId, actor); // contrôle d'accès + 404
    return prisma.attachment.findMany({
      where: { complaintId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedBy: { select: { fullName: true } },
      },
    });
  },

  async upload(
    complaintId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    actor: SessionUser,
    ip?: string | null,
  ) {
    await complaintService.getById(complaintId, actor); // contrôle d'accès + 404
    if (file.size > MAX_SIZE) throw notFound('Fichier trop volumineux (max 10 Mo)');

    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const storagePath = `${complaintId}/${randomUUID()}-${safeName}`;
    await storage.upload(storagePath, file.buffer, file.mimetype);

    const attachment = await prisma.attachment.create({
      data: {
        complaintId,
        fileName: file.originalname,
        storagePath,
        mimeType: file.mimetype || null,
        size: file.size,
        uploadedById: actor.userId,
      },
      select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true },
    });
    await auditService.record({
      action: 'ATTACHMENT_UPLOADED',
      entity: 'Complaint',
      entityId: complaintId,
      complaintId,
      userId: actor.userId,
      ip,
      details: { fileName: file.originalname },
    });
    return attachment;
  },

  async downloadUrl(attachmentId: string, actor: SessionUser) {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw notFound('Pièce jointe introuvable');
    await complaintService.getById(attachment.complaintId, actor); // contrôle d'accès
    return storage.signedUrl(attachment.storagePath);
  },
};
