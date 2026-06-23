import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.ts';

interface NpsState {
  reference: string;
  responded: boolean;
  score: number | null;
}

export default function NpsPage() {
  const { id = '' } = useParams();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['nps', id],
    queryFn: () => api.get<{ survey: NpsState }>(`/api/nps/${id}`),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: () => api.post(`/api/nps/${id}`, { score, comment: comment || undefined }),
    onSuccess: () => { setError(null); setDone(true); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Envoi impossible'),
  });

  const Shell = ({ children }: { children: ReactNode }) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-800">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white">CF</div>
          <div className="text-sm font-semibold">CFAO Mobility Cameroon · Satisfaction</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (isLoading) return <Shell><p className="text-sm text-slate-500">Chargement…</p></Shell>;
  if (isError || !data) return <Shell><p className="text-sm text-red-600">Lien invalide ou enquête introuvable.</p></Shell>;

  const survey = data.survey;
  if (done || survey.responded) {
    return (
      <Shell>
        <h1 className="mb-2 text-lg font-semibold">Merci pour votre retour</h1>
        <p className="text-sm text-slate-600">Votre évaluation pour la réclamation {survey.reference} a bien été enregistrée.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-1 text-lg font-semibold">Votre avis sur le dossier {survey.reference}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Quelle est la probabilité que vous recommandiez nos services à un proche ? (0 = pas du tout, 10 = tout à fait)
      </p>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`rounded-md py-2 text-sm font-medium transition ${
              score === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Un commentaire (facultatif)"
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <button
        disabled={score === null || mut.isPending}
        onClick={() => mut.mutate()}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mut.isPending ? 'Envoi…' : 'Envoyer mon évaluation'}
      </button>
    </Shell>
  );
}
