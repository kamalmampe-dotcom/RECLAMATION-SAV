/**
 * Service d'authentification.
 */
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import { badRequest, notFound, unauthorized } from '../lib/errors.js';

export const authService = {
  /** Vérifie les identifiants et renvoie l'utilisateur (sans le hash). */
  async login(email: string, password: string) {
    const user = await userRepository.findByEmailWithSecret(email);
    if (!user || !user.active) {
      throw unauthorized('Email ou mot de passe incorrect');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw unauthorized('Email ou mot de passe incorrect');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      siteId: user.siteId,
    };
  },

  hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  },

  /** Change le mot de passe après vérification du mot de passe actuel. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findByIdWithSecret(userId);
    if (!user) throw notFound('Utilisateur introuvable');
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw badRequest('Mot de passe actuel incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.update(userId, { passwordHash });
  },
};
