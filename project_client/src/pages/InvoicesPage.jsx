import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Download, Printer } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (date) params.date = date;
      const [inv, stat] = await Promise.all([api.get('/invoices', { params }), api.get('/invoices/stats/today')]);
      setInvoices(inv.data.invoices);
      setPages(inv.data.pages);
      setStats(stat.data);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [page, date]);

  useEffect(() => { fetch(); }, [fetch]);

  const download = async (id, num) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${num}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const print = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const w = window.open(url);
      w?.addEventListener('load', () => w.print());
    } catch { toast.error('Print failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Invoices</h1>
        <div className="flex gap-3 text-sm">
          <span className="badge-green">Today: {stats.count || 0} invoices</span>
          <span className="badge-blue">Revenue: ₹{stats.total?.toLocaleString('en-IN') || '0'}</span>
        </div>
      </div>

      <div className="card p-4 flex gap-3 items-center">
        <label className="text-sm text-slate-500">Filter by date:</label>
        <input type="date" className="input w-44" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} />
        {date && <button className="btn-secondary text-sm" onClick={() => setDate('')}>Clear</button>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              {['Invoice No', 'Patient', 'Test', 'Amount', 'Discount', 'Net', 'Payment', 'Date', 'Actions'].map(h => (
                <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No invoices found</td></tr>
            ) : invoices.map(inv => {
              const net = inv.amount - (inv.discount || 0);
              return (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="table-cell"><span className="badge-blue text-xs">{inv.invoiceNumber}</span></td>
                  <td className="table-cell">
                    <p className="font-medium text-slate-700 text-sm">{inv.patientId?.name}</p>
                    <p className="text-xs text-slate-400">{inv.patientId?.patientId}</p>
                  </td>
                  <td className="table-cell text-slate-600 text-sm max-w-[140px] truncate">{inv.testName}</td>
                  <td className="table-cell text-slate-700">₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td className="table-cell text-red-500">{inv.discount > 0 ? `-₹${inv.discount}` : '—'}</td>
                  <td className="table-cell font-semibold text-slate-800">₹{net.toLocaleString('en-IN')}</td>
                  <td className="table-cell"><span className="badge-gray">{inv.paymentMode}</span></td>
                  <td className="table-cell text-slate-400 text-xs">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => download(inv._id, inv.invoiceNumber)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Download"><Download size={13} /></button>
                      <button onClick={() => print(inv._id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Print"><Printer size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
