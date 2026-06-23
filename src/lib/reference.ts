/**
 * Génération de la référence lisible d'une réclamation.
 * Format : CFAO-SAV-{SITE}-{YYYYMMDD}-{SEQ}
 *   ex : CFAO-SAV-DLA-20260622-001
 */
import { format } from 'date-fns';

export function buildComplaintReference(siteCode: string, dailyCount: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  const seq = String(dailyCount + 1).padStart(3, '0');
  return `CFAO-SAV-${siteCode.toUpperCase()}-${date}-${seq}`;
}
