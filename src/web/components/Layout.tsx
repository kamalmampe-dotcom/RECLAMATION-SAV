import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, PlusCircle, Users, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.tsx';
import { ROLE_LABELS } from '../lib/labels.ts';
import type { Role } from '../lib/types.ts';

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
  { to: '/admin/users', label: 'Utilisateurs', icon: <Users size={18} />, roles: ['ADMIN'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">CF</div>
          <div>
            <div className="text-sm font-semibold leading-tight">CFAO Automotive</div>
            <div className="text-xs text-slate-500">SAV / Réclamations</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">{user?.site?.city ? `Site : ${user.site.city}` : 'Réseau national'}</div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{user?.fullName}</div>
              <div className="text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" title="Déconnexion">
              <LogOut size={16} /> Quitter
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
