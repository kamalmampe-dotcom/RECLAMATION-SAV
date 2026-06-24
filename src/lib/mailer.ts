/**
 * Envoi d'email — 3 modes, dans l'ordre de priorité :
 *   1. API HTTP Brevo (HTTPS/443) — recommandé sur Render qui bloque le SMTP.
 *   2. SMTP (Nodemailer) — si seul le SMTP est configuré.
 *   3. Simulation — si rien n'est configuré (journalisé, non envoyé).
 */
import nodemailer from 'nodemailer';
import { env, isBrevoApiConfigured, isSmtpConfigured } from './env.js';
import { logger } from './logger.js';

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!isSmtpConfigured) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE || env.EMAIL_PORT === 465,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  return transporter;
}

function senderAddress(): string {
  return `"${env.COMPANY_NAME}" <${env.EMAIL_FROM}>`;
}

export interface SendResult {
  messageId: string | null;
  simulated: boolean;
}

/** Envoie un email (lève une erreur en cas d'échec réel). */
export async function sendMail(params: { to: string; subject: string; html: string }): Promise<SendResult> {
  const recipients = params.to.split(',').map((e) => e.trim()).filter(Boolean);

  // 1) API HTTP Brevo (contourne le blocage des ports SMTP).
  if (isBrevoApiConfigured) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.EMAIL_FROM, name: env.COMPANY_NAME },
        to: recipients.map((email) => ({ email })),
        subject: params.subject,
        htmlContent: params.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { messageId: data.messageId ?? 'brevo-api', simulated: false };
  }

  // 2) SMTP classique.
  const tr = getTransporter();
  if (tr) {
    const info = await tr.sendMail({ from: senderAddress(), to: params.to, subject: params.subject, html: params.html });
    return { messageId: info.messageId ?? null, simulated: false };
  }

  // 3) Simulation.
  logger.info({ to: params.to, subject: params.subject }, '[SIMULATION] Email (aucun fournisseur configuré)');
  return { messageId: 'SIMULATED', simulated: true };
}
