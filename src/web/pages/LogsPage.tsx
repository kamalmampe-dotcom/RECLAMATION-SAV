import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { Card, PageHeader } from '../components/ui.tsx';
import { formatDate } from '../lib/labels.ts';
import type { AuditLogRow, EmailLogRow } from '../lib/types.ts';

type Tab = 'activity' | 'emails';

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('activity');

  return (
    <div className="space-y-4">
      <PageHeader title="Journaux" subtitle="Activité du système et envois d'emails" />

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>Activité</TabButton>
        <TabButton active={tab === 'emails'} onClick={() => setTab('emails')}>Emails</TabButton>
      </div>

      {tab === 'activity' ? <ActivityLog /> : <EmailLog />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm font-medium ${active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
      {children}
    </button>
  );
}

const fmtAction = (a: string) => a.replaceAll('_', ' ').toLowerCase();

function ActivityLog() {
  const { data, isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: () => api.get<{ logs: AuditLogRow[] }>('/api/admin/audit-logs'), refetchInterval: 60_000 });
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Réclamation</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chargement…</td></tr>}
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDate(l.createdAt)}</td>
                <td className="px-4 py-2.5">{l.user?.fullName ?? '—'}</td>
                <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{fmtAction(l.action)}</span></td>
                <td className="px-4 py-2.5 text-slate-600">{l.complaint?.reference ?? '-'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{l.ip ?? '-'}</td>
              </tr>
            ))}
            {data && data.logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune activité.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EmailLog() {
  const { data, isLoading } = useQuery({ queryKey: ['email-logs'], queryFn: () => api.get<{ logs: EmailLogRow[] }>('/api/admin/email-logs'), refetchInterval: 60_000 });
  const badge = (l: EmailLogRow) => {
    if (l.status === 'FAILED') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Échec</span>;
    if (l.providerMessageId === 'SIMULATED') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Simulé</span>;
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Envoyé</span>;
  };
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Destinataire</th>
              <th className="px-4 py-3">Sujet</th>
              <th className="px-4 py-3">Détail</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chargement…</td></tr>}
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDate(l.createdAt)}</td>
                <td className="px-4 py-2.5">{badge(l)}</td>
                <td className="px-4 py-2.5 text-slate-600">{l.toAddress}</td>
                <td className="px-4 py-2.5">{l.subject}</td>
                <td className="px-4 py-2.5 text-xs text-red-500">{l.error ?? ''}</td>
              </tr>
            ))}
            {data && data.logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun email journalisé.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
