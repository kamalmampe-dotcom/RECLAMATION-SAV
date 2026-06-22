import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { Card, StatusBadge } from '../components/ui.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { ROLE_LABELS, formatDate } from '../lib/labels.ts';
import type { ComplaintList, ComplaintStatus } from '../lib/types.ts';

const OPEN_STATUSES: ComplaintStatus[] = ['NEW', 'QUALIFIED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS', 'ESCALATED'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['complaints', '', ''], queryFn: () => api.get<ComplaintList>('/api/complaints?pageSize=100') });

  const items = data?.items ?? [];
  const open = items.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  const escalated = items.filter((c) => c.escalationLevel > 0).length;
  const newCount = items.filter((c) => c.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bonjour {user?.fullName}</h1>
        <p className="text-sm text-slate-500">{user ? ROLE_LABELS[user.role] : ''} · {user?.site?.city ?? 'Réseau national'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total (échantillon)" value={data?.total ?? 0} />
        <Stat label="En cours" value={open} />
        <Stat label="Nouvelles" value={newCount} accent="text-blue-600" />
        <Stat label="Escaladées" value={escalated} accent="text-red-600" />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Dernières réclamations</h2>
          <Link to="/complaints" className="text-sm text-blue-600 hover:underline">Tout voir</Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 6).map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link to={`/complaints/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.reference}</Link>
              <span className="text-slate-600">{c.clientName}</span>
              <StatusBadge status={c.status} />
              <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
            </li>
          ))}
          {items.length === 0 && <li className="py-6 text-center text-slate-400">Aucune réclamation pour le moment.</li>}
        </ul>
      </Card>

      <p className="text-xs text-slate-400">Tableau de bord KPI complet (délai moyen, NPS, top causes, performance par site) — livré en Phase 6.</p>
    </div>
  );
}

function Stat({ label, value, accent = 'text-slate-800' }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
    </Card>
  );
}
