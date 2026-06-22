/**
 * Service IA (optionnel).
 * Classification automatique d'une réclamation : suggère catégorie, causes racines,
 * priorité et résumé, à partir de la description. Les suggestions sont contraintes
 * à la taxonomie NORMALISÉE (codes existants en base) puis mappées sur les IDs.
 *
 * Activé uniquement si AI_ENABLED=true et GEMINI_API_KEY défini.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const aiEnabled = Boolean(env.AI_ENABLED && env.GEMINI_API_KEY);

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export interface AiSuggestion {
  categoryId: string | null;
  categoryCode: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  rootCauseIds: string[];
  summary: string;
}

export const aiService = {
  get enabled() {
    return aiEnabled;
  },

  async suggest(description: string): Promise<AiSuggestion> {
    if (!aiEnabled) throw new AppError(409, 'Module IA non activé', 'AI_DISABLED');

    const [categories, rootCauses] = await Promise.all([
      prisma.category.findMany({ where: { active: true }, select: { id: true, code: true, labelFr: true } }),
      prisma.rootCause.findMany({ where: { active: true }, select: { id: true, code: true, labelFr: true } }),
    ]);

    const prompt = [
      "Tu es un assistant SAV d'un réseau de concessions automobiles au Cameroun.",
      'Analyse la réclamation client ci-dessous et classe-la.',
      '',
      'Catégories autorisées (utilise UNIQUEMENT ces codes) :',
      ...categories.map((c) => `- ${c.code} : ${c.labelFr}`),
      '',
      'Causes racines autorisées (codes, plusieurs possibles) :',
      ...rootCauses.map((r) => `- ${r.code} : ${r.labelFr}`),
      '',
      'Priorité : LOW, MEDIUM, HIGH ou CRITICAL.',
      'Fournis aussi un résumé neutre en une phrase.',
      '',
      `Réclamation : """${description}"""`,
    ].join('\n');

    try {
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categoryCode: { type: Type.STRING },
              rootCauseCodes: { type: Type.ARRAY, items: { type: Type.STRING } },
              priority: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ['categoryCode', 'priority', 'summary'],
          },
        },
      });

      const parsed = JSON.parse(response.text ?? '{}') as {
        categoryCode?: string;
        rootCauseCodes?: string[];
        priority?: string;
        summary?: string;
      };

      const category = categories.find((c) => c.code === parsed.categoryCode) ?? null;
      const rootCauseIds = rootCauses
        .filter((r) => (parsed.rootCauseCodes ?? []).includes(r.code))
        .map((r) => r.id);
      const priority = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.priority ?? '')
        ? (parsed.priority as AiSuggestion['priority'])
        : null;

      return {
        categoryId: category?.id ?? null,
        categoryCode: category?.code ?? null,
        priority,
        rootCauseIds,
        summary: parsed.summary ?? '',
      };
    } catch (err) {
      logger.error({ err }, 'Échec de la classification IA');
      throw new AppError(502, "Le service IA n'a pas pu traiter la demande", 'AI_ERROR');
    }
  },
};
