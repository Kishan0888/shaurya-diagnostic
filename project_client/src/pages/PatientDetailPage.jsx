import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, Download, Printer, FileText, Plus, RefreshCw } from 'lucide-react';

function InvoiceModal({ patient, onClose, onCreated }) {
  const [form, setForm] = useState({ amount: '', discount: '0', paymentMode: 'Cash', testName: patient.testName });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/invoices', { patientId: patient._id, ...form, amount: Number(form.amount), discount: Number(form.discount) });
      toast.success('Invoice created');
      onCreated();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Create Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Test / Service</label>
            <input className="input" required value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" required min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Discount (₹)</label>
              <input type="number" className="input" min="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
              {['Cash', 'UPI', 'Card', 'Net Banking', 'Credit'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Invoice'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const fileRef = useRef();

  const load = () => {
    api.get(`/patients/${id}`).then(r => { setPatient(r.data.patient); setLoading(false); }).catch(() => navigate('/patients'));
  };
  useEffect(load, [id]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('report', file);
    setUploading(true);
    try {
      await api.post(`/reports/${id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Report uploaded and PDF generated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); fileRef.current.value = ''; }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/reports/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${patient.patientId}-report.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handlePrint = () => {
    if (!patient?.generatedPdf) return;
    const url = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${patient.generatedPdf}`;
    const w = window.open(url, '_blank');
    w?.addEventListener('load', () => w.print());
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${patient.invoiceId._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${patient.patientId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Invoice download failed'); }
  };

  const handleRegenerate = async () => {
    try {
      await api.post(`/reports/${id}/regenerate`);
      toast.success('PDF regenerated');
      load();
    } catch { toast.error('Regeneration failed'); }
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1" />
        <Link to={`/patients/${id}/edit`} className="btn-secondary text-sm">Edit</Link>
      </div>

      {/* Patient Info */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <span className="badge-blue mt-1">{patient.patientId}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[['Age', `${patient.age} years`], ['Gender', patient.gender], ['Mobile', patient.mobile], ['Referring Doctor', patient.referringDoctor], ['Test Name', patient.testName], ['Registered', new Date(patient.createdAt).toLocaleDateString('en-IN')]].map(([l, v]) => (
            <div key={l}><p className="text-xs text-slate-400 mb-0.5">{l}</p><p className="font-medium text-slate-700">{v}</p></div>
          ))}
        </div>
      </div>

      {/* Report Section */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><FileText size={16} /> Report Management</h2>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />

        {patient.generatedPdf ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-700 font-medium">Report with letterhead generated</span>
            </div>
            <div className="border rounded-lg overflow-hidden" style={{ height: 500 }}>
              <iframe src={`${BASE}${patient.generatedPdf}`} className="w-full h-full" title="Report Preview" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleDownload} className="btn-primary flex items-center gap-2"><Download size={14} /> Download PDF</button>
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2"><Printer size={14} /> Print</button>
              <button onClick={handleRegenerate} className="btn-secondary flex items-center gap-2"><RefreshCw size={14} /> Regenerate</button>
              <button onClick={() => fileRef.current.click()} className="btn-secondary flex items-center gap-2" disabled={uploading}>
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload New'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
            <Upload size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium mb-1">Upload Report</p>
            <p className="text-slate-400 text-sm mb-4">PDF, JPG, or PNG (max 20MB)</p>
            <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-primary">
              {uploading ? 'Processing...' : 'Choose File'}
            </button>
          </div>
        )}
      </div>

      {/* Invoice Section */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Receipt size={16} /> Invoice</h2>
        {patient.invoiceId ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[['Invoice No', patient.invoiceId.invoiceNumber], ['Amount', `₹${patient.invoiceId.amount}`], ['Payment', patient.invoiceId.paymentMode], ['Date', new Date(patient.invoiceId.date).toLocaleDateString('en-IN')]].map(([l, v]) => (
                <div key={l}><p className="text-xs text-slate-400 mb-0.5">{l}</p><p className="font-medium text-slate-700">{v}</p></div>
              ))}
            </div>
            <button onClick={handleDownloadInvoice} className="btn-secondary flex items-center gap-2 text-sm"><Download size={13} /> Download Invoice</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="badge-gray">No invoice generated</span>
            <button onClick={() => setShowInvoice(true)} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14} /> Create Invoice</button>
          </div>
        )}
      </div>

      {showInvoice && <InvoiceModal patient={patient} onClose={() => setShowInvoice(false)} onCreated={() => { setShowInvoice(false); load(); }} />}
    </div>
  );
}

function Receipt(props) { return <svg xmlns="http://www.w3.org/2000/svg" {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M12 16H8"/></svg>; }
