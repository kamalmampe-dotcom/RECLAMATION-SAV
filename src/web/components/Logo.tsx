import { useState } from 'react';

/**
 * Logo CFAO Mobility.
 *
 * 1) Si tu déposes le vrai logo dans `public/logo.png` (ou .svg), il est utilisé
 *    automatiquement (affiché sur une plaque blanche sur fond sombre pour rester
 *    lisible).
 * 2) Sinon, un logotype typographique « cfao MOBILITY » fidèle à la marque est
 *    rendu (navy + rouge), adapté au fond clair ou sombre.
 *
 * `tone='light'` = posé sur un fond SOMBRE (sidebar, panneau login).
 * `tone='dark'`  = posé sur un fond CLAIR.
 */
export function Logo({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [imgOk, setImgOk] = useState(true);

  // 1) Vrai fichier logo s'il est présent.
  if (imgOk) {
    const img = <img src="/logo.png" alt="CFAO Mobility" className="h-8 w-auto" onError={() => setImgOk(false)} />;
    return tone === 'light' ? (
      <div className="inline-flex rounded-md bg-white px-2.5 py-1.5 shadow-sm">{img}</div>
    ) : (
      img
    );
  }

  // 2) Logotype typographique de repli.
  const cfaoColor = tone === 'light' ? 'text-white' : 'text-brand-900';
  const mobilityColor = tone === 'light' ? 'text-rose-300' : 'text-rose-600';
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative inline-flex h-7 w-7 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500 to-red-600" />
        <span className="absolute h-3 w-3 rounded-full bg-rose-900/40" style={{ left: 4, top: 5 }} />
      </span>
      <span className="inline-flex flex-col items-end leading-none">
        <span className={`block text-2xl font-extrabold lowercase tracking-tight ${cfaoColor}`}>cfao</span>
        <span className={`-mr-[0.18em] block text-[9px] font-bold uppercase tracking-[0.3em] ${mobilityColor}`}>Mobility</span>
      </span>
    </div>
  );
}
