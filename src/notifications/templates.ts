/**
 * Templates email - un builder par événement métier.
 * Chaque builder renvoie { subject, html }. La mise en page est factorisée.
 */
import { env } from '../lib/env.js';

export interface NotifComplaint {
  id: string;
  reference: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone: string;
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  vehicleVin?: string | null;
  priority: string;
  status: string;
  description?: string | null;
  site?: { city: string; code: string } | null;
  category?: { labelFr: string } | null;
  createdBy?: { fullName: string } | null;
  assignedTo?: { fullName: string } | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

const PRIORITY_FR: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

function layout(title: string, accent: string, inner: string): string {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 620px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
    <div style="background: ${accent}; color: #fff; padding: 16px 22px;">
      <div style="font-size: 12px; letter-spacing: 1px; opacity: .85;">${env.COMPANY_NAME} - Service Après-Vente</div>
      <h2 style="margin: 4px 0 0; font-size: 19px;">${title}</h2>
    </div>
    <div style="padding: 22px;">${inner}</div>
    <div style="padding: 14px 22px; background: #f9fafb; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      Message automatique - ne pas répondre directement. CFAO Mobility Cameroon.
    </div>
  </div>`;
}

function infoTable(complaint: NotifComplaint): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 10px;font-weight:bold;width:150px;background:#f9fafb;">${k}</td><td style="padding:6px 10px;">${v || '-'}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;border:1px solid #e5e7eb;">
    ${row('Référence', complaint.reference)}
    ${row('Site', complaint.site ? `${complaint.site.city} (${complaint.site.code})` : '-')}
    ${row('Client', `${complaint.clientName} - ${complaint.clientPhone}`)}
    ${row('Véhicule', `${complaint.vehicleModel || ''} ${complaint.vehiclePlate ? '· ' + complaint.vehiclePlate : ''}`)}
    ${row('Catégorie', complaint.category?.labelFr || 'À qualifier')}
    ${row('Priorité', PRIORITY_FR[complaint.priority] || complaint.priority)}
  </table>`;
}

function button(href: string, label: string, color: string): string {
  return `<div style="margin-top:18px;"><a href="${href}" style="background:${color};color:#fff;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:6px;font-size:13px;">${label}</a></div>`;
}

const appLink = (path = '') => `${env.APP_URL}${path}`;

// --- Builders ----------------------------------------------------------------

export function complaintCreatedClient(c: NotifComplaint): RenderedEmail {
  return {
    subject: `[${env.COMPANY_NAME}] Réclamation enregistrée - ${c.reference}`,
    html: layout(
      'Votre réclamation a bien été enregistrée',
      '#2563eb',
      `<p>Bonjour <strong>${c.clientName}</strong>,</p>
       <p>Nous confirmons l'enregistrement de votre réclamation sous la référence :</p>
       <div style="background:#f1f5f9;border:1px dashed #94a3b8;padding:12px;text-align:center;font-weight:bold;font-family:monospace;font-size:18px;border-radius:6px;">${c.reference}</div>
       <p>Nos équipes la prennent en charge. Merci de rappeler cette référence pour tout échange.</p>`,
    ),
  };
}

export function complaintCreatedStaff(c: NotifComplaint): RenderedEmail {
  return {
    subject: `[Nouvelle réclamation] ${c.reference} - ${c.site?.city || ''}`,
    html: layout(
      'Nouvelle réclamation à qualifier',
      '#6b21a8',
      `<p>Une nouvelle réclamation a été enregistrée par la téléconseillère${c.createdBy ? ` (${c.createdBy.fullName})` : ''}.</p>
       ${infoTable(c)}
       <p><em>${c.description || ''}</em></p>
       ${button(appLink('/complaints/' + c.id), 'Qualifier la réclamation', '#7c3aed')}`,
    ),
  };
}

export function complaintAssigned(c: NotifComplaint, assigneeName: string): RenderedEmail {
  return {
    subject: `[Affectation] ${c.reference} vous est attribuée`,
    html: layout(
      'Réclamation affectée',
      '#d97706',
      `<p>Bonjour <strong>${assigneeName}</strong>,</p>
       <p>La réclamation suivante vous a été attribuée pour traitement :</p>
       ${infoTable(c)}
       ${button(appLink('/complaints/' + c.id), 'Traiter la réclamation', '#d97706')}`,
    ),
  };
}

export function statusChanged(c: NotifComplaint, newStatus: string): RenderedEmail {
  return {
    subject: `[Mise à jour] ${c.reference} - statut : ${newStatus}`,
    html: layout(
      'Changement de statut',
      '#0d9488',
      `<p>Le statut de la réclamation <strong>${c.reference}</strong> est désormais : <strong>${newStatus}</strong>.</p>
       ${infoTable(c)}
       ${button(appLink('/complaints/' + c.id), 'Voir la réclamation', '#0d9488')}`,
    ),
  };
}

export function escalated(c: NotifComplaint, reasonFr: string, targetName: string): RenderedEmail {
  return {
    subject: `[ESCALADE] ${c.reference} - ${reasonFr}`,
    html: layout(
      'Réclamation escaladée',
      '#dc2626',
      `<p>Bonjour <strong>${targetName}</strong>,</p>
       <p>La réclamation <strong>${c.reference}</strong> a été escaladée vers vous.</p>
       <p><strong>Motif :</strong> ${reasonFr}</p>
       ${infoTable(c)}
       ${button(appLink('/complaints/' + c.id), 'Intervenir maintenant', '#dc2626')}`,
    ),
  };
}

export function complaintClosed(c: NotifComplaint): RenderedEmail {
  return {
    subject: `[${env.COMPANY_NAME}] Réclamation clôturée - ${c.reference}`,
    html: layout(
      'Votre réclamation est clôturée',
      '#16a34a',
      `<p>Bonjour <strong>${c.clientName}</strong>,</p>
       <p>Votre réclamation <strong>${c.reference}</strong> a été clôturée. Nous vous remercions de votre confiance.</p>`,
    ),
  };
}

export function npsTriggered(c: NotifComplaint): RenderedEmail {
  const link = appLink(`/nps/${c.id}`);
  return {
    subject: `[${env.COMPANY_NAME}] Votre avis compte - ${c.reference}`,
    html: layout(
      'Recommanderiez-vous notre service ?',
      '#4f46e5',
      `<p>Bonjour <strong>${c.clientName}</strong>,</p>
       <p>Suite au traitement de votre réclamation <strong>${c.reference}</strong>, sur une échelle de 0 à 10,
       quelle est la probabilité que vous recommandiez notre service après-vente ?</p>
       ${button(link, 'Donner mon avis', '#4f46e5')}`,
    ),
  };
}
