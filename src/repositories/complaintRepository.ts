/**
 * Repository réclamations — accès données Prisma.
 */
import type { ComplaintStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const listSelect = {
  id: true,
  reference: true,
  clientName: true,
  clientPhone: true,
  vehiclePlate: true,
  vehicleModel: true,
  priority: true,
  status: true,
  escalationLevel: true,
  slaDueAt: true,
  createdAt: true,
  category: { select: { code: true, labelFr: true } },
  site: { select: { code: true, city: true } },
  assignedTo: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ComplaintSelect;

export const complaintRepository = {
  create(data: Prisma.ComplaintCreateInput) {
    return prisma.complaint.create({ data });
  },

  findById(id: string) {
    return prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        site: true,
        or: true,
        createdBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
        rootCauses: { include: { rootCause: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { fullName: true, role: true } } } },
        escalations: { orderBy: { createdAt: 'desc' } },
        correctiveActions: { orderBy: { createdAt: 'desc' } },
        nps: true,
      },
    });
  },

  list(where: Prisma.ComplaintWhereInput, take = 100, skip = 0) {
    return prisma.complaint.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  },

  count(where: Prisma.ComplaintWhereInput) {
    return prisma.complaint.count({ where });
  },

  update(id: string, data: Prisma.ComplaintUpdateInput) {
    return prisma.complaint.update({ where: { id }, data });
  },

  /** Compte les réclamations d'un site créées aujourd'hui (pour la référence). */
  countTodayBySite(siteId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return prisma.complaint.count({ where: { siteId, createdAt: { gte: start } } });
  },

  setStatus(id: string, status: ComplaintStatus, extra: Prisma.ComplaintUpdateInput = {}) {
    return prisma.complaint.update({ where: { id }, data: { status, ...extra } });
  },
};
