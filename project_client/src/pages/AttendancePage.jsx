import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, Download, FileText } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const statusBadge = (s) => ({ Present: 'badge-green', Absent: 'badge-red', Late: 'badge-yellow', 'Half Day': 'badge-gray' })[s] || 'badge-gray';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AttendancePage() {
  const [todayData, setTodayData] = useState({ records: [], absentees: [], presentCount: 0, lateCount: 0, absentCount: 0 });
  const [monthly, setMonthly] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ presentCount: 0, lateCount: 0, absentCount: 0 });
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState('today');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterEmp, setFilterEmp] = useState('');
  const [selEmp, setSelEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');

  const loadToday = () => api.get('/attendance/today').then(r => setTodayData(r.data)).catch(() => {});
  const loadEmployees = () => api.get('/employees').then(r => setEmployees(r.data.employees)).catch(() => {});

  useEffect(() => { loadToday(); loadEmployees(); }, []);

  const loadMonthly = useCallback(() => {
    const params = { month, year };
    if (filterEmp) params.employeeId = filterEmp;
    api.get('/attendance/monthly', { params })
      .then(r => { setMonthly(r.data.records); setMonthlyStats(r.data.stats || {}); })
      .catch(() => {});
  }, [month, year, filterEmp]);

  useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);

  const handleCheckIn = async () => {
    if (!selEmp) { toast.error('Select an employee'); return; }
    setLoading(true);
    try {
      await api.post('/attendance/checkin', { employeeId: selEmp });
      toast.success('Checked in'); loadToday();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!selEmp) { toast.error('Select an employee'); return; }
    setLoading(true);
    try {
      await api.post('/attendance/checkout', { employeeId: selEmp });
      toast.success('Checked out'); loadToday();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const params = { month, year };
      if (filterEmp) params.employeeId = filterEmp;
      const res = await api.get(`/attendance/export/${type}`, {
        params,
        responseType: 'blob',
      });
      const mname = MONTHS[month - 1];
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      const mime = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance-${mname}-${year}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Attendance</h1>

      {/* Mark Attendance */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Clock size={16} /> Mark Attendance</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[220px]">
            <label className="label">Select Employee</label>
            <select className="input" value={selEmp} onChange={e => setSelEmp(e.target.value)}>
              <option value="">-- Select --</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
            </select>
          </div>
          <button onClick={handleCheckIn} disabled={loading} className="btn-primary flex items-center gap-2">
            <CheckCircle size={15} /> Check In
          </button>
          <button onClick={handleCheckOut} disabled={loading} className="btn-secondary flex items-center gap-2">
            <XCircle size={15} /> Check Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[['today', "Today's Attendance"], ['monthly', 'Monthly Report']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Present', value: todayData.presentCount, cls: 'text-green-600' },
              { label: 'Late', value: todayData.lateCount, cls: 'text-yellow-600' },
              { label: 'Absent', value: todayData.absentCount, cls: 'text-red-600' },
              { label: 'Total Staff', value: employees.length, cls: 'text-slate-700' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Present table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Present / Checked In</p>
            </div>
            <table className="w-full">
              <thead><tr className="border-b">
                {['Employee', 'Role', 'Check In', 'Check Out', 'Status'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y">
                {todayData.records?.filter(r => r.checkIn).map(r => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="table-cell font-medium text-slate-700">{r.employeeId?.name}</td>
                    <td className="table-cell text-slate-500">{r.employeeId?.role}</td>
                    <td className="table-cell text-slate-600">{fmt(r.checkIn)}</td>
                    <td className="table-cell text-slate-600">{fmt(r.checkOut)}</td>
                    <td className="table-cell"><span className={statusBadge(r.status)}>{r.status}</span></td>
                  </tr>
                ))}
                {!todayData.records?.filter(r => r.checkIn).length && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No check-ins recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {todayData.absentees?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b bg-red-50">
                <p className="text-sm font-semibold text-red-700">Absent Today</p>
              </div>
              <table className="w-full">
                <tbody className="divide-y">
                  {todayData.absentees.map(e => (
                    <tr key={e._id} className="hover:bg-slate-50">
                      <td className="table-cell font-medium text-slate-700">{e.name}</td>
                      <td className="table-cell text-slate-500">{e.role}</td>
                      <td className="table-cell"><span className="badge-red">Absent</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="space-y-4">
          {/* Filters + Export */}
          <div className="card p-4 flex flex-wrap gap-3 items-end justify-between">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Month</label>
                <select className="input w-36" value={month} onChange={e => { setMonth(Number(e.target.value)); }}>
                  {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input type="number" className="input w-24" value={year} onChange={e => setYear(Number(e.target.value))} min="2020" max="2099" />
              </div>
              <div className="min-w-[180px]">
                <label className="label">Employee Filter</label>
                <select className="input" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                  <option value="">All Employees</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport('excel')} disabled={!!exporting} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Download size={13} /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
              </button>
              <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="btn-secondary flex items-center gap-1.5 text-sm">
                <FileText size={13} /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>

          {/* Monthly stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Present', value: monthlyStats.presentCount, cls: 'text-green-600' },
              { label: 'Late', value: monthlyStats.lateCount, cls: 'text-yellow-600' },
              { label: 'Absent', value: monthlyStats.absentCount, cls: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b">
                {['Date', 'Employee', 'Role', 'Check In', 'Check Out', 'Status'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y">
                {monthly.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No records for this period</td></tr>
                ) : monthly.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="table-cell text-slate-500 text-xs">{r.date}</td>
                    <td className="table-cell font-medium text-slate-700">{r.employeeId?.name}</td>
                    <td className="table-cell text-slate-500">{r.employeeId?.role}</td>
                    <td className="table-cell">{fmt(r.checkIn)}</td>
                    <td className="table-cell">{fmt(r.checkOut)}</td>
                    <td className="table-cell"><span className={statusBadge(r.status)}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
