import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../lib/api.ts';
import { Card } from '../components/ui.tsx';
import { STATUS_LABELS } from '../lib/labels.ts';
import type { KpiOverview } from '../lib/types.ts';

const PERIODS = [
  { label: '30 jours', value: 30 },
  { label: '90 jours', value: 90 },
  { label: '12 mois', value: 365 },
  { label: 'Tout', value: 0 },
];

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#6366f1', '#f59e0b', '#fb923c', '#ef4444', '#10b981', '#22c55e', '#9ca3af'];

export default function KpiPage() {
  const [days, setDays] = useState(90);
  const query = days ? `?days=${days}` : '';
  const { data, isLoading } = useQuery({
    queryKey: ['kpi', days],
    queryFn: () => api.get<KpiOverview>(`/api/kpi/overview${query}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Pilotage - Indicateurs SAV</h1>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`rounded-md px-3 py-1 text-sm ${days === p.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-sm text-slate-500">Chargement…</div>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Volume réclamations" value={String(data.volume.total)} />
            <Stat label="Délai moyen résolution" value={data.avgResolutionHours != null ? `${(data.avgResolutionHours / 24).toFixed(1)} j` : '-'} />
            <Stat label="Taux d'escalade" value={`${Math.round(data.escalationRate * 100)} %`} accent="text-red-600" />
            <Stat label="NPS" value={data.nps.score != null ? String(data.nps.score) : '-'} accent="text-emerald-600" sub={`${data.nps.responses} réponse(s)`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Volume mensuel</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="Réclamations" fill="#2447c0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Répartition par statut</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution.map((s) => ({ name: STATUS_LABELS[s.status], value: s.count }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {data.statusDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Top causes racines</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart layout="vertical" data={data.topRootCauses} margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="labelFr" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="Occurrences" fill="#355fe0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {data.topRootCauses.length === 0 && <p className="text-center text-sm text-slate-400">Aucune donnée.</p>}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Performance par site</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-2">Site</th><th className="py-2">Total</th><th className="py-2">Résolues</th>
                    <th className="py-2">Escalade</th><th className="py-2">Délai moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySite.map((s) => (
                    <tr key={s.code} className="border-b border-slate-100">
                      <td className="py-2 font-medium">{s.city}</td>
                      <td className="py-2">{s.total}</td>
                      <td className="py-2">{s.resolved}</td>
                      <td className="py-2">{Math.round(s.escalationRate * 100)} %</td>
                      <td className="py-2">{s.avgResolutionHours != null ? `${(s.avgResolutionHours / 24).toFixed(1)} j` : '-'}</td>
                    </tr>
                  ))}
                  {data.bySite.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Aucune donnée.</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent = 'text-slate-800', sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}
