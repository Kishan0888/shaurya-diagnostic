import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (date) params.date = date;
      const res = await api.get('/patients', { params });
      setPatients(res.data.patients);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [page, search, date]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this patient?')) return;
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Patient deleted');
      fetchPatients();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5">
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
      Patients
    </h1>
    <p className="text-sm text-slate-400">{total} total records</p>
  </div>

  <Link
    to="/patients/new"
    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
  >
    <Plus size={16} />
    Add Patient
  </Link>
</div>

      {/* Filters */}
      <div className="card p-4">
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3">
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        className="input pl-9 w-full"
        placeholder="Search name, ID, mobile, test..."
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
    </div>

    <input
      type="date"
      className="input w-full"
      value={date}
      onChange={e => {
        setDate(e.target.value);
        setPage(1);
      }}
    />

    {(search || date) && (
      <button
        className="btn-secondary w-full sm:w-auto"
        onClick={() => {
          setSearch('');
          setDate('');
          setPage(1);
        }}
      >
        Clear
      </button>
    )}
  </div>
</div>

      <div className="card overflow-hidden">
<div className="hidden md:block overflow-x-auto">
    <table className="min-w-[950px] w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Patient ID', 'Name', 'Age/Gender', 'Mobile', 'Test', 'Doctor', 'Date', 'Invoice', 'Actions'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No patients found</td></tr>
              ) : patients.map(p => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="table-cell"><span className="badge-blue">{p.patientId}</span></td>
                  <td className="table-cell font-medium text-slate-800">{p.name}</td>
                  <td className="table-cell text-slate-500">{p.age}y / {p.gender[0]}</td>
                  <td className="table-cell text-slate-500">{p.mobile}</td>
                  <td className="table-cell text-slate-700 max-w-[140px] truncate">{p.testName}</td>
                  <td className="table-cell text-slate-500 max-w-[120px] truncate">{p.referringDoctor}</td>
                  <td className="table-cell text-slate-400 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell">
                    {p.invoiceId ? <span className="badge-green">Billed</span> : <span className="badge-gray">Pending</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap items-center gap-1">
                      <button onClick={() => navigate(`/patients/${p._id}`)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Eye size={14} /></button>
                      <button onClick={() => navigate(`/patients/${p._id}/edit`)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

{/* Mobile Patient Cards */}
<div className="md:hidden space-y-3 p-3">
  {loading ? (
    <div className="text-center py-8 text-slate-400">Loading...</div>
  ) : patients.length === 0 ? (
    <div className="text-center py-8 text-slate-400">
      No patients found
    </div>
  ) : (
    patients.map((p) => (
      <div key={p._id} className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="badge-blue">{p.patientId}</span>
          {p.invoiceId ? (
            <span className="badge-green">Billed</span>
          ) : (
            <span className="badge-gray">Pending</span>
          )}
        </div>

        <h3 className="font-semibold text-slate-800">{p.name}</h3>
        <p className="text-sm text-slate-500">
          {p.age}y / {p.gender[0]}
        </p>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Mobile</span>
            <span>{p.mobile}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Test</span>
            <span className="text-right">{p.testName}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Doctor</span>
            <span className="text-right">{p.referringDoctor}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Date</span>
            <span>
              {new Date(p.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <button
            onClick={() => navigate(`/patients/${p._id}`)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600"
          >
            <Eye size={18} />
          </button>

          <button
            onClick={() => navigate(`/patients/${p._id}/edit`)}
            className="p-2 rounded-lg bg-slate-100 text-slate-600"
          >
            <Pencil size={18} />
          </button>

          <button
            onClick={() => handleDelete(p._id)}
            className="p-2 rounded-lg bg-red-50 text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    ))
  )}
</div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-slate-50">
          <p className="text-xs text-slate-500">
            Page {page} of {pages}
          </p>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary flex-1 sm:flex-none py-1 px-3 disabled:opacity-40"
            >
              Prev
            </button>

            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary flex-1 sm:flex-none py-1 px-3 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
