import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const EMPTY = {
  name: '',
  age: '',
  gender: 'Male',
  mobile: '',
  referringDoctor: '',
  paymentMode: 'Cash',
  discount: 0
};

export default function PatientFormPage() {
  const [form, setForm] = useState(EMPTY);
const [loading, setLoading] = useState(false);
const [tests, setTests] = useState([]);
const [selectedTests, setSelectedTests] = useState([]);
const [searchTest, setSearchTest] = useState("");

const [showCustomTest, setShowCustomTest] = useState(false);
const [customTest, setCustomTest] = useState({
  testName: "",
  price: "",
});

const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/patients/${id}`).then(r => {
      const p = r.data.patient;
      setForm({ name: p.name, age: p.age, gender: p.gender, mobile: p.mobile, testName: p.testName, referringDoctor: p.referringDoctor || '' });
      if (p.invoiceId?.items) {
  setSelectedTests(
    p.invoiceId.items.map(i => ({
      _id: i.testId,
      testName: i.testName,
      price: i.price
    }))
  );
}
    }).catch(() => toast.error('Failed to load patient'));
  }, [id, isEdit]);
useEffect(() => {
  loadTests();
}, []);

const loadTests = async () => {
  try {
    const res = await api.get("/tests");
    setTests(res.data.tests);
  } catch {
    toast.error("Failed to load tests");
  }
};
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const filteredTests = useMemo(() => {
  return tests.filter(t =>
    t.testName.toLowerCase().includes(searchTest.toLowerCase())
  );
}, [tests, searchTest]);

const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);

const toggleTest = (test) => {
  if (selectedTests.some(t => t._id === test._id)) {
    setSelectedTests(selectedTests.filter(t => t._id !== test._id));
  } else {
    setSelectedTests([...selectedTests, test]);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/patients/${id}`, form);
        toast.success('Patient updated');
      } else {
        const res = await api.post('/patients', {
  ...form,
  testName: selectedTests.map(t => t.testName).join(", ")
});

await api.post("/invoices", {
  patientId: res.data.patient._id,
  selectedTests,
  paymentMode: form.paymentMode,
  discount: Number(form.discount || 0),
});

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
           <div className="col-span-2 space-y-3">

  <label className="label">Select Tests *</label>

<input
  className="input"
  placeholder="Search Test..."
  value={searchTest}
  onChange={(e) => setSearchTest(e.target.value)}
/>

<div className="flex justify-end mt-2 mb-2">
  <button
    type="button"
    onClick={() => setShowCustomTest(true)}
    className="text-sm text-blue-600 hover:underline"
  >
    + Add Custom Test
  </button>
</div>

<div className="border rounded-xl max-h-52 overflow-y-auto">
  {filteredTests.map(test => (

      <label
        key={test._id}
        className="flex justify-between items-center px-3 py-2 border-b cursor-pointer hover:bg-slate-50"
      >

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedTests.some(t => t._id === test._id)}
            onChange={() => toggleTest(test)}
          />
          <div>
            <p className="font-medium">{test.testName}</p>
            <p className="text-xs text-slate-500">{test.category}</p>
          </div>
        </div>

        <span className="font-semibold">₹{test.price}</span>

      </label>

    ))}

  </div>

  {selectedTests.length > 0 && (

    <div className="rounded-xl bg-slate-50 border p-3 space-y-2">

      <p className="font-semibold">Selected Tests</p>

      {selectedTests.map(test => (

        <div
          key={test._id}
          className="flex justify-between text-sm"
        >
          <span>{test.testName}</span>
          <span>₹{test.price}</span>
        </div>

      ))}

      <hr />

      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>₹{totalAmount}</span>
      </div>

    </div>

  )}

</div>
<div>

  <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
  <h3 className="font-semibold">Other Test (Optional)</h3>

  <input
    className="input"
    placeholder="Test Name (e.g. Vitamin D)"
    value={customTest.testName}
onChange={(e) =>
  setCustomTest({ ...customTest, testName: e.target.value })
} 
  />

  <input
    className="input"
    type="number"
    placeholder="Price"
   value={customTest.price}
onChange={(e) =>
  setCustomTest({ ...customTest, price: e.target.value })
}
  />
</div>
  <label className="label">Payment Mode</label>
  <select
    className="input"
    value={form.paymentMode}
    onChange={set("paymentMode")}
  >
    <option>Cash</option>
    <option>UPI</option>
    <option>Card</option>
    <option>Net Banking</option>
    <option>Credit</option>
  </select>
</div>

<div>
  <label className="label">Discount</label>
  <input
    className="input"
    type="number"
    value={form.discount}
    onChange={set("discount")}
    placeholder="0"
  />
</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Patient' : 'Register Patient'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
        {showCustomTest && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
      <h2 className="text-lg font-semibold mb-4">Add Custom Test</h2>

      <div className="space-y-3">
        <input
          className="input"
          placeholder="Test Name"
          value={customTest.testName}
          onChange={(e) =>
            setCustomTest({ ...customTest, testName: e.target.value })
          }
        />

        <input
          className="input"
          type="number"
          placeholder="Price"
          value={customTest.price}
          onChange={(e) =>
            setCustomTest({ ...customTest, price: e.target.value })
          }
        />
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowCustomTest(false)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!customTest.testName || !customTest.price) return;

            setSelectedTests([
              ...selectedTests,
              {
                _id: `custom-${Date.now()}`,
                testName: customTest.testName,
                price: Number(customTest.price),
                isCustom: true,
              },
            ]);

            setCustomTest({ testName: "", price: "" });
            setShowCustomTest(false);
          }}
        >
          Add Test
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
