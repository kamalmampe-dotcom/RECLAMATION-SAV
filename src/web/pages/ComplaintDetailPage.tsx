import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.ts';
import { Button, Card, Field, PriorityBadge, StatusBadge, inputClass } from '../components/ui.tsx';
import { PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS, formatDate } from '../lib/labels.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { ALLOWED_TRANSITIONS } from '@/src/lib/complaintWorkflow.ts';
import type { Category, ComplaintDetail, ComplaintStatus, Priority, RootCause } from '../lib/types.ts';

export default function ComplaintDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get<{ complaint: ComplaintDetail }>(`/api/complaints/${id}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['complaint', id] });
    qc.invalidateQueries({ queryKey: ['complaints'] });
  };
  const onError = (e: unknown) => setActionError(e instanceof ApiError ? e.message : 'Action impossible');

  const statusMut = useMutation({
    mutationFn: (status: ComplaintStatus) => api.patch(`/api/complaints/${id}/status`, { status }),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError,
  });

  if (isLoading || !data) return <div className="text-slate-500">Chargement…</div>;
  const c = data.complaint;
  const role = user?.role;
  const canQualify = (role === 'CRM_MANAGER' || role === 'ADMIN') && c.status === 'NEW';
  const canAssign = (role === 'CHEF_ATELIER' || role === 'RESPONSABLE_SAV' || role === 'ADMIN') &&
    ['QUALIFIED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS', 'ESCALATED'].includes(c.status);
  const canTreat = role === 'CONSEILLER_SAV' || role === 'CHEF_ATELIER' || role === 'RESPONSABLE_SAV' || role === 'ADMIN';
  const nextStatuses = ALLOWED_TRANSITIONS[c.status];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{c.reference}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
            {c.escalationLevel > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Escalade niveau {c.escalationLevel}</span>}
          </div>
        </div>
      </div>

      {actionError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Colonne infos */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Client & véhicule</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Client" value={c.clientName} />
              <Info label="Téléphone" value={c.clientPhone} />
              <Info label="Email" value={c.clientEmail ?? '-'} />
              <Info label="Site" value={c.site ? `${c.site.city} (${c.site.code})` : '-'} />
              <Info label="Immatriculation" value={c.vehiclePlate ?? '-'} />
              <Info label="Modèle" value={c.vehicleModel ?? '-'} />
              <Info label="VIN" value={c.vehicleVin ?? '-'} />
              <Info label="Catégorie" value={c.category?.labelFr ?? 'À qualifier'} />
            </dl>
            <div className="mt-4">
              <div className="text-xs font-medium uppercase text-slate-400">Description</div>
              <p className="mt-1 text-sm">{c.description}</p>
            </div>
            {c.rootCauses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.rootCauses.map((rc) => (
                  <span key={rc.rootCause.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{rc.rootCause.labelFr}</span>
                ))}
              </div>
            )}
          </Card>

          <AttachmentsPanel id={id} canUpload={canTreat} />

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Historique</h2>
            <ol className="space-y-3">
              {c.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <div>{h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}<strong>{STATUS_LABELS[h.toStatus]}</strong></div>
                    {h.comment && <div className="text-slate-500">{h.comment}</div>}
                    <div className="text-xs text-slate-400">{formatDate(h.createdAt)}{h.changedBy ? ` · ${h.changedBy.fullName}` : ''}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Colonne actions */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Suivi</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Créée par" value={c.createdBy ? `${c.createdBy.fullName} (${ROLE_LABELS[c.createdBy.role]})` : '-'} />
              <Info label="Affectée à" value={c.assignedTo?.fullName ?? '-'} />
              <Info label="Échéance SLA" value={formatDate(c.slaDueAt)} />
              <Info label="Créée le" value={formatDate(c.createdAt)} />
            </dl>
          </Card>

          {canQualify && <QualifyPanel id={id} onDone={() => { setActionError(null); invalidate(); }} onError={onError} />}
          {canAssign && <AssignPanel id={id} onDone={() => { setActionError(null); invalidate(); }} onError={onError} />}

          {canTreat && nextStatuses.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Changer le statut</h2>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button key={s} variant={s === 'CANCELLED' ? 'danger' : 'secondary'} disabled={statusMut.isPending} onClick={() => statusMut.mutate(s)}>
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface AttachmentRow {
  id: string;
  fileName: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  uploadedBy: { fullName: string } | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AttachmentsPanel({ id, canUpload }: { id: string; canUpload: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ aiEnabled: boolean; storageEnabled: boolean }>('/api/reference/config'),
  });
  const { data } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => api.get<{ attachments: AttachmentRow[] }>(`/api/complaints/${id}/attachments`),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload(`/api/complaints/${id}/attachments`, form);
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['attachments', id] });
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "Échec de l'envoi"),
  });

  const attachments = data?.attachments ?? [];
  const storageEnabled = config?.storageEnabled ?? false;

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Pièces jointes</h2>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune pièce jointe.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <a href={`/api/complaints/attachments/${a.id}/download`} className="truncate text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                {a.fileName}
              </a>
              <span className="shrink-0 text-xs text-slate-400">{formatSize(a.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {canUpload && storageEnabled && (
        <label className="mt-3 inline-block cursor-pointer text-sm font-medium text-blue-600 hover:underline">
          {uploadMut.isPending ? 'Envoi…' : '+ Ajouter un fichier'}
          <input
            type="file"
            className="hidden"
            disabled={uploadMut.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMut.mutate(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {canUpload && !storageEnabled && (
        <p className="mt-3 text-xs text-slate-400">Stockage des fichiers non configuré.</p>
      )}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function QualifyPanel({ id, onDone, onError }: { id: string; onDone: () => void; onError: (e: unknown) => void }) {
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => api.get<{ categories: Category[] }>('/api/reference/categories') });
  const { data: rcs } = useQuery({ queryKey: ['rootCauses'], queryFn: () => api.get<{ rootCauses: RootCause[] }>('/api/reference/root-causes') });
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ aiEnabled: boolean }>('/api/reference/config') });
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [rootCauseIds, setRootCauseIds] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState('');

  const mut = useMutation({
    mutationFn: () => api.patch(`/api/complaints/${id}/qualify`, { categoryId, priority, rootCauseIds }),
    onSuccess: onDone,
    onError,
  });

  const aiMut = useMutation({
    mutationFn: () => api.post<{ suggestion: { categoryId: string | null; priority: Priority | null; rootCauseIds: string[]; summary: string } }>(`/api/complaints/${id}/ai-suggest`),
    onSuccess: (r) => {
      const s = r.suggestion;
      if (s.categoryId) setCategoryId(s.categoryId);
      if (s.priority) setPriority(s.priority);
      if (s.rootCauseIds?.length) setRootCauseIds(s.rootCauseIds);
      setAiSummary(s.summary);
    },
    onError,
  });

  const toggle = (rid: string) => setRootCauseIds((ids) => (ids.includes(rid) ? ids.filter((x) => x !== rid) : [...ids, rid]));

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Qualifier</h2>
        {config?.aiEnabled && (
          <button onClick={() => aiMut.mutate()} disabled={aiMut.isPending} className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200 disabled:opacity-50">
            {aiMut.isPending ? 'Analyse IA…' : 'Suggérer (IA)'}
          </button>
        )}
      </div>
      {aiSummary && <div className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">Résumé IA : {aiSummary}</div>}
      <div className="space-y-3">
        <Field label="Catégorie">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Choisir une catégorie</option>
            {cats?.categories.map((c) => <option key={c.id} value={c.id}>{c.labelFr}</option>)}
          </select>
        </Field>
        <Field label="Priorité">
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Causes racines</div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {rcs?.rootCauses.map((rc) => (
              <label key={rc.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rootCauseIds.includes(rc.id)} onChange={() => toggle(rc.id)} />
                {rc.labelFr}
              </label>
            ))}
          </div>
        </div>
        <Button disabled={!categoryId || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? 'Qualification…' : 'Valider la qualification'}
        </Button>
      </div>
    </Card>
  );
}

function AssignPanel({ id, onDone, onError }: { id: string; onDone: () => void; onError: (e: unknown) => void }) {
  const { data } = useQuery({ queryKey: ['assignees'], queryFn: () => api.get<{ assignees: { id: string; fullName: string }[] }>('/api/reference/assignees') });
  const [assignedToId, setAssignedToId] = useState('');
  const mut = useMutation({
    mutationFn: () => api.patch(`/api/complaints/${id}/assign`, { assignedToId }),
    onSuccess: onDone,
    onError,
  });

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Affecter</h2>
      <div className="space-y-3">
        <select className={inputClass} value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
          <option value="">Sélectionner un conseiller</option>
          {data?.assignees.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
        </select>
        <Button disabled={!assignedToId || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? 'Affectation…' : 'Affecter'}
        </Button>
      </div>
    </Card>
  );
}
