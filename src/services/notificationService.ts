/**
 * NotificationService — service CENTRALISÉ d'envoi d'emails.
 *
 * Règle d'architecture : aucun controller n'envoie d'email
 * directement. Tout passe par ce service, qui :
 *   - résout les destinataires,
 *   - rend le template,
 *   - envoie via Nodemailer (ou simule si SMTP absent),
 *   - journalise CHAQUE envoi dans email_logs (SENT / FAILED).
 */
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../lib/env.js';
import { sendMail } from '../lib/mailer.js';
import * as tpl from '../notifications/templates.js';
import type { NotifComplaint, RenderedEmail } from '../notifications/templates.js';

const complaintInclude = {
  site: { select: { city: true, code: true } },
  category: { select: { labelFr: true } },
  createdBy: { select: { fullName: true } },
  assignedTo: { select: { fullName: true } },
} as const;

async function loadComplaint(complaintId: string): Promise<NotifComplaint | null> {
  return prisma.complaint.findUnique({ where: { id: complaintId }, include: complaintInclude });
}

async function emailsByRole(role: Role): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { role, active: true }, select: { email: true } });
  return users.map((u) => u.email);
}

/** Envoi unitaire + journalisation. Ne lève jamais : un échec email ne casse pas le métier. */
async function deliver(params: {
  template: string;
  to: string | string[];
  rendered: RenderedEmail;
  complaintId?: string | null;
}): Promise<void> {
  let recipients = (Array.isArray(params.to) ? params.to : [params.to]).filter(Boolean);
  if (recipients.length === 0) return;

  // Mode test : redirige tous les emails vers une adresse unique (aucun domaine requis).
  if (env.TEST_NOTIFICATION_EMAIL) {
    recipients = [env.TEST_NOTIFICATION_EMAIL];
  }

  const toAddress = recipients.join(', ');

  let status: 'SENT' | 'FAILED' = 'SENT';
  let error: string | null = null;
  let providerMessageId: string | null = null;

  try {
    const result = await sendMail({ to: toAddress, subject: params.rendered.subject, html: params.rendered.html });
    providerMessageId = result.simulated ? 'SIMULATED' : result.messageId;
    logger.info({ template: params.template, to: toAddress }, result.simulated ? '[SIMULATION] Email' : 'Email envoyé');
  } catch (err) {
    status = 'FAILED';
    error = err instanceof Error ? err.message : String(err);
    logger.error({ err, template: params.template, to: toAddress }, 'Échec envoi email');
  }

  // Journalisation (best-effort : ne bloque pas si la DB est indisponible).
  try {
    await prisma.emailLog.create({
      data: {
        complaintId: params.complaintId ?? null,
        template: params.template,
        toAddress,
        subject: params.rendered.subject,
        status,
        error,
        providerMessageId,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Échec journalisation email_logs');
  }
}

export const notificationService = {
  /** À la création d'un ticket : confirmation client + alerte CRM. */
  async complaintCreated(complaintId: string): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c) return;
    if (c.clientEmail) {
      await deliver({ template: 'COMPLAINT_CREATED_CLIENT', to: c.clientEmail, rendered: tpl.complaintCreatedClient(c), complaintId });
    }
    await deliver({ template: 'COMPLAINT_CREATED_STAFF', to: await emailsByRole('CRM_MANAGER'), rendered: tpl.complaintCreatedStaff(c), complaintId });
  },

  /** À l'affectation : notification du conseiller. */
  async complaintAssigned(complaintId: string, assigneeEmail: string, assigneeName: string): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c) return;
    await deliver({ template: 'COMPLAINT_ASSIGNED', to: assigneeEmail, rendered: tpl.complaintAssigned(c, assigneeName), complaintId });
  },

  /** À chaque changement de statut : conseiller affecté + créatrice. */
  async statusChanged(complaintId: string, newStatus: string, recipients: string[]): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c) return;
    await deliver({ template: 'STATUS_CHANGED', to: recipients, rendered: tpl.statusChanged(c, newStatus), complaintId });
  },

  /** À l'escalade : destinataire cible + responsable SAV. */
  async escalated(complaintId: string, reasonFr: string, targetEmail: string, targetName: string): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c) return;
    const responsables = await emailsByRole('RESPONSABLE_SAV');
    const to = Array.from(new Set([targetEmail, ...responsables].filter(Boolean)));
    await deliver({ template: 'ESCALATED', to, rendered: tpl.escalated(c, reasonFr, targetName), complaintId });
  },

  /** À la clôture : information du client. */
  async complaintClosed(complaintId: string): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c || !c.clientEmail) return;
    await deliver({ template: 'COMPLAINT_CLOSED', to: c.clientEmail, rendered: tpl.complaintClosed(c), complaintId });
  },

  /** Au déclenchement NPS : enquête de satisfaction au client. */
  async npsTriggered(complaintId: string): Promise<void> {
    const c = await loadComplaint(complaintId);
    if (!c || !c.clientEmail) return;
    await deliver({ template: 'NPS_TRIGGERED', to: c.clientEmail, rendered: tpl.npsTriggered(c), complaintId });
  },
};
