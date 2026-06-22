/**
 * Repository utilisateurs — accès données Prisma.
 */
import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const safeSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  active: true,
  siteId: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  site: { select: { id: true, code: true, name: true, city: true } },
} satisfies Prisma.UserSelect;

export const userRepository = {
  /** Inclut le hash du mot de passe — réservé à l'authentification. */
  findByEmailWithSecret(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: safeSelect });
  },

  /** Inclut le hash du mot de passe — réservé au changement de mot de passe. */
  findByIdWithSecret(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  list(filter: { siteId?: string; role?: Role; active?: boolean } = {}) {
    return prisma.user.findMany({
      where: {
        siteId: filter.siteId,
        role: filter.role,
        active: filter.active,
      },
      select: safeSelect,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  },

  create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: Role;
    phone?: string | null;
    siteId?: string | null;
    managerId?: string | null;
  }) {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: safeSelect,
    });
  },

  update(
    id: string,
    data: Partial<{
      fullName: string;
      role: Role;
      phone: string | null;
      siteId: string | null;
      managerId: string | null;
      active: boolean;
      passwordHash: string;
    }>,
  ) {
    return prisma.user.update({ where: { id }, data, select: safeSelect });
  },

  countByEmail(email: string) {
    return prisma.user.count({ where: { email: email.toLowerCase() } });
  },
};
