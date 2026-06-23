import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { api, ApiError } from '../lib/api.ts';
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui.tsx';
import { ROLE_LABELS } from '../lib/labels.ts';
import type { Role, SiteRef, UserRow } from '../lib/types.ts';

const ROLES: Role[] = ['ADMIN', 'TELECONSEILLERE', 'CRM_MANAGER', 'CONSEILLER_SAV', 'CHEF_ATELIER', 'RESPONSABLE_SAV', 'DIRECTION'];

export default function UsersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserRow | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ users: UserRow[] }>('/api/users') });
  const { data: sitesData } = useQuery({ queryKey: ['sites'], queryFn: () => api.get<{ sites: SiteRef[] }>('/api/reference/sites') });

  const users = data?.users ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const toggleActive = useMutation({
    mutationFn: (u: UserRow) => api.patch(`/api/users/${u.id}/active`, { active: !u.active }),
    onSuccess: () => { setActionError(null); refresh(); },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : 'Action impossible'),
  });
  const removeUser = useMutation({
    mutationFn: (u: UserRow) => api.del(`/api/users/${u.id}`),
    onSuccess: () => { setActionError(null); refresh(); },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : 'Suppression impossible'),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} compte(s) · gestion des accès et de la hiérarchie d'escalade`}
        actions={
          <Button onClick={() => { setActionError(null); setEditing('new'); }}>
            <UserPlus size={16} /> Nouvel utilisateur
          </Button>
        }
      />

      {actionError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}

      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
          users={users}
          sites={sitesData?.sites ?? []}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); refresh(); }}
        />
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">{u.site?.city ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.manager?.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Modifier" onClick={() => { setActionError(null); setEditing(u); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => toggleActive.mutate(u)}>
                        {u.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                        onClick={() => { if (confirm(`Supprimer définitivement ${u.fullName} ?`)) removeUser.mutate(u); }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UserForm({ user, users, sites, onClose, onDone }: { user: UserRow | null; users: UserRow[]; sites: SiteRef[]; onClose: () => void; onDone: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role ?? 'CONSEILLER_SAV') as Role,
    phone: user?.phone ?? '',
    siteId: user?.siteId ?? '',
    managerId: user?.managerId ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Candidats responsables : tous les autres utilisateurs (un user n'est pas son propre manager).
  const managers = users.filter((u) => u.id !== user?.id);

  const mut = useMutation({
    mutationFn: () => {
      const base = {
        fullName: form.fullName,
        role: form.role,
        phone: form.phone || null,
        siteId: form.siteId || null,
        managerId: form.managerId || null,
      };
      if (isEdit) {
        const payload: Record<string, unknown> = { ...base };
        if (form.password) payload.password = form.password; // optionnel en modification
        return api.patch(`/api/users/${user!.id}`, payload);
      }
      return api.post('/api/users', { ...base, email: form.email, password: form.password });
    },
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Enregistrement impossible'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mut.mutate();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{isEdit ? `Modifier ${user!.fullName}` : 'Nouvel utilisateur'}</h2>
        <button onClick={onClose} className="text-sm text-slate-500 hover:underline">Fermer</button>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nom complet *"><input required className={inputClass} value={form.fullName} onChange={set('fullName')} placeholder="Jean Mballa" /></Field>
        <Field label="Email *">
          <input type="email" required disabled={isEdit} className={`${inputClass} ${isEdit ? 'bg-slate-100 text-slate-500' : ''}`} value={form.email} onChange={set('email')} placeholder="abcde@cfao.com" />
        </Field>
        <Field label={isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe * (min 8)'}>
          <input type="password" required={!isEdit} minLength={8} className={inputClass} value={form.password} onChange={set('password')} placeholder={isEdit ? 'Laisser vide pour ne pas changer' : '••••••••'} />
        </Field>
        <Field label="Téléphone"><input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+237 6XX XX XX XX" /></Field>
        <Field label="Rôle">
          <select className={inputClass} value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Site">
          <select className={inputClass} value={form.siteId} onChange={set('siteId')}>
            <option value="">Aucun site (national)</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.city} ({s.code})</option>)}
          </select>
        </Field>
        <Field label="Responsable (email — pour l'escalade)">
          <select className={inputClass} value={form.managerId} onChange={set('managerId')}>
            <option value="">Aucun responsable</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName} — {m.email}</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le compte'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
        </div>
        {error && <div className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </form>
    </Card>
  );
}
