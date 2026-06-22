import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import ComplaintsPage from './pages/ComplaintsPage.tsx';
import NewComplaintPage from './pages/NewComplaintPage.tsx';
import ComplaintDetailPage from './pages/ComplaintDetailPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import type { Role } from './lib/types.ts';

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/complaints" element={<Protected><ComplaintsPage /></Protected>} />
      <Route path="/complaints/new" element={<Protected roles={['TELECONSEILLERE', 'ADMIN']}><NewComplaintPage /></Protected>} />
      <Route path="/complaints/:id" element={<Protected><ComplaintDetailPage /></Protected>} />
      <Route path="/admin/users" element={<Protected roles={['ADMIN']}><UsersPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
