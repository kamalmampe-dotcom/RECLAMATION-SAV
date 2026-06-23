/**
 * Moteur d'escalade.
 *
 * Trois déclencheurs :
 *   - SLA_BREACH   : sla_due_at dépassé (balayage périodique).
 *   - PRIORITY     : priorité élevée (escalade immédiate à la qualification).
 *   - HIERARCHICAL : remontée le long de la chaîne manager_id.
 *
 * À chaque escalade : incrémente escalation_level, crée une ligne Escalation,
 * repousse le SLA, notifie (NotificationService) et journalise (audit).
 */
import type { EscalationReason, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { slaHoursByPriority } from '../lib/env.js';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';

const MAX_LEVEL = 3;

const ELIGIBLE_STATUSES = ['NEW', 'QUALIFIED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS', 'ESCALATED'] as const;

const REASON_FR: Record<EscalationReason, string> = {
  SLA_BREACH: 'Délai SLA dépassé',
  PRIORITY: 'Priorité élevée',
  HIERARCHICAL: 'Remontée hiérarchique',
};

/** Remonte la chaîne hiérarchique de `steps` niveaux à partir d'un utilisateur. */
async function walkUpHierarchy(startUserId: string | null, steps: number) {
  let current = startUserId ? await prisma.user.findUnique({ where: { id: startUserId } }) : null;
  for (let i = 0; i < steps && current?.managerId; i++) {
    current = await prisma.user.findUnique({ where: { id: current.managerId } });
  }
  return current;
}

/** Détermine le destinataire de l'escalade pour un niveau donné. */
async function resolveTarget(complaint: { assignedToId: string | null; createdById: string }, level: number) {
  const base = complaint.assignedToId ?? complaint.createdById;
  const viaHierarchy = await walkUpHierarchy(base, level);
  if (viaHierarchy && viaHierarchy.id !== base) return viaHierarchy;

  // Repli : responsable SAV, puis direction.
  const fallback =
    (await prisma.user.findFirst({ where: { role: 'RESPONSABLE_SAV', active: true } })) ??
    (await prisma.user.findFirst({ where: { role: 'DIRECTION', active: true } }));
  return fallback;
}

function nextSlaDate(priority: Priority): Date {
  return new Date(Date.now() + slaHoursByPriority[priority] * 3600 * 1000);
}

export const escalationService = {
  /** Escalade une réclamation pour un motif donné. */
  async escalate(complaintId: string, reason: EscalationReason): Promise<void> {
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return;
    if (!ELIGIBLE_STATUSES.includes(complaint.status as (typeof ELIGIBLE_STATUSES)[number])) return;

    const nextLevel = Math.min(complaint.escalationLevel + 1, MAX_LEVEL);
    const target = await resolveTarget(complaint, nextLevel);

    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'ESCALATED',
        escalationLevel: nextLevel,
        escalatedAt: new Date(),
        slaDueAt: nextSlaDate(complaint.priority),
        escalations: {
          create: { reason, level: nextLevel, toUserId: target?.id ?? null, note: REASON_FR[reason] },
        },
        statusHistory: {
          create: { fromStatus: complaint.status, toStatus: 'ESCALATED', comment: `Escalade niveau ${nextLevel} — ${REASON_FR[reason]}` },
        },
      },
    });

    await auditService.record({
      action: 'COMPLAINT_ESCALATED',
      entity: 'Complaint',
      entityId: complaintId,
      complaintId,
      details: { reason, level: nextLevel, target: target?.email ?? null },
    });

    if (target) {
      await notificationService.escalated(complaintId, REASON_FR[reason], target.email, target.fullName);
    }
    logger.info({ complaintId, reason, level: nextLevel }, 'Réclamation escaladée');
  },

  /**
   * Escalade basée sur la priorité : alerte le responsable SAV pour les
   * réclamations HIGH/CRITICAL, sans modifier le statut ni le niveau.
   */
  async notifyPriority(complaintId: string): Promise<void> {
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint || (complaint.priority !== 'CRITICAL' && complaint.priority !== 'HIGH')) return;

    // Anti-doublon : une seule alerte PRIORITY par réclamation (la qualification
    // peut être rejouée sans générer d'alertes répétées).
    const existing = await prisma.escalation.findFirst({ where: { complaintId, reason: 'PRIORITY' } });
    if (existing) return;

    const target = await prisma.user.findFirst({ where: { role: 'RESPONSABLE_SAV', active: true } });
    await prisma.escalation.create({
      data: {
        complaintId,
        reason: 'PRIORITY',
        level: complaint.escalationLevel,
        toUserId: target?.id ?? null,
        note: REASON_FR.PRIORITY,
      },
    });
    await auditService.record({
      action: 'COMPLAINT_PRIORITY_ALERT',
      entity: 'Complaint',
      entityId: complaintId,
      complaintId,
      details: { priority: complaint.priority },
    });
    if (target) {
      await notificationService.escalated(complaintId, REASON_FR.PRIORITY, target.email, target.fullName);
    }
  },

  /**
   * Balayage périodique : escalade les réclamations dont le SLA est dépassé.
   * Renvoie le nombre de réclamations escaladées.
   */
  async runSweep(): Promise<number> {
    const breached = await prisma.complaint.findMany({
      where: {
        status: { in: [...ELIGIBLE_STATUSES] },
        slaDueAt: { not: null, lt: new Date() },
        escalationLevel: { lt: MAX_LEVEL },
      },
      select: { id: true },
      take: 200,
    });

    for (const c of breached) {
      try {
        await this.escalate(c.id, 'SLA_BREACH');
      } catch (err) {
        logger.error({ err, complaintId: c.id }, 'Échec escalade balayage');
      }
    }
    if (breached.length) logger.info({ count: breached.length }, 'Balayage escalade terminé');
    return breached.length;
  },
};
