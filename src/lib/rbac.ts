/**
 * RBAC — contrôle d'accès basé sur les rôles ET le site.
 * Source unique de vérité des permissions du système.
 */
import type { Role } from '@prisma/client';

/** Rôles ayant une visibilité globale (toutes les concessions). */
export const GLOBAL_VISIBILITY_ROLES: Role[] = [
  'ADMIN',
  'DIRECTION',
  'RESPONSABLE_SAV',
  'CRM_MANAGER',
  'TELECONSEILLERE', // point d'entrée unique : visibilité réseau (cahier des charges)
];

/** Rôles restreints à la visibilité de leur propre site. */
export const SITE_SCOPED_ROLES: Role[] = ['CHEF_ATELIER', 'CONSEILLER_SAV'];

export interface SessionUser {
  userId: string;
  role: Role;
  siteId: string | null;
}

/** Indique si le rôle voit l'ensemble du réseau. */
export function hasGlobalVisibility(role: Role): boolean {
  return GLOBAL_VISIBILITY_ROLES.includes(role);
}

/**
 * Filtre de visibilité des réclamations pour un utilisateur donné.
 * Renvoie une clause Prisma `where` partielle (vide = accès global).
 */
export function complaintVisibilityWhere(user: SessionUser): { siteId?: string } {
  if (hasGlobalVisibility(user.role)) return {};
  // Rôles site-scoped : limités à leur site de rattachement.
  // (siteId null bloque tout accès — sécurité par défaut.)
  return { siteId: user.siteId ?? '__none__' };
}

/** Vérifie qu'un utilisateur peut accéder à une réclamation d'un site donné. */
export function canAccessSite(user: SessionUser, siteId: string): boolean {
  if (hasGlobalVisibility(user.role)) return true;
  return user.siteId === siteId;
}

// --- Matrice d'actions (qui peut faire quoi) --------------------------------

export const PERMISSIONS = {
  // Réclamations
  COMPLAINT_CREATE: ['TELECONSEILLERE', 'ADMIN'] as Role[],
  COMPLAINT_QUALIFY: ['CRM_MANAGER', 'ADMIN'] as Role[],
  COMPLAINT_ASSIGN: ['CHEF_ATELIER', 'RESPONSABLE_SAV', 'ADMIN'] as Role[],
  COMPLAINT_TREAT: ['CONSEILLER_SAV', 'CHEF_ATELIER', 'RESPONSABLE_SAV', 'ADMIN'] as Role[],
  COMPLAINT_CLOSE: ['CRM_MANAGER', 'RESPONSABLE_SAV', 'ADMIN'] as Role[],
  COMPLAINT_VIEW: [
    'ADMIN',
    'DIRECTION',
    'RESPONSABLE_SAV',
    'CRM_MANAGER',
    'TELECONSEILLERE',
    'CHEF_ATELIER',
    'CONSEILLER_SAV',
  ] as Role[],

  // Administration
  USER_MANAGE: ['ADMIN'] as Role[],
  SITE_MANAGE: ['ADMIN'] as Role[],
  TAXONOMY_MANAGE: ['ADMIN'] as Role[],

  // Pilotage
  KPI_VIEW: ['ADMIN', 'DIRECTION', 'RESPONSABLE_SAV'] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/** Indique si un rôle dispose d'une permission. */
export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as Role[]).includes(role);
}
