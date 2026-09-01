import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Receipt,
  ClipboardList, UserCog, LogOut, Activity, Stethoscope,
} from 'lucide-react';

// Nav items per role
const adminNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/employees', label: 'Employees', icon: UserCog },
  { to: '/users', label: 'User Management', icon: Activity },
];

const receptionNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
];

const labStaffNav = [
  { to: '/', label: 'My Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/attendance', label: 'My Attendance', icon: ClipboardList },
];

const navByRole = { admin: adminNav, reception: receptionNav, lab_staff: labStaffNav };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navByRole[user?.role] || receptionNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Shaurya Diagnostic</p>
            <p className="text-blue-300 text-xs">Centre</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-blue-300 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-blue-300 hover:text-white text-xs w-full transition-colors">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
