import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Users, FileText, Receipt, UserCheck, IndianRupee, UserX, Wallet, AlertCircle, CalendarDays } from 'lucide-react';
import { inr } from '../utils/invoice';

// ---------- Date helpers (local / IST) ----------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDate = (s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts);
};

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'lastweek', label: 'Last Week' },
  { key: 'mtd', label: 'Month to Date' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'month', label: 'Select Month' },
  { key: 'custom', label: 'Custom' },
];

function rangeForPreset(key, month, custom) {
  const now = new Date();
  switch (key) {
    case 'yesterday': { const y = ymd(addDays(now, -1)); return { from: y, to: y }; }
    case 'last7': return { from: ymd(addDays(now, -6)), to: ymd(now) };
    case 'lastweek': {
      // Previous Monday → Sunday
      const dow = (now.getDay() + 6) % 7; // Monday = 0
      const thisMon = addDays(now, -dow);
      return { from: ymd(addDays(thisMon, -7)), to: ymd(addDays(thisMon, -1)) };
    }
    case 'mtd': return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
    case 'lastmonth': return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
    case 'month': {
      const [y, m] = month.split('-').map(Number);
      const last = new Date(y, m, 0);
      const to = last > now ? now : last;
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(to) };
    }
    case 'custom': return { from: custom.from, to: custom.to };
    default: { const t = ymd(now); return { from: t, to: t }; }
  }
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('today');
  const [month, setMonth] = useState(() => ymd(new Date()).slice(0, 7));
  const [custom, setCustom] = useState(() => { const t = ymd(new Date()); return { from: t, to: t }; });

  const range = useMemo(() => rangeForPreset(preset, month, custom), [preset, month, custom]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    if (range.from > range.to) { toast.error('From date cannot be after To date'); return; }
    setLoading(true);
    api.get('/dashboard', { params: range })
      .then(r => setData(r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [range]);

  const s = data?.stats || {};
  const todayStr = ymd(new Date());
  const isToday = range.from === todayStr && range.to === todayStr;
  const isSingleDay = range.from === range.to;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const rangeLabel = !range.from ? '' : isSingleDay
    ? fmtDate(range.from)
    : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;
  const daily = [...(data?.daily || [])].reverse();

  return (
    <div className="space-y-6">
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">{today}</p>
        </div>
        <Link to="/patients/new" className="btn-primary">+ New Patient</Link>
      </div>

      {/* Date filter */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays size={16} className="text-blue-600" />
          <span className="font-medium">Showing:</span>
          <span className="text-slate-800 font-semibold">{rangeLabel}</span>
          {loading && <span className="text-xs text-slate-400">Loading…</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                preset === p.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'month' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Month:</label>
            <input type="month" className="input w-full sm:w-48" value={month} max={todayStr.slice(0, 7)}
              onChange={e => e.target.value && setMonth(e.target.value)} />
          </div>
        )}
        {preset === 'custom' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm text-slate-500">From:</label>
            <input type="date" className="input w-full sm:w-44" value={custom.from} max={todayStr}
              onChange={e => e.target.value && setCustom(c => ({ ...c, from: e.target.value }))} />
            <label className="text-sm text-slate-500">To:</label>
            <input type="date" className="input w-full sm:w-44" value={custom.to} max={todayStr}
              onChange={e => e.target.value && setCustom(c => ({ ...c, to: e.target.value }))} />
          </div>
        )}
      </div>

      {!data && loading ? (
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      ) : (
      <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={IndianRupee} label="Total Sales" value={inr(s.totalSales)} color="teal"
          sub={s.totalDiscount > 0 ? `Gross ${inr(s.grossAmount)} − Disc ${inr(s.totalDiscount)}` : 'Net billed amount'} />
        <StatCard icon={Wallet} label="Amount Collected" value={inr(s.amountCollected)} color="green" />
        <StatCard icon={AlertCircle} label="Balance Due" value={inr(s.balanceDue)} color="red" />
        <StatCard icon={Users} label={isToday ? "Today's Patients" : 'Total Patients'} value={s.totalPatients} color="blue" />
        <StatCard icon={FileText} label="Reports Generated" value={s.reportsGenerated} color="green" />
        <StatCard icon={Receipt} label={isToday ? "Today's Invoices" : 'Invoices'} value={s.totalInvoices} color="purple" />
        <StatCard icon={UserCheck} label={isToday ? 'Present Today' : isSingleDay ? 'Present' : 'Staff Present (Total)'} value={s.presentCount} color="orange"
          sub={isSingleDay ? `of ${s.totalEmployees ?? 0} staff` : `Avg ${s.avgPresentPerDay ?? 0}/day of ${s.totalEmployees ?? 0} staff`} />
        {isSingleDay && (
          <StatCard icon={UserX} label={isToday ? 'Absent Today' : 'Absent'} value={s.absentCount} color="red" />
        )}
      </div>

      {/* Day-wise breakdown */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-700">Day-wise Summary</h2>
          <span className="text-xs text-slate-400">{data?.range?.days || 0} day(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Date', 'Patients', 'Reports', 'Invoices', 'Total Amount', 'Discount', 'Sales (Net)', 'Collected', 'Due', 'Present'].map(h => (
                  <th key={h} className={`table-cell text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === 'Date' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {daily.map(r => (
                <tr key={r.date} className={`hover:bg-slate-50 ${r.date === todayStr ? 'bg-blue-50/40' : ''}`}>
                  <td className="table-cell text-slate-700 whitespace-nowrap">{fmtDate(r.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="table-cell text-right">{r.patients}</td>
                  <td className="table-cell text-right">{r.reports}</td>
                  <td className="table-cell text-right">{r.invoices}</td>
                  <td className="table-cell text-right">{inr(r.grossAmount)}</td>
                  <td className="table-cell text-right text-red-500">{r.discount > 0 ? `-${inr(r.discount)}` : '—'}</td>
                  <td className="table-cell text-right font-semibold text-slate-800">{inr(r.sales)}</td>
                  <td className="table-cell text-right text-green-700">{inr(r.collected)}</td>
                  <td className={`table-cell text-right ${r.due > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{inr(r.due)}</td>
                  <td className="table-cell text-right">{r.present}</td>
                </tr>
              ))}
            </tbody>
            {daily.length > 1 && (
              <tfoot>
                <tr className="bg-slate-50 border-t font-semibold text-slate-800">
                  <td className="table-cell">Total</td>
                  <td className="table-cell text-right">{s.totalPatients}</td>
                  <td className="table-cell text-right">{s.reportsGenerated}</td>
                  <td className="table-cell text-right">{s.totalInvoices}</td>
                  <td className="table-cell text-right">{inr(s.grossAmount)}</td>
                  <td className="table-cell text-right text-red-500">{s.totalDiscount > 0 ? `-${inr(s.totalDiscount)}` : '—'}</td>
                  <td className="table-cell text-right">{inr(s.totalSales)}</td>
                  <td className="table-cell text-right text-green-700">{inr(s.amountCollected)}</td>
                  <td className="table-cell text-right text-red-600">{inr(s.balanceDue)}</td>
                  <td className="table-cell text-right">{s.presentCount}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Recent Patients */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-700">{isToday ? "Today's Patients" : 'Recent Patients (selected period)'}</h2>
          <Link to="/patients" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          {data?.recentActivity?.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">{isToday ? 'No patients registered today' : 'No patients registered in this period'}</p>
          ) : (
           <table className="min-w-[600px] w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient ID</th>
                  <th className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                  <th className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.recentActivity?.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="table-cell"><span className="badge-blue">{p.patientId}</span></td>
                    <td className="table-cell font-medium text-slate-700">{p.name}</td>
                    <td className="table-cell text-slate-500">{p.testName}</td>
                    <td className="table-cell text-slate-400">{isToday ? '' : `${new Date(p.createdAt).toLocaleDateString('en-IN')} `}{new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
