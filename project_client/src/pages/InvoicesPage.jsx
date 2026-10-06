import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Download, Printer, Wallet } from 'lucide-react';
import { calcInvoice, inr, statusBadge } from '../utils/invoice';

function PaymentModal({ invoice, onClose, onSaved }) {
  const c = calcInvoice(invoice);
  const [amount, setAmount] = useState(String(c.balanceAmount));
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!(amt > 0)) return toast.error('Enter a valid amount');
    if (amt > c.balanceAmount) return toast.error(`Amount cannot exceed balance ${inr(c.balanceAmount)}`);
    setSaving(true);
    try {
      await api.patch(`/invoices/${invoice._id}/payment`, { amount: amt, paymentMode });
      toast.success('Payment recorded');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record payment'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Collect Due — {invoice.invoiceNumber}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 rounded-lg p-3">
            <span className="text-slate-500">Total Amount</span><span className="text-right">{inr(c.grossAmount)}</span>
            <span className="text-slate-500">Discount</span><span className="text-right text-red-500">-{inr(c.discount)}</span>
            <span className="text-slate-500">Net Amount</span><span className="text-right font-semibold">{inr(c.netAmount)}</span>
            <span className="text-slate-500">Amount Paid</span><span className="text-right text-green-700">{inr(c.amountPaid)}</span>
            <span className="text-slate-500">Balance Due</span><span className="text-right font-bold text-red-600">{inr(c.balanceAmount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount Received (₹) *</label>
              <input type="number" className="input" min="0" step="0.01" max={c.balanceAmount} required value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                {['Cash', 'UPI', 'Card', 'Net Banking'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Payment'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({});
  const [payInvoice, setPayInvoice] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (date) params.date = date;
      const [inv, stat] = await Promise.all([api.get('/invoices', { params }), api.get('/invoices/stats/today')]);
      setInvoices(inv.data.invoices || []);
      setPages(inv.data.pages || 1);
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
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
    Invoices
  </h1>

  <div className="flex flex-wrap gap-2">
    <span className="badge-green">
      Today: {stats.count || 0} invoices
    </span>

    <span className="badge-blue">
      Revenue: {inr(stats.total)}
    </span>

    <span className="badge-green">
      Collected: {inr(stats.collected)}
    </span>

    <span className="badge-red">
      Due: {inr(stats.due)}
    </span>
  </div>
</div>

      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
  <label className="text-sm text-slate-500 shrink-0">
    Filter by date:
  </label>

  <input
    type="date"
    className="input w-full sm:w-44"
    value={date}
    onChange={(e) => {
      setDate(e.target.value);
      setPage(1);
    }}
  />

  {date && (
    <button
      className="btn-secondary w-full sm:w-auto"
      onClick={() => setDate("")}
    >
      Clear
    </button>
  )}
</div>

      <div className="card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
  <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              {['Invoice No', 'Patient', 'Test', 'Total Amount', 'Discount', 'Net', 'Paid', 'Balance', 'Payment', 'Date', 'Actions'].map(h => (
                <th key={h} className="table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={11} className="text-center py-12 text-slate-400 text-sm">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-slate-400 text-sm">No invoices found</td></tr>
            ) : invoices.map(inv => {
              const c = calcInvoice(inv);
              return (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="table-cell"><span className="badge-blue text-xs">{inv.invoiceNumber}</span></td>
                  <td className="table-cell">
                    <p className="font-medium text-slate-700 text-sm">{inv.patientId?.name}</p>
                    <p className="text-xs text-slate-400">{inv.patientId?.patientId}</p>
                  </td>
                  <td className="table-cell text-slate-600 text-sm max-w-[140px] truncate">{inv.testName}</td>
                  <td className="table-cell text-slate-700">{inr(c.grossAmount)}</td>
                  <td className="table-cell text-red-500">{c.discount > 0 ? `-${inr(c.discount)}` : '—'}</td>
                  <td className="table-cell font-semibold text-slate-800">{inr(c.netAmount)}</td>
                  <td className="table-cell text-green-700">{inr(c.amountPaid)}</td>
                  <td className={`table-cell ${c.balanceAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>{inr(c.balanceAmount)}</td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={statusBadge(c.paymentStatus)}>{c.paymentStatus}</span>
                      <span className="badge-gray">{inv.paymentMode}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-400 text-xs">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      {c.balanceAmount > 0 && (
                        <button onClick={() => setPayInvoice(inv)} className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600" title="Collect Due"><Wallet size={13} /></button>
                      )}
                      <button onClick={() => download(inv._id, inv.invoiceNumber)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Download"><Download size={13} /></button>
                      <button onClick={() => print(inv._id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Print"><Printer size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {/* Mobile Invoice Cards */}
<div className="md:hidden space-y-3 p-3">
  {loading ? (
    <div className="text-center py-8 text-slate-400">Loading...</div>
  ) : invoices.length === 0 ? (
    <div className="text-center py-8 text-slate-400">
      No invoices found
    </div>
  ) : (
    invoices.map((inv) => {
      const c = calcInvoice(inv);

      return (
        <div
          key={inv._id}
          className="rounded-xl border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="badge-blue text-xs">
              {inv.invoiceNumber}
            </span>

            <div className="flex gap-1">
              <span className={statusBadge(c.paymentStatus)}>
                {c.paymentStatus}
              </span>
              <span className="badge-gray capitalize">
                {inv.paymentMode}
              </span>
            </div>
          </div>

          <h3 className="font-bold text-lg text-slate-800">
            {inv.patientId?.name}
          </h3>

          <p className="text-sm text-slate-500">
            {inv.patientId?.patientId}
          </p>

          <div className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Test</span>
              <span className="text-slate-700 break-words">
                {inv.testName}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Total</span>
              <span className="font-medium">
                {inr(c.grossAmount)}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Discount</span>
              <span className="text-red-500">
                {c.discount > 0 ? `-${inr(c.discount)}` : "—"}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Net</span>
              <span className="font-bold text-lg text-slate-800">
                {inr(c.netAmount)}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Paid</span>
              <span className="text-green-700 font-medium">
                {inr(c.amountPaid)}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Balance</span>
              <span className={c.balanceAmount > 0 ? "text-red-600 font-bold" : "text-slate-400"}>
                {inr(c.balanceAmount)}
              </span>
            </div>

            <div className="grid grid-cols-[70px_1fr] gap-3">
              <span className="text-slate-400">Date</span>
              <span>
                {new Date(inv.date).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            {c.balanceAmount > 0 && (
              <button
                onClick={() => setPayInvoice(inv)}
                className="h-10 px-3 rounded-xl bg-green-50 text-green-700 flex items-center gap-1 text-sm font-medium active:scale-95 transition"
              >
                <Wallet size={16} /> Collect
              </button>
            )}
            <button
              onClick={() => download(inv._id, inv.invoiceNumber)}
              className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center active:scale-95 transition"
            >
              <Download size={18} />
            </button>

            <button
              onClick={() => print(inv._id)}
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
      );
    })
  )}
</div>
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
      {payInvoice && (
        <PaymentModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={() => { setPayInvoice(null); fetch(); }}
        />
      )}
    </div>
  );
}
