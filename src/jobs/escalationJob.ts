/**
 * Planification du moteur d'escalade (node-cron).
 * Intervalle : ESCALATION_CRON_MINUTES. Activé en production, ou en dev via
 * ENABLE_JOBS=true. Toute erreur est capturée (ne casse jamais le serveur).
 */
import cron from 'node-cron';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { escalationService } from '../services/escalationService.js';

export function startEscalationJob(): void {
  const jobsEnabled = env.NODE_ENV === 'production' || process.env.ENABLE_JOBS === 'true';
  if (!jobsEnabled) {
    logger.warn('Jobs désactivés (définir ENABLE_JOBS=true en dev pour activer l\'escalade).');
    return;
  }

  const minutes = Math.max(1, env.ESCALATION_CRON_MINUTES);
  const expression = `*/${minutes} * * * *`;
  if (!cron.validate(expression)) {
    logger.error({ expression }, 'Expression cron invalide — job escalade non démarré.');
    return;
  }

  cron.schedule(expression, async () => {
    try {
      await escalationService.runSweep();
    } catch (err) {
      logger.error({ err }, 'Erreur du job d\'escalade');
    }
  });
  logger.info(`Job d'escalade planifié (toutes les ${minutes} min).`);
}
