import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Network, BellRing } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.tsx';
import { Button, Field, inputClass } from '../components/ui.tsx';
import { Logo } from '../components/Logo.tsx';
import { ApiError } from '../lib/api.ts';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <Logo tone="light" />
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight">Gestion des réclamations<br />CFAO Mobility Cameroon</h2>
          <p className="mt-3 max-w-md text-brand-100/80">
            Une plateforme CRM unique pour suivre, qualifier et résoudre les réclamations clients sur l'ensemble des concessions.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-100/90">
            <li className="flex items-center gap-3"><Network size={18} className="text-brand-200" /> Multi-sites : Douala, Yaoundé, Bafoussam, Bertoua, Garoua, Ngaoundéré</li>
            <li className="flex items-center gap-3"><BellRing size={18} className="text-brand-200" /> Escalade automatique et notifications</li>
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-brand-200" /> Accès sécurisé par rôle et par site</li>
          </ul>
        </div>
        <div className="relative text-xs text-brand-100/50">© {new Date().getFullYear()} CFAO Mobility Cameroon · Conçu par Junior MAMPE A BITEGNI</div>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo tone="dark" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
          <p className="mt-1 text-sm text-slate-500">Accédez à votre espace SAV.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="votreemail@cfao.com" />
            </Field>
            <Field label="Mot de passe">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </Field>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
