/**
 * Service NPS — enquête de satisfaction soumise par le client (lien public).
 * L'enquête est identifiée par l'id de la réclamation (relation 1-1).
 */
import type { NpsCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';

function categoryFromScore(score: number): NpsCategory {
  if (score <= 6) return 'DETRACTOR';
  if (score <= 8) return 'PASSIVE';
  return 'PROMOTER';
}

export const npsService = {
  /** Renvoie l'état public de l'enquête (sans données sensibles). */
  async getPublic(complaintId: string) {
    const survey = await prisma.npsSurvey.findUnique({
      where: { complaintId },
      include: { complaint: { select: { reference: true } } },
    });
    if (!survey) throw notFound('Enquête introuvable');
    return {
      reference: survey.complaint.reference,
      responded: survey.respondedAt != null,
      score: survey.score,
    };
  },

  /** Enregistre la réponse du client (score 0-10 + commentaire optionnel). */
  async submit(complaintId: string, score: number, comment?: string) {
    const survey = await prisma.npsSurvey.findUnique({ where: { complaintId } });
    if (!survey) throw notFound('Enquête introuvable');
    await prisma.npsSurvey.update({
      where: { complaintId },
      data: {
        score,
        category: categoryFromScore(score),
        comment: comment?.trim() || null,
        respondedAt: new Date(),
      },
    });
    return { success: true };
  },
};
