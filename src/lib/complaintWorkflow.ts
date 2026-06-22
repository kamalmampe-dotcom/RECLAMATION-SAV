/**
 * Machine à états des réclamations — source unique partagée backend/frontend.
 *
 * Les transitions de qualification (NEW -> QUALIFIED) et d'affectation
 * (QUALIFIED -> ASSIGNED) ne figurent PAS ici : elles passent par les endpoints
 * dédiés /qualify et /assign (qui posent catégorie, SLA, destinataire). Ce
 * tableau ne couvre que les transitions de traitement via /status.
 */
export const COMPLAINT_STATUSES = [
  'NEW',
  'QUALIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
] as const;

export type ComplaintStatusName = (typeof COMPLAINT_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<ComplaintStatusName, ComplaintStatusName[]> = {
  NEW: ['CANCELLED'],
  QUALIFIED: ['CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PENDING_PARTS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  PENDING_PARTS: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
};

/** Statuts joignables depuis un statut donné via /status. */
export function nextStatuses(status: ComplaintStatusName): ComplaintStatusName[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
