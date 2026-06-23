import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, PlusCircle, Users, BarChart3, LogOut, Menu, X, KeyRound, MapPin } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.tsx';
import { ROLE_LABELS } from '../lib/labels.ts';
import type { Role } from '../lib/types.ts';
import { ChangePasswordModal } from './ChangePasswordModal.tsx';
import { Logo } from './Logo.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: Role[]; // si absent : tous les rôles
}

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
  { to: '/complaints/new', label: 'Nouvelle réclamation', icon: <PlusCircle size={18} />, roles: ['TELECONSEILLERE', 'ADMIN'] },
  { to: '/complaints', label: 'Réclamations', icon: <ListChecks size={18} /> },
  { to: '/kpi', label: 'Pilotage (KPI)', icon: <BarChart3 size={18} />, roles: ['ADMIN', 'DIRECTION', 'RESPONSABLE_SAV'] },
  { to: '/admin/users', label: 'Utilisateurs', icon: <Users size={18} />, roles: ['ADMIN'] },
];

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-white">
      <div className="px-5 py-5">
        <Logo tone="light" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/12 text-white' : 'text-brand-100/80 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r bg-white/90" style={{ width: 3 }} />}
                {item.icon}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="m-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">{initials(user.fullName)}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.fullName}</div>
            <div className="truncate text-xs text-brand-100/70">{ROLE_LABELS[user.role]}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar fixe (desktop) */}
      <aside className="hidden w-64 shrink-0 md:block">{sidebar}</aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <button onClick={() => setMenuOpen(false)} className="absolute right-2 top-3 z-10 rounded-lg p-2 text-white/80 hover:bg-white/10" aria-label="Fermer le menu">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <MapPin size={13} /> {user?.site?.city ?? 'Réseau national'}
            </span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setPwdOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Changer le mot de passe">
              <KeyRound size={16} /> <span className="hidden sm:inline">Mot de passe</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Déconnexion">
              <LogOut size={16} /> <span className="hidden sm:inline">Quitter</span>
            </button>
            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-semibold text-white" title={user?.fullName}>
              {initials(user?.fullName)}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
}
