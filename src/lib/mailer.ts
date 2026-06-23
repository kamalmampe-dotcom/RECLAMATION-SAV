/**
 * Transport email (Nodemailer / Brevo SMTP) — singleton.
 * Si la configuration SMTP est incomplète, renvoie null : le NotificationService
 * bascule alors en mode simulation (les emails sont journalisés, pas envoyés).
 */
import nodemailer from 'nodemailer';
import { env, isEmailConfigured } from './env.js';
import { logger } from './logger.js';

let transporter: nodemailer.Transporter | null | undefined;

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!isEmailConfigured) {
    logger.warn('SMTP non configuré — emails en mode simulation (journalisés).');
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE || env.EMAIL_PORT === 465,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
  logger.info(`SMTP configuré (${env.EMAIL_HOST}:${env.EMAIL_PORT}).`);
  return transporter;
}

export function senderAddress(): string {
  return `"${env.COMPANY_NAME}" <${env.EMAIL_FROM}>`;
}
