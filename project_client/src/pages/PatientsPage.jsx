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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-400">{total} total records</p>
        </div>
        <Link to="/patients/new" className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Patient</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, ID, mobile, test..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <input type="date" className="input w-44" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} />
        {(search || date) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setDate(''); setPage(1); }}>Clear</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
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
                    <div className="flex items-center gap-1">
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
            <p className="text-xs text-slate-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
