/**
 * Service des pièces jointes des réclamations.
 * Stockage : Supabase Storage si configuré, sinon repli en base de données
 * (colonne `data`) — l'envoi de fichiers fonctionne donc sans config supplémentaire.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { storage } from '../lib/storage.js';
import { isStorageConfigured } from '../lib/env.js';
import { auditService } from './auditService.js';
import { complaintService } from './complaintService.js';
import { badRequest, notFound } from '../lib/errors.js';
import type { SessionUser } from '../lib/rbac.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo (repli base de données)

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
    if (file.size > MAX_SIZE) throw badRequest('Fichier trop volumineux (max 5 Mo)');

    let storagePath: string | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;

    if (isStorageConfigured) {
      const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 120);
      storagePath = `${complaintId}/${randomUUID()}-${safeName}`;
      await storage.upload(storagePath, file.buffer, file.mimetype);
    } else {
      // repli : contenu stocké en base (copie dans un buffer au type attendu par Prisma)
      const bytes = new Uint8Array(file.buffer.byteLength);
      bytes.set(file.buffer);
      data = bytes;
    }

    const attachment = await prisma.attachment.create({
      data: {
        complaintId,
        fileName: file.originalname,
        storagePath,
        data,
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

  /** Renvoie soit une URL signée (Supabase), soit le contenu (base de données). */
  async getForDownload(
    attachmentId: string,
    actor: SessionUser,
  ): Promise<{ kind: 'url'; url: string } | { kind: 'data'; buffer: Buffer; fileName: string; mimeType: string }> {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw notFound('Pièce jointe introuvable');
    await complaintService.getById(attachment.complaintId, actor); // contrôle d'accès

    if (attachment.data) {
      return {
        kind: 'data',
        buffer: Buffer.from(attachment.data),
        fileName: attachment.fileName,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
      };
    }
    if (attachment.storagePath) {
      return { kind: 'url', url: await storage.signedUrl(attachment.storagePath) };
    }
    throw notFound('Contenu du fichier indisponible');
  },
};
