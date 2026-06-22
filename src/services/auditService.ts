/**
 * Service d'audit — écriture du journal immuable (append-only).
 * Toute mutation métier sensible doit être tracée ici.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditEntry {
  action: string; // ex: COMPLAINT_CREATED, STATUS_CHANGED, USER_UPDATED
  entity: string; // ex: Complaint, User, Site
  entityId?: string | null;
  userId?: string | null;
  complaintId?: string | null;
  details?: Prisma.InputJsonValue;
  ip?: string | null;
}

export const auditService = {
  async record(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          userId: entry.userId ?? null,
          complaintId: entry.complaintId ?? null,
          details: entry.details ?? undefined,
          ip: entry.ip ?? null,
        },
      });
    } catch (err) {
      // Ne jamais bloquer le flux métier sur un échec d'audit, mais le signaler.
      logger.error({ err, entry }, 'Échec écriture audit log');
    }
  },
};
