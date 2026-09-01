import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, X, KeyRound, Eye, EyeOff } from 'lucide-react';

const ROLES = ['admin', 'reception', 'lab_staff'];
const EMPTY = { name: '', email: '', password: '', role: 'reception' };

function CreateModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/users', form);
      toast.success('User created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Create User</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required value={form.email} onChange={set('email')} /></div>
          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-9" required minLength={6} value={form.password} onChange={set('password')} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={set('role')}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">{loading ? 'Creating...' : 'Create User'}</button>
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (pw.length < 6) { toast.error('Minimum 6 characters'); return; }
    setLoading(true);
    try {
      await api.post(`/auth/users/${user._id}/reset-password`, { newPassword: pw });
      toast.success(`Password reset for ${user.name}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <KeyRound size={15} className="text-blue-600" /> Reset Password
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">Resetting password for <strong>{user.name}</strong></p>
          <div>
            <label className="label">New Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-9" required minLength={6}
                value={pw} onChange={e => setPw(e.target.value)} placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Resetting...' : 'Reset Password'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const load = () => api.get('/auth/users').then(r => setUsers(r.data.users)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/auth/users/${id}`, { isActive: !current });
      toast.success(`User ${!current ? 'enabled' : 'disabled'}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const roleBadge = (r) => ({ admin: 'badge-blue', reception: 'badge-green', lab_staff: 'badge-yellow' })[r] || 'badge-gray';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
      User Management
    </h1>
    <p className="text-sm text-slate-400">
      {users.length} registered users
    </p>
  </div>

  <button
    onClick={() => setShowCreate(true)}
    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
  >
    <Plus size={16} />
    Create User
  </button>
</div>

      <div className="card overflow-hidden">
       <div className="hidden md:block overflow-x-auto">
  <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Name', 'Email', 'Role', 'Linked Employee', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-700">{u.name}</td>
                  <td className="table-cell text-slate-500 text-sm">{u.email}</td>
                  <td className="table-cell">
                    <span className={roleBadge(u.role)}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td className="table-cell text-slate-500 text-sm">
                    {u.employeeId ? (
                      <span className="flex items-center gap-1">
                        <span className="badge-blue text-xs">{u.employeeId.employeeId}</span>
                        {u.employeeId.name}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-slate-400 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => setResetTarget(u)}
                        className="text-xs px-2 py-1 rounded font-medium text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => toggleActive(u._id, u.isActive)}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                          u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>
{/* Mobile User Cards */}
<div className="md:hidden space-y-3 p-3">
  {users.length === 0 ? (
    <div className="text-center py-8 text-slate-400">
      No users found
    </div>
  ) : (
    users.map((u) => (
      <div
        key={u._id}
        className="rounded-xl border bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <span className={roleBadge(u.role)}>
            {u.role.replace("_", " ")}
          </span>

          <span className={u.isActive ? "badge-green" : "badge-red"}>
            {u.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <h3 className="font-bold text-lg text-slate-800">
          {u.name}
        </h3>

        <a
          href={`mailto:${u.email}`}
          className="text-sm text-blue-600 break-all"
        >
          {u.email}
        </a>

        <div className="mt-3 space-y-2 text-sm">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <span className="text-slate-400">Employee</span>

            <span className="break-words">
              {u.employeeId ? (
                <>
                  <span className="badge-blue text-xs mr-2">
                    {u.employeeId.employeeId}
                  </span>

                  {u.employeeId.name}
                </>
              ) : (
                "Not linked"
              )}
            </span>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-3">
            <span className="text-slate-400">Created</span>

            <span>
              {new Date(u.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t">
          <button
            onClick={() => setResetTarget(u)}
            className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 font-medium active:scale-95 transition"
          >
            Reset PW
          </button>

          <button
            onClick={() => toggleActive(u._id, u.isActive)}
            className={`w-full py-2 rounded-xl font-medium active:scale-95 transition ${
              u.isActive
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            {u.isActive ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
    ))
  )}
</div>
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); load(); }} />
      )}
      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={() => { setResetTarget(null); load(); }} />
      )}
    </div>
  );
}
