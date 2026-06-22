/**
 * Schémas de validation Zod — validation backend stricte de toutes les entrées.
 */
import { z } from 'zod';

export const RoleEnum = z.enum([
  'ADMIN',
  'TELECONSEILLERE',
  'CRM_MANAGER',
  'CONSEILLER_SAV',
  'CHEF_ATELIER',
  'RESPONSABLE_SAV',
  'DIRECTION',
]);

export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ComplaintStatusEnum = z.enum([
  'NEW',
  'QUALIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]);

// --- Auth -------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
});

// --- Utilisateurs (administration) ------------------------------------------
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
  fullName: z.string().min(2),
  role: RoleEnum,
  phone: z.string().trim().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: RoleEnum.optional(),
  phone: z.string().trim().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// --- Réclamations -----------------------------------------------------------
export const createComplaintSchema = z.object({
  clientName: z.string().min(2, 'Nom du client requis'),
  clientPhone: z.string().min(6, 'Téléphone requis'),
  clientEmail: z.string().email().optional().or(z.literal('')).nullable(),
  vehicleVin: z.string().trim().optional().nullable(),
  vehiclePlate: z.string().trim().optional().nullable(),
  vehicleModel: z.string().trim().optional().nullable(),
  vehicleYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  mileage: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().min(5, 'Description requise'),
  priority: PriorityEnum.default('MEDIUM'),
  siteId: z.string().uuid('Site requis'),
  categoryId: z.string().uuid().optional().nullable(),
  orId: z.string().uuid().optional().nullable(),
});

export const qualifyComplaintSchema = z.object({
  categoryId: z.string().uuid(),
  priority: PriorityEnum,
  rootCauseIds: z.array(z.string().uuid()).default([]),
});

export const updateStatusSchema = z.object({
  status: ComplaintStatusEnum,
  comment: z.string().trim().optional(),
});

export const assignComplaintSchema = z.object({
  assignedToId: z.string().uuid(),
});

export const listComplaintsQuerySchema = z.object({
  status: ComplaintStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  siteId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  mine: z.literal('true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// --- Notes internes ---------------------------------------------------------
export const addNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note vide').max(2000),
  visibility: z.enum(['ALL', 'INTERNAL', 'MANAGEMENT']).default('ALL'),
});

// --- Actions correctives ----------------------------------------------------
export const correctiveActionSchema = z.object({
  description: z.string().trim().min(3, 'Description requise').max(1000),
  responsible: z.string().trim().min(2, 'Responsable requis').max(120),
  dueDate: z.string().datetime().optional().nullable(),
});

export const correctiveActionStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
});

// --- Ordre de réparation (OR) -----------------------------------------------
export const linkRepairOrderSchema = z.object({
  orNumber: z.string().trim().min(2, "Numéro d'OR requis").max(60),
  workshop: z.string().trim().max(120).optional().nullable(),
});

// --- Fusion de doublons -----------------------------------------------------
export const mergeComplaintSchema = z.object({
  intoId: z.string().uuid(),
});

// --- NPS (enquête publique) -------------------------------------------------
export const npsSubmitSchema = z.object({
  score: z.coerce.number().int().min(0).max(10),
  comment: z.string().trim().max(2000).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type QualifyComplaintInput = z.infer<typeof qualifyComplaintSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;
export type LinkRepairOrderInput = z.infer<typeof linkRepairOrderSchema>;
