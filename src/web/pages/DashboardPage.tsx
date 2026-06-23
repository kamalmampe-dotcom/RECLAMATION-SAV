import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, AlertTriangle, Clock, Inbox, BarChart3 } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Card, PriorityBadge, StatusBadge } from '../components/ui.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { ROLE_LABELS, formatDate } from '../lib/labels.ts';
import type { ComplaintList, ComplaintStats, ComplaintStatus, Role } from '../lib/types.ts';

const OPEN_STATUSES: ComplaintStatus[] = ['NEW', 'QUALIFIED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS', 'ESCALATED'];

/** File d'attente contextuelle selon le rôle. */
function queueForRole(role: Role): { title: string; params: string } {
  switch (role) {
    case 'CRM_MANAGER':
      return { title: 'Réclamations à qualifier', params: 'status=NEW' };
    case 'CHEF_ATELIER':
      return { title: 'Réclamations à affecter', params: 'status=QUALIFIED' };
    case 'CONSEILLER_SAV':
      return { title: 'Mes dossiers en cours', params: 'mine=true' };
    case 'RESPONSABLE_SAV':
    case 'DIRECTION':
    case 'ADMIN':
      return { title: 'Dossiers escaladés', params: 'status=ESCALATED' };
    default:
      return { title: 'Dernières réclamations', params: '' };
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'TELECONSEILLERE';
  const queue = queueForRole(role);

  const { data: stats } = useQuery({ queryKey: ['complaint-stats'], queryFn: () => api.get<ComplaintStats>('/api/complaints/stats') });
  const { data: list } = useQuery({
    queryKey: ['dashboard-queue', queue.params],
    queryFn: () => api.get<ComplaintList>(`/api/complaints?${queue.params}${queue.params ? '&' : ''}pageSize=8`),
  });

  const open = stats ? OPEN_STATUSES.reduce((sum, s) => sum + (stats.byStatus[s] ?? 0), 0) : 0;
  const isManager = role === 'RESPONSABLE_SAV' || role === 'DIRECTION' || role === 'ADMIN';
  const isConseiller = role === 'CONSEILLER_SAV';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bonjour {user?.fullName?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">{ROLE_LABELS[role]} · {user?.site?.city ?? 'Réseau national'}</p>
        </div>
        {(role === 'TELECONSEILLERE' || role === 'ADMIN') && (
          <Link to="/complaints/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            <PlusCircle size={18} /> Nouvelle réclamation
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Inbox size={18} />} label="Total" value={stats?.total} />
        {isConseiller ? (
          <Stat icon={<Clock size={18} />} label="Mes dossiers" value={stats?.mine} accent="text-brand-600" />
        ) : (
          <Stat icon={<Clock size={18} />} label="En cours" value={open} accent="text-brand-600" />
        )}
        <Stat icon={<AlertTriangle size={18} />} label="Escaladées" value={stats?.escalated} accent="text-red-600" />
        <Stat icon={<Clock size={18} />} label="SLA dépassé" value={stats?.overdue} accent="text-orange-600" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{queue.title}</h2>
          <Link to="/complaints" className="text-sm font-medium text-brand-600 hover:underline">Tout voir</Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {(list?.items ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-slate-50">
              <Link to={`/complaints/${c.id}`} className="font-medium text-brand-600 hover:underline">{c.reference}</Link>
              <span className="flex-1 truncate text-slate-600">{c.clientName}{c.vehiclePlate ? ` · ${c.vehiclePlate}` : ''}</span>
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={c.status} />
              <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
            </li>
          ))}
          {list && list.items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-400">Rien à traiter pour le moment. 👍</li>
          )}
        </ul>
      </Card>

      {isManager && (
        <Link to="/kpi" className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-800 transition hover:bg-brand-100">
          <BarChart3 size={20} />
          <div>
            <div className="text-sm font-semibold">Tableau de bord de pilotage</div>
            <div className="text-xs text-brand-700/80">Volume, délai de résolution, taux d'escalade, NPS, performance par site</div>
          </div>
        </Link>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent = 'text-slate-800' }: { icon: ReactNode; label: string; value?: number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value ?? '…'}</div>
    </Card>
  );
}
