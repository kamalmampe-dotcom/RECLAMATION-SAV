/**
 * Service de gestion des utilisateurs (administration).
 */
import type { Role } from '@prisma/client';
import { userRepository } from '../repositories/userRepository.js';
import { authService } from './authService.js';
import { auditService } from './auditService.js';
import { conflict, notFound } from '../lib/errors.js';
import type { CreateUserInput, UpdateUserInput } from '../validation/schemas.js';

export const userService = {
  list(filter: { siteId?: string; role?: Role; active?: boolean } = {}) {
    return userRepository.list(filter);
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw notFound('Utilisateur introuvable');
    return user;
  },

  async create(input: CreateUserInput, actorId: string, ip?: string | null) {
    if (await userRepository.countByEmail(input.email)) {
      throw conflict('Un utilisateur avec cet email existe déjà');
    }
    const passwordHash = await authService.hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      siteId: input.siteId ?? null,
      managerId: input.managerId ?? null,
    });
    await auditService.record({
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      userId: actorId,
      ip,
      details: { email: user.email, role: user.role },
    });
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorId: string, ip?: string | null) {
    await this.getById(id); // 404 si absent
    const { password, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await authService.hashPassword(password);

    const user = await userRepository.update(id, data);
    await auditService.record({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      userId: actorId,
      ip,
      details: { fields: Object.keys(input) },
    });
    return user;
  },

  async setActive(id: string, active: boolean, actorId: string, ip?: string | null) {
    await this.getById(id);
    const user = await userRepository.update(id, { active });
    await auditService.record({
      action: active ? 'USER_ENABLED' : 'USER_DISABLED',
      entity: 'User',
      entityId: id,
      userId: actorId,
      ip,
    });
    return user;
  },
};
