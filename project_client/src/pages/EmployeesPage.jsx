import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, KeyRound, Eye, EyeOff } from 'lucide-react';

const EMPTY = { name: '', role: '', mobile: '', email: '', createLogin: false, password: '', confirmPassword: '' };

function Modal({ emp, onClose, onSave }) {
  const isEdit = Boolean(emp?._id);
  const [form, setForm] = useState(
    isEdit
      ? { name: emp.name, role: emp.role, mobile: emp.mobile, email: emp.email || '', createLogin: false, password: '', confirmPassword: '' }
      : { ...EMPTY }
  );
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  const alreadyHasLogin = isEdit && Boolean(emp?.userId);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (form.createLogin && !alreadyHasLogin) {
      if (!form.email) { toast.error('Email required for login access'); return; }
      if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        role: form.role,
        mobile: form.mobile,
        email: form.email,
      };
      if (form.createLogin && !alreadyHasLogin) {
        payload.createLogin = true;
        payload.password = form.password;
      }
      if (isEdit) {
        await api.put(`/employees/${emp._id}`, payload);
        toast.success('Employee updated');
      } else {
        const res = await api.post('/employees', payload);
        if (res.data.userCreated) toast.success('Employee added with login access');
        else toast.success('Employee added');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required value={form.name} onChange={set('name')} placeholder="Full name" />
          </div>
          <div>
            <label className="label">Role *</label>
            <input className="input" required value={form.role} onChange={set('role')} placeholder="e.g. Lab Technician, Receptionist" />
          </div>
          <div>
            <label className="label">Mobile *</label>
            <input className="input" required value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" />
          </div>
          <div>
            <label className="label">Email {!isEdit && form.createLogin ? '*' : ''}</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="employee@example.com" />
          </div>

          {/* Create Login Access */}
          {!alreadyHasLogin && (
            <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.createLogin}
                  onChange={setCheck('createLogin')}
                  className="w-4 h-4 accent-blue-700"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600" />
                  Create Login Access
                </span>
              </label>
              {form.createLogin && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="label">Password *</label>
                    <div className="relative">
                      <input
                        className="input pr-9"
                        type={showPw ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="Min 6 characters"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm Password *</label>
                    <input
                      className="input"
                      type="password"
                      required
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      placeholder="Re-enter password"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Login role will be set based on employee role. Admin can change it in User Management.
                  </p>
                </div>
              )}
            </div>
          )}

          {alreadyHasLogin && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <KeyRound size={13} /> Login access already configured for this employee.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Employee'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(null);

  const load = () => api.get('/employees').then(r => setEmployees(r.data.employees)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this employee? Their login will also be disabled.')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deactivated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5">
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
      Employees
    </h1>
    <p className="text-sm text-slate-400">
      {employees.length} staff members
    </p>
  </div>

  <button
    onClick={() => setModal('new')}
    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
  >
    <Plus size={16} />
    Add Employee
  </button>
</div>

      <div className="card overflow-hidden">
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              {['Employee ID', 'Name', 'Role', 'Mobile', 'Email', 'Login', 'Actions'].map(h => (
                <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No employees found</td></tr>
            ) : employees.map(e => (
              <tr key={e._id} className="hover:bg-slate-50">
                <td className="table-cell"><span className="badge-blue">{e.employeeId}</span></td>
                <td className="table-cell font-medium text-slate-700">{e.name}</td>
                <td className="table-cell text-slate-500">{e.role}</td>
                <td className="table-cell text-slate-500">{e.mobile}</td>
                <td className="table-cell text-slate-400 text-sm">{e.email || '—'}</td>
                <td className="table-cell">
                  {e.userId ? (
                    <span className={e.userId.isActive ? 'badge-green' : 'badge-red'}>
                      {e.userId.isActive ? 'Active' : 'Disabled'}
                    </span>
                  ) : (
                    <span className="badge-gray">No Login</span>
                  )}
                </td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModal(e)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(e._id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                      title="Deactivate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
      </div>

{/* Mobile Employee Cards */}
<div className="md:hidden space-y-3 p-3">
  {employees.length === 0 ? (
    <div className="text-center py-8 text-slate-400">
      No employees found
    </div>
  ) : (
    employees.map((e) => (
      <div
        key={e._id}
        className="rounded-xl border bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="badge-blue">{e.employeeId}</span>

          {e.userId ? (
            <span className={e.userId.isActive ? "badge-green" : "badge-red"}>
              {e.userId.isActive ? "Active" : "Disabled"}
            </span>
          ) : (
            <span className="badge-gray">No Login</span>
          )}
        </div>

        <h3 className="font-bold text-lg text-slate-800">
          {e.name}
        </h3>

        <p className="text-sm text-slate-500">{e.role}</p>

        <div className="mt-3 space-y-2 text-sm">
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="text-slate-400">Mobile</span>

            <a
              href={`tel:${e.mobile}`}
              className="text-blue-600 font-medium"
            >
              {e.mobile}
            </a>
          </div>

          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="text-slate-400">Email</span>

            <span className="break-words">
              {e.email || "—"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <button
            onClick={() => setModal(e)}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition"
          >
            <Pencil size={18} />
          </button>

          <button
            onClick={() => handleDelete(e._id)}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center active:scale-95 transition"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    ))
  )}
</div>

      {modal && (
        <Modal
          emp={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
