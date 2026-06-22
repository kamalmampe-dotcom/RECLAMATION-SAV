import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.ts';
import { Button, Field, inputClass } from './ui.tsx';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () => api.post('/api/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      setError(null);
      setDone(true);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Action impossible'),
  });

  function submit() {
    if (newPassword.length < 8) return setError('Le nouveau mot de passe doit faire au moins 8 caractères');
    if (newPassword !== confirm) return setError('La confirmation ne correspond pas');
    mut.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="mb-4 text-base font-semibold">Changer le mot de passe</h2>
        {done ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Mot de passe mis à jour.</div>
            <Button className="w-full" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Field label="Mot de passe actuel">
              <input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Nouveau mot de passe">
              <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
              <Button className="flex-1" disabled={!currentPassword || !newPassword || mut.isPending} onClick={submit}>
                {mut.isPending ? 'Mise à jour…' : 'Valider'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
