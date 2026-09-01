import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientFormPage from './pages/PatientFormPage';
import PatientDetailPage from './pages/PatientDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import AttendancePage from './pages/AttendancePage';
import EmployeesPage from './pages/EmployeesPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Role-based default dashboard */}
        <Route index element={
          user?.role === 'lab_staff'
            ? <EmployeeDashboardPage />
            : <DashboardPage />
        } />

        {/* Admin + Reception only */}
        <Route path="patients" element={<ProtectedRoute roles={['admin','reception']}><PatientsPage /></ProtectedRoute>} />
        <Route path="patients/new" element={<ProtectedRoute roles={['admin','reception']}><PatientFormPage /></ProtectedRoute>} />
        <Route path="patients/:id" element={<ProtectedRoute roles={['admin','reception']}><PatientDetailPage /></ProtectedRoute>} />
        <Route path="patients/:id/edit" element={<ProtectedRoute roles={['admin','reception']}><PatientFormPage /></ProtectedRoute>} />
        <Route path="invoices" element={<ProtectedRoute roles={['admin','reception']}><InvoicesPage /></ProtectedRoute>} />

        {/* Attendance — admin+reception see full page; lab_staff see employee view */}
        <Route path="attendance" element={
          user?.role === 'lab_staff'
            ? <EmployeeDashboardPage />
            : <ProtectedRoute roles={['admin','reception']}><AttendancePage /></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="employees" element={<ProtectedRoute roles={['admin']}><EmployeesPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
