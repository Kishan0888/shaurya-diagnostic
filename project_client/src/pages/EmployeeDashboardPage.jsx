import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const statusBadge = (s) => ({
  Present: 'badge-green', Late: 'badge-yellow', Absent: 'badge-red', 'Half Day': 'badge-gray',
})[s] || 'badge-gray';

export default function EmployeeDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/attendance/self/my')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Failed to load attendance');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async () => {
    setActLoading(true);
    try {
      await api.post('/attendance/self/checkin');
      toast.success('Checked in successfully');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Check-in failed'); }
    finally { setActLoading(false); }
  };

  const handleCheckOut = async () => {
    setActLoading(true);
    try {
      await api.post('/attendance/self/checkout');
      toast.success('Checked out successfully');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Check-out failed'); }
    finally { setActLoading(false); }
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  const today = data?.todayRecord;
  const canCheckIn = !today?.checkIn;
  const canCheckOut = today?.checkIn && !today?.checkOut;
  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Attendance</h1>
        <p className="text-sm text-slate-400">{todayDate}</p>
      </div>

      {/* Today's Status Card */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Clock size={16} /> Today's Status
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Status</p>
            {today ? (
              <span className={`${statusBadge(today.status)} text-sm px-3 py-1`}>{today.status}</span>
            ) : (
              <span className="badge-gray text-sm px-3 py-1">Not Marked</span>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Check In</p>
            <p className="font-semibold text-slate-700">{fmt(today?.checkIn)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Check Out</p>
            <p className="font-semibold text-slate-700">{fmt(today?.checkOut)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn || actLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle size={15} />
            {today?.checkIn ? 'Checked In ✓' : 'Check In'}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!canCheckOut || actLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle size={15} />
            {today?.checkOut ? 'Checked Out ✓' : 'Check Out'}
          </button>
        </div>

        {today?.checkIn && !today?.checkOut && (
          <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
            <Clock size={11} /> You are currently checked in. Don't forget to check out before leaving.
          </p>
        )}
        {today?.checkOut && (
          <p className="text-xs text-green-600 mt-3">✓ Attendance complete for today.</p>
        )}
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Calendar size={15} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">My Attendance History (Last 30 Days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Date', 'Check In', 'Check Out', 'Status'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {!data?.history?.length ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No attendance records found</td></tr>
              ) : data.history.map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="table-cell text-slate-600">{r.date}</td>
                  <td className="table-cell text-slate-600">{fmt(r.checkIn)}</td>
                  <td className="table-cell text-slate-600">{fmt(r.checkOut)}</td>
                  <td className="table-cell"><span className={statusBadge(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
