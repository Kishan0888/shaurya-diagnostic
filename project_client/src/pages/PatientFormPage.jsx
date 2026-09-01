import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const EMPTY = { name: '', age: '', gender: 'Male', mobile: '', testName: '', referringDoctor: '' };

export default function PatientFormPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/patients/${id}`).then(r => {
      const p = r.data.patient;
      setForm({ name: p.name, age: p.age, gender: p.gender, mobile: p.mobile, testName: p.testName, referringDoctor: p.referringDoctor || '' });
    }).catch(() => toast.error('Failed to load patient'));
  }, [id, isEdit]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/patients/${id}`, form);
        toast.success('Patient updated');
      } else {
        const res = await api.post('/patients', form);
        toast.success(`Patient registered — ${res.data.patient.patientId}`);
      }
      navigate('/patients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="card">
        <div className="px-6 py-4 border-b">
          <h1 className="font-semibold text-slate-800">{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" required value={form.name} onChange={set('name')} placeholder="Patient full name" />
            </div>
            <div>
              <label className="label">Age *</label>
              <input className="input" type="number" min="0" max="150" required value={form.age} onChange={set('age')} placeholder="Age in years" />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select className="input" required value={form.gender} onChange={set('gender')}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Mobile Number *</label>
              <input className="input" required value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div>
              <label className="label">Referring Doctor</label>
              <input className="input" value={form.referringDoctor} onChange={set('referringDoctor')} placeholder="Dr. Name (or Self)" />
            </div>
            <div className="col-span-2">
              <label className="label">Test Name *</label>
              <input className="input" required value={form.testName} onChange={set('testName')} placeholder="e.g. Complete Blood Count, HbA1c, Urine R/E" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Patient' : 'Register Patient'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
