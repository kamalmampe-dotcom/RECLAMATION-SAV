/**
 * Validation et typage de la configuration d'environnement (Zod).
 * Centralise tous les accès à process.env : échoue tôt si une variable
 * critique est absente ou invalide.
 */
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  COMPANY_NAME: z.string().default('CFAO Mobility Cameroon'),

  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET doit faire au moins 16 caractères'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Supabase Storage (pièces jointes)
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_STORAGE_BUCKET: z.string().default('complaint-attachments'),

  // Email (Brevo / SMTP)
  EMAIL_HOST: z.string().optional().or(z.literal('')),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  EMAIL_USER: z.string().optional().or(z.literal('')),
  EMAIL_PASS: z.string().optional().or(z.literal('')),
  EMAIL_FROM: z.string().default('sav@cfao.com'),
  // Test : si défini, TOUS les emails sont redirigés vers cette adresse (utile
  // tant qu'aucun domaine d'envoi n'est configuré). À laisser vide en production.
  TEST_NOTIFICATION_EMAIL: z.string().email().optional().or(z.literal('')),

  // Escalade / SLA (heures)
  SLA_CRITICAL_HOURS: z.coerce.number().default(4),
  SLA_HIGH_HOURS: z.coerce.number().default(24),
  SLA_MEDIUM_HOURS: z.coerce.number().default(72),
  SLA_LOW_HOURS: z.coerce.number().default(120),
  ESCALATION_CRON_MINUTES: z.coerce.number().default(15),

  // IA (optionnel)
  AI_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  GEMINI_API_KEY: z.string().optional().or(z.literal('')),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuration d\'environnement invalide :');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Variables d\'environnement manquantes ou invalides (voir .env.example)');
}

export const env = parsed.data;

/** Indique si l'envoi d'email réel est configuré (sinon mode simulation). */
export const isEmailConfigured = Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS);

/** Indique si le stockage des pièces jointes (Supabase Storage) est configuré. */
export const isStorageConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

/** Délai SLA (heures) en fonction de la priorité. */
export const slaHoursByPriority: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number> = {
  CRITICAL: env.SLA_CRITICAL_HOURS,
  HIGH: env.SLA_HIGH_HOURS,
  MEDIUM: env.SLA_MEDIUM_HOURS,
  LOW: env.SLA_LOW_HOURS,
};
