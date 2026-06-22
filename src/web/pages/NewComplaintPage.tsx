import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.ts';
import { Button, Card, Field, inputClass } from '../components/ui.tsx';
import { PRIORITY_LABELS } from '../lib/labels.ts';
import type { Priority, SiteRef } from '../lib/types.ts';

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const { data: sitesData } = useQuery({ queryKey: ['sites'], queryFn: () => api.get<{ sites: SiteRef[] }>('/api/reference/sites') });

  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    siteId: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleVin: '',
    priority: 'MEDIUM' as Priority,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = { ...form, clientEmail: form.clientEmail || null };
      const r = await api.post<{ complaint: { id: string } }>('/api/complaints', payload);
      navigate(`/complaints/${r.complaint.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Nouvelle réclamation</h1>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom du client *"><input required className={inputClass} value={form.clientName} onChange={set('clientName')} /></Field>
            <Field label="Téléphone *"><input required className={inputClass} value={form.clientPhone} onChange={set('clientPhone')} /></Field>
            <Field label="Email client"><input type="email" className={inputClass} value={form.clientEmail} onChange={set('clientEmail')} /></Field>
            <Field label="Site *">
              <select required className={inputClass} value={form.siteId} onChange={set('siteId')}>
                <option value="">— Choisir un site —</option>
                {sitesData?.sites.map((s) => <option key={s.id} value={s.id}>{s.city} ({s.code})</option>)}
              </select>
            </Field>
            <Field label="Immatriculation"><input className={inputClass} value={form.vehiclePlate} onChange={set('vehiclePlate')} /></Field>
            <Field label="Modèle véhicule"><input className={inputClass} value={form.vehicleModel} onChange={set('vehicleModel')} /></Field>
            <Field label="VIN"><input className={inputClass} value={form.vehicleVin} onChange={set('vehicleVin')} /></Field>
            <Field label="Priorité">
              <select className={inputClass} value={form.priority} onChange={set('priority')}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description de la réclamation *">
            <textarea required rows={4} className={inputClass} value={form.description} onChange={set('description')} />
          </Field>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/complaints')}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Créer la réclamation'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
