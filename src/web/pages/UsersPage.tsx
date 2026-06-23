import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.ts';
import { Button, Card, Field, inputClass } from '../components/ui.tsx';
import { ROLE_LABELS } from '../lib/labels.ts';
import type { Role, SiteRef, UserRow } from '../lib/types.ts';

const ROLES: Role[] = ['ADMIN', 'TELECONSEILLERE', 'CRM_MANAGER', 'CONSEILLER_SAV', 'CHEF_ATELIER', 'RESPONSABLE_SAV', 'DIRECTION'];

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data } = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ users: UserRow[] }>('/api/users') });
  const { data: sitesData } = useQuery({ queryKey: ['sites'], queryFn: () => api.get<{ sites: SiteRef[] }>('/api/reference/sites') });

  const toggleActive = useMutation({
    mutationFn: (u: UserRow) => api.patch(`/api/users/${u.id}/active`, { active: !u.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Fermer' : 'Nouvel utilisateur'}</Button>
      </div>

      {showForm && <CreateUserForm sites={sitesData?.sites ?? []} onDone={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['users'] }); }} />}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">{u.site?.city ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-brand-600 hover:underline" onClick={() => toggleActive.mutate(u)}>
                      {u.active ? 'Désactiver' : 'Activer'}
                    </button>
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

function CreateUserForm({ sites, onDone }: { sites: SiteRef[]; onDone: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'CONSEILLER_SAV' as Role, siteId: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => api.post('/api/users', { ...form, siteId: form.siteId || null }),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Création impossible'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mut.mutate();
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nom complet *"><input required className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
        <Field label="Email *"><input type="email" required className={inputClass} value={form.email} onChange={set('email')} /></Field>
        <Field label="Mot de passe * (min 8)"><input type="password" required minLength={8} className={inputClass} value={form.password} onChange={set('password')} /></Field>
        <Field label="Rôle">
          <select className={inputClass} value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Site">
          <select className={inputClass} value={form.siteId} onChange={set('siteId')}>
            <option value="">Aucun (rattachement national)</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.city} ({s.code})</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Création…' : 'Créer'}</Button>
        </div>
        {error && <div className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </form>
    </Card>
  );
}
