import type { ComplaintStatus, Priority, Role } from './types.ts';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  TELECONSEILLERE: 'Téléconseillère',
  CRM_MANAGER: 'CRM Manager',
  CONSEILLER_SAV: 'Conseiller SAV',
  CHEF_ATELIER: "Chef d'atelier",
  RESPONSABLE_SAV: 'Responsable SAV',
  DIRECTION: 'Direction',
};

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: 'Nouvelle',
  QUALIFIED: 'Qualifiée',
  ASSIGNED: 'Affectée',
  IN_PROGRESS: 'En cours',
  PENDING_PARTS: 'Attente pièces',
  ESCALATED: 'Escaladée',
  RESOLVED: 'Résolue',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  PENDING_PARTS: 'bg-orange-100 text-orange-700',
  ESCALATED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
