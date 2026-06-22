import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, PlusCircle, Users, BarChart3, LogOut, Menu, X, KeyRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.tsx';
import { ROLE_LABELS } from '../lib/labels.ts';
import type { Role } from '../lib/types.ts';
import { ChangePasswordModal } from './ChangePasswordModal.tsx';

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

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">CF</div>
      <div>
        <div className="text-sm font-semibold leading-tight">CFAO Automotive</div>
        <div className="text-xs text-slate-500">SAV / Réclamations</div>
      </div>
    </div>
  );
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

  const navList = (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar fixe (desktop) */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <Brand />
        {navList}
      </aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer le menu">
                <X size={20} />
              </button>
            </div>
            {navList}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm text-slate-500">{user?.site?.city ? `Site : ${user.site.city}` : 'Réseau national'}</div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{user?.fullName}</div>
              <div className="text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</div>
            </div>
            <button onClick={() => setPwdOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Changer le mot de passe">
              <KeyRound size={16} /> <span className="hidden sm:inline">Mot de passe</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Déconnexion">
              <LogOut size={16} /> <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
}
