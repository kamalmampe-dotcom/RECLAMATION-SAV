/**
 * Service réclamations — logique métier du cycle de vie.
 * NB : le moteur d'escalade automatique et le NotificationService sont branchés
 * en Phases 3 & 4. Ici : création, qualification, affectation, transitions de statut,
 * avec traçabilité (status_history + audit_logs) et calcul du SLA.
 */
import type { ComplaintStatus, Prisma, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { complaintRepository } from '../repositories/complaintRepository.js';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';
import { escalationService } from './escalationService.js';
import { buildComplaintReference } from '../lib/reference.js';
import { slaHoursByPriority } from '../lib/env.js';
import { complaintVisibilityWhere, type SessionUser } from '../lib/rbac.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import type { CreateComplaintInput, QualifyComplaintInput } from '../validation/schemas.js';

function slaDueDate(priority: Priority, from = new Date()): Date {
  const hours = slaHoursByPriority[priority];
  return new Date(from.getTime() + hours * 3600 * 1000);
}

/** Transitions de statut autorisées (machine à états). */
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: ['QUALIFIED', 'CANCELLED'],
  QUALIFIED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PENDING_PARTS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  PENDING_PARTS: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
};

export const complaintService = {
  async create(input: CreateComplaintInput, actor: SessionUser, ip?: string | null) {
    const site = await prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site) throw badRequest('Site inconnu');

    const dailyCount = await complaintRepository.countTodayBySite(site.id);
    const reference = buildComplaintReference(site.code, dailyCount);

    const data: Prisma.ComplaintCreateInput = {
      reference,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail || null,
      vehicleVin: input.vehicleVin ?? null,
      vehiclePlate: input.vehiclePlate ?? null,
      vehicleModel: input.vehicleModel ?? null,
      vehicleYear: input.vehicleYear ?? null,
      mileage: input.mileage ?? null,
      description: input.description,
      priority: input.priority,
      status: 'NEW',
      site: { connect: { id: site.id } },
      createdBy: { connect: { id: actor.userId } },
      ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.orId ? { or: { connect: { id: input.orId } } } : {}),
      statusHistory: {
        create: { toStatus: 'NEW', changedById: actor.userId, comment: 'Création du ticket' },
      },
    };

    const complaint = await complaintRepository.create(data);
    await auditService.record({
      action: 'COMPLAINT_CREATED',
      entity: 'Complaint',
      entityId: complaint.id,
      complaintId: complaint.id,
      userId: actor.userId,
      ip,
      details: { reference, siteCode: site.code },
    });
    await notificationService.complaintCreated(complaint.id);
    return complaint;
  },

  async list(
    actor: SessionUser,
    filter: { status?: ComplaintStatus; priority?: Priority; siteId?: string },
    page: number,
    pageSize: number,
  ) {
    const where: Prisma.ComplaintWhereInput = {
      ...complaintVisibilityWhere(actor),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.siteId ? { siteId: filter.siteId } : {}),
    };
    const [items, total] = await Promise.all([
      complaintRepository.list(where, pageSize, (page - 1) * pageSize),
      complaintRepository.count(where),
    ]);
    return { items, total, page, pageSize };
  },

  async getById(id: string, actor: SessionUser) {
    const complaint = await complaintRepository.findById(id);
    if (!complaint) throw notFound('Réclamation introuvable');
    const scope = complaintVisibilityWhere(actor);
    if (scope.siteId && complaint.siteId !== scope.siteId) {
      throw forbidden("Cette réclamation n'appartient pas à votre site");
    }
    return complaint;
  },

  async qualify(
    id: string,
    input: QualifyComplaintInput,
    actor: SessionUser,
    ip?: string | null,
  ) {
    const complaint = await this.getById(id, actor);
    if (complaint.status !== 'NEW') {
      throw badRequest('Seule une réclamation au statut NEW peut être qualifiée');
    }
    await prisma.complaintRootCause.deleteMany({ where: { complaintId: id } });
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        categoryId: input.categoryId,
        priority: input.priority,
        status: 'QUALIFIED',
        qualifiedAt: new Date(),
        slaDueAt: slaDueDate(input.priority),
        rootCauses: { create: input.rootCauseIds.map((rootCauseId) => ({ rootCauseId })) },
        statusHistory: {
          create: { fromStatus: 'NEW', toStatus: 'QUALIFIED', changedById: actor.userId, comment: 'Qualification CRM' },
        },
      },
    });
    await auditService.record({
      action: 'COMPLAINT_QUALIFIED',
      entity: 'Complaint',
      entityId: id,
      complaintId: id,
      userId: actor.userId,
      ip,
      details: { priority: input.priority, rootCauses: input.rootCauseIds.length },
    });
    // Escalade basée sur la priorité : alerte immédiate pour HIGH/CRITICAL.
    await escalationService.notifyPriority(id);
    return updated;
  },

  async assign(id: string, assignedToId: string, actor: SessionUser, ip?: string | null) {
    const complaint = await this.getById(id, actor);
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) throw badRequest('Conseiller introuvable');

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId,
        status: complaint.status === 'QUALIFIED' ? 'ASSIGNED' : complaint.status,
        statusHistory: {
          create: { fromStatus: complaint.status, toStatus: 'ASSIGNED', changedById: actor.userId, comment: `Affecté à ${assignee.fullName}` },
        },
      },
    });
    await auditService.record({
      action: 'COMPLAINT_ASSIGNED',
      entity: 'Complaint',
      entityId: id,
      complaintId: id,
      userId: actor.userId,
      ip,
      details: { assignedToId },
    });
    await notificationService.complaintAssigned(id, assignee.email, assignee.fullName);
    return updated;
  },

  async changeStatus(id: string, status: ComplaintStatus, comment: string | undefined, actor: SessionUser, ip?: string | null) {
    const complaint = await this.getById(id, actor);
    const allowed = ALLOWED_TRANSITIONS[complaint.status];
    if (!allowed.includes(status)) {
      throw badRequest(`Transition non autorisée : ${complaint.status} → ${status}`);
    }

    const extra: Prisma.ComplaintUpdateInput = {};
    if (status === 'RESOLVED') extra.resolvedAt = new Date();
    if (status === 'CLOSED') extra.closedAt = new Date();

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        ...extra,
        statusHistory: {
          create: { fromStatus: complaint.status, toStatus: status, changedById: actor.userId, comment },
        },
      },
    });
    await auditService.record({
      action: 'COMPLAINT_STATUS_CHANGED',
      entity: 'Complaint',
      entityId: id,
      complaintId: id,
      userId: actor.userId,
      ip,
      details: { from: complaint.status, to: status },
    });

    // Notifie le conseiller affecté et la téléconseillère créatrice.
    const recipients = [complaint.assignedTo?.email, complaint.createdBy?.email].filter(
      (e): e is string => Boolean(e),
    );
    await notificationService.statusChanged(id, status, recipients);

    // Clôture : email de clôture au client + déclenchement de l'enquête NPS.
    if (status === 'CLOSED') {
      await prisma.npsSurvey.upsert({
        where: { complaintId: id },
        update: { sentAt: new Date() },
        create: { complaintId: id, sentAt: new Date() },
      });
      await notificationService.complaintClosed(id);
      await notificationService.npsTriggered(id);
      await auditService.record({ action: 'NPS_TRIGGERED', entity: 'Complaint', entityId: id, complaintId: id, userId: actor.userId, ip });
    }
    return updated;
  },
};
