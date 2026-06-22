/**
 * Service réclamations — logique métier du cycle de vie : création,
 * qualification, affectation, transitions de statut, avec traçabilité
 * (status_history + audit_logs) et calcul du SLA.
 */
import type { ComplaintStatus, Prisma, Priority, Role } from '@prisma/client';
import { Prisma as PrismaNS } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { complaintRepository } from '../repositories/complaintRepository.js';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';
import { escalationService } from './escalationService.js';
import { buildComplaintReference } from '../lib/reference.js';
import { slaHoursByPriority } from '../lib/env.js';
import { ALLOWED_TRANSITIONS } from '../lib/complaintWorkflow.js';
import { can, complaintVisibilityWhere, type SessionUser } from '../lib/rbac.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import type { CreateComplaintInput, QualifyComplaintInput } from '../validation/schemas.js';

function slaDueDate(priority: Priority, from = new Date()): Date {
  const hours = slaHoursByPriority[priority];
  return new Date(from.getTime() + hours * 3600 * 1000);
}

/** Rôles autorisés à recevoir l'affectation d'une réclamation. */
const ASSIGNABLE_ROLES: Role[] = ['CONSEILLER_SAV'];

export const complaintService = {
  async create(input: CreateComplaintInput, actor: SessionUser, ip?: string | null) {
    const site = await prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site) throw badRequest('Site inconnu');

    const buildData = (reference: string): Prisma.ComplaintCreateInput => ({
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
      // Le SLA court dès la création : un ticket laissé au statut NEW reste
      // éligible au balayage d'escalade (et n'échappe plus au suivi).
      slaDueAt: slaDueDate(input.priority),
      site: { connect: { id: site.id } },
      createdBy: { connect: { id: actor.userId } },
      ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.orId ? { or: { connect: { id: input.orId } } } : {}),
      statusHistory: {
        create: { toStatus: 'NEW', changedById: actor.userId, comment: 'Création du ticket' },
      },
    });

    // La référence lisible est dérivée d'un compteur journalier : en cas de
    // collision (créations concurrentes), on réessaie avec le compteur suivant.
    let complaint;
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const dailyCount = await complaintRepository.countTodayBySite(site.id);
      const reference = buildComplaintReference(site.code, dailyCount + attempt);
      try {
        complaint = await complaintRepository.create(buildData(reference));
        break;
      } catch (err) {
        if (err instanceof PrismaNS.PrismaClientKnownRequestError && err.code === 'P2002') {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    if (!complaint) throw (lastError ?? badRequest('Échec de génération de la référence'));

    await auditService.record({
      action: 'COMPLAINT_CREATED',
      entity: 'Complaint',
      entityId: complaint.id,
      complaintId: complaint.id,
      userId: actor.userId,
      ip,
      details: { reference: complaint.reference, siteCode: site.code },
    });
    await notificationService.complaintCreated(complaint.id);
    return complaint;
  },

  async list(
    actor: SessionUser,
    filter: { status?: ComplaintStatus; priority?: Priority; siteId?: string; q?: string },
    page: number,
    pageSize: number,
  ) {
    const q = filter.q?.trim();
    const where: Prisma.ComplaintWhereInput = {
      ...complaintVisibilityWhere(actor),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.siteId ? { siteId: filter.siteId } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: 'insensitive' } },
              { clientName: { contains: q, mode: 'insensitive' } },
              { clientPhone: { contains: q, mode: 'insensitive' } },
              { vehiclePlate: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
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
    if (!assignee || !assignee.active) throw badRequest('Conseiller introuvable');
    if (!ASSIGNABLE_ROLES.includes(assignee.role)) {
      throw badRequest('Seul un conseiller SAV peut être affecté à une réclamation');
    }
    if (assignee.siteId !== complaint.siteId) {
      throw badRequest('Le conseiller doit appartenir au site de la réclamation');
    }

    // Première affectation (QUALIFIED -> ASSIGNED) : transition de statut tracée.
    // Réaffectation ultérieure : pas de fausse transition de statut, simple
    // mise à jour de l'assigné (l'historique resterait sinon trompeur).
    const isFirstAssignment = complaint.status === 'QUALIFIED';
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId,
        ...(isFirstAssignment
          ? {
              status: 'ASSIGNED',
              statusHistory: {
                create: { fromStatus: complaint.status, toStatus: 'ASSIGNED', changedById: actor.userId, comment: `Affecté à ${assignee.fullName}` },
              },
            }
          : {}),
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

    // La clôture est une action métier distincte du traitement : elle exige la
    // permission COMPLAINT_CLOSE (CRM Manager, Responsable SAV, Admin). Les
    // autres transitions relèvent du traitement (COMPLAINT_TREAT).
    if (status === 'CLOSED') {
      if (!can(actor.role, 'COMPLAINT_CLOSE')) {
        throw forbidden("Votre rôle n'est pas autorisé à clôturer une réclamation");
      }
    } else if (!can(actor.role, 'COMPLAINT_TREAT')) {
      throw forbidden("Votre rôle n'est pas autorisé à traiter une réclamation");
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
