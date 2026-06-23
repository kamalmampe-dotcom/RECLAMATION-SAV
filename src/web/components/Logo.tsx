import { useState } from 'react';

/**
 * Logo CFAO.
 * Affiche le vrai logo s'il est fourni dans `public/logo.svg` (ou .png),
 * sinon un monogramme premium « CF ». Pour mettre ton logo : dépose le fichier
 * dans `public/logo.svg` à la racine du projet.
 */
export function Logo({ tone = 'light', withWordmark = true }: { tone?: 'light' | 'dark'; withWordmark?: boolean }) {
  const [imgOk, setImgOk] = useState(true);
  const wordmarkColor = tone === 'light' ? 'text-white' : 'text-slate-900';
  const subColor = tone === 'light' ? 'text-white/70' : 'text-slate-500';

  return (
    <div className="flex items-center gap-3">
      {imgOk ? (
        <img src="/logo.svg" alt="CFAO" className="h-9 w-auto" onError={() => setImgOk(false)} />
      ) : (
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold tracking-tight ${
            tone === 'light' ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm'
          }`}
        >
          CF
        </div>
      )}
      {withWordmark && (
        <div className="leading-tight">
          <div className={`text-sm font-semibold ${wordmarkColor}`}>CFAO Mobility Cameroon</div>
          <div className={`text-xs ${subColor}`}>Gestion des réclamations CRM</div>
        </div>
      )}
    </div>
  );
}
