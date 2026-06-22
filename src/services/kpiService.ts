/**
 * Service KPI — agrégations pour le pilotage (Phase 6).
 * Indicateurs : volume, délai moyen de résolution, taux d'escalade, NPS,
 * top causes racines, performance par site, distribution des statuts.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface KpiFilter {
  siteId?: string;
  days?: number;
}

function buildSqlWhere(filter: KpiFilter, alias = ''): Prisma.Sql {
  const col = (name: string) => Prisma.raw(`${alias ? alias + '.' : ''}${name}`);
  const conditions: Prisma.Sql[] = [];
  if (filter.siteId) conditions.push(Prisma.sql`${col('site_id')} = ${filter.siteId}`);
  if (filter.days) {
    const from = new Date(Date.now() - filter.days * 24 * 3600 * 1000);
    conditions.push(Prisma.sql`${col('created_at')} >= ${from}`);
  }
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}

export const kpiService = {
  async overview(filter: KpiFilter) {
    const where: Prisma.ComplaintWhereInput = {
      ...(filter.siteId ? { siteId: filter.siteId } : {}),
      ...(filter.days ? { createdAt: { gte: new Date(Date.now() - filter.days * 24 * 3600 * 1000) } } : {}),
    };

    const [total, escalated, statusGroups, npsRows, monthly, topRootCauses, bySite, avgRes] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({ where: { ...where, escalationLevel: { gt: 0 } } }),
      prisma.complaint.groupBy({ by: ['status'], where, _count: true }),
      prisma.npsSurvey.findMany({
        where: { score: { not: null }, complaint: where },
        select: { score: true },
      }),
      prisma.$queryRaw<{ month: string; count: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
        FROM complaints ${buildSqlWhere(filter)}
        GROUP BY 1 ORDER BY 1`),
      prisma.$queryRaw<{ code: string; labelFr: string; count: number }[]>(Prisma.sql`
        SELECT rc.code, rc.label_fr AS "labelFr", count(*)::int AS count
        FROM complaint_root_causes crc
        JOIN root_causes rc ON rc.id = crc.root_cause_id
        JOIN complaints c ON c.id = crc.complaint_id
        ${buildSqlWhere(filter, 'c')}
        GROUP BY rc.code, rc.label_fr ORDER BY count DESC LIMIT 10`),
      prisma.$queryRaw<{ code: string; city: string; total: number; resolved: number; escalated: number; avgResolutionHours: number | null }[]>(Prisma.sql`
        SELECT s.code, s.city,
          count(c.id)::int AS total,
          count(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))::int AS resolved,
          count(c.id) FILTER (WHERE c.escalation_level > 0)::int AS escalated,
          avg(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/3600) FILTER (WHERE c.resolved_at IS NOT NULL)::float AS "avgResolutionHours"
        FROM complaints c JOIN sites s ON s.id = c.site_id
        ${buildSqlWhere(filter, 'c')}
        GROUP BY s.code, s.city ORDER BY total DESC`),
      prisma.$queryRaw<{ hours: number | null }[]>(Prisma.sql`
        SELECT avg(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::float AS hours
        FROM complaints
        WHERE resolved_at IS NOT NULL
        ${filter.siteId ? Prisma.sql`AND site_id = ${filter.siteId}` : Prisma.empty}
        ${filter.days ? Prisma.sql`AND created_at >= ${new Date(Date.now() - filter.days * 24 * 3600 * 1000)}` : Prisma.empty}`),
    ]);

    // NPS
    const scores = npsRows.map((r) => r.score!).filter((s) => s !== null);
    const responses = scores.length;
    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const npsScore = responses ? Math.round(((promoters - detractors) / responses) * 100) : null;

    return {
      volume: { total },
      avgResolutionHours: avgRes[0]?.hours ?? null,
      escalationRate: total ? Number((escalated / total).toFixed(3)) : 0,
      nps: { score: npsScore, responses, promoters, passives, detractors },
      statusDistribution: statusGroups.map((g) => ({ status: g.status, count: g._count as number })),
      monthly,
      topRootCauses,
      bySite: bySite.map((s) => ({
        ...s,
        escalationRate: s.total ? Number((s.escalated / s.total).toFixed(3)) : 0,
      })),
    };
  },
};
