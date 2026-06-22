import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { Card, PriorityBadge, StatusBadge } from '../components/ui.tsx';
import { STATUS_LABELS, PRIORITY_LABELS, formatDate } from '../lib/labels.ts';
import type { ComplaintList, ComplaintStatus, Priority } from '../lib/types.ts';

export default function ComplaintsPage() {
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints', status, priority],
    queryFn: () => api.get<ComplaintList>(`/api/complaints?${params.toString()}`),
  });

  const selectClass = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Réclamations</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus | '')} className={selectClass}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} className={selectClass}>
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        {isLoading && <div className="p-6 text-sm text-slate-500">Chargement…</div>}
        {error && <div className="p-6 text-sm text-red-600">Erreur de chargement.</div>}
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Priorité</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Affecté à</th>
                  <th className="px-4 py-3">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/complaints/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.reference}</Link>
                      {c.escalationLevel > 0 && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">N{c.escalationLevel}</span>}
                    </td>
                    <td className="px-4 py-3">{c.clientName}</td>
                    <td className="px-4 py-3">{c.site?.city ?? '—'}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">{c.assignedTo?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucune réclamation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {data && <div className="text-xs text-slate-500">{data.total} réclamation(s)</div>}
    </div>
  );
}
