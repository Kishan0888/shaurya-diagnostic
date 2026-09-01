import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Users, FileText, Receipt, UserCheck, IndianRupee, UserX } from 'lucide-react';

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

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Loading dashboard...</div>;

  const s = data?.stats || {};
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">{today}</p>
        </div>
        <Link to="/patients/new" className="btn-primary">+ New Patient</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <StatCard icon={Users} label="Today's Patients" value={s.todayPatients} color="blue" />
        <StatCard icon={FileText} label="Reports Generated" value={s.reportsGenerated} color="green" />
        <StatCard icon={Receipt} label="Today's Invoices" value={s.todayInvoices} color="purple" />
        <StatCard icon={IndianRupee} label="Today's Revenue" value={s.todayRevenue ? `₹${s.todayRevenue.toLocaleString('en-IN')}` : '₹0'} color="teal" />
        <StatCard icon={UserCheck} label="Present Today" value={s.presentToday} color="orange" sub={`of ${s.totalEmployees} staff`} />
        <StatCard icon={UserX} label="Absent Today" value={s.absentToday} color="red" />
      </div>

      {/* Recent Patients */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-700">Today's Patients</h2>
          <Link to="/patients" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          {data?.recentActivity?.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No patients registered today</p>
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
                    <td className="table-cell text-slate-400">{new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
