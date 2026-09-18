
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = "http://localhost:5000/api/tests";

export default function TestMasterPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
const [editingId, setEditingId] = useState(null);
const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    testName: "",
    category: "Pathology",
    price: "",
  });

  const token = localStorage.getItem("token");

  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API, config);
      setTests(res.data.tests || []);
    } catch {
      toast.error("Tests load nahi hue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.testName || !form.price) {
      return toast.error("Test name aur price required hai");
    }

    try {
      await axios.post(API, form, config);

      toast.success("Test add ho gaya");

      setForm({
        testName: "",
        category: "Pathology",
        price: "",
      });

      loadTests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const deleteTest = async (id) => {
    if (!window.confirm("Delete karna hai?")) return;

    try {
      await axios.delete(`${API}/${id}`, config);
      toast.success("Deleted");
      loadTests();
    } catch {
      toast.error("Delete failed");
    }
  };
const importExcel = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(`${API}/import`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    toast.success(res.data.message);
    loadTests();
  } catch (err) {
    toast.error(err.response?.data?.message || "Import failed");
  }

  e.target.value = "";
};

const updatePrice = async (id, price) => {
  try {
    await axios.put(
      `${API}/${id}`,
      { price },
      config
    );

    toast.success("Price updated");
    setEditingId(null);
    loadTests();
  } catch {
    toast.error("Update failed");
  }
};
const downloadSample = () => {
  const rows = [
    ["Test Name", "Category", "Price"],
    ["CBC", "Pathology", 450],
    ["Blood Sugar", "Pathology", 120],
    ["BP", "General", 50],
    ["Diabetes Panel", "Pathology", 650],
  ];

  const csv = rows.map((r) => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Test_Master_Sample.csv";
  link.click();
};
  return (
    <div className="space-y-6">
     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold">Test Master</h1>
    <p className="text-slate-500">
      Manage pathology tests and pricing.
    </p>
  </div>

  <div className="flex gap-2 flex-wrap">
    <button
      onClick={() => fileInputRef.current.click()}
      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
    >
      Import Excel
    </button>

    <button
      onClick={downloadSample}
      className="px-4 py-2 border rounded-xl hover:bg-slate-100"
    >
      Sample Excel
    </button>

    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      hidden
      onChange={importExcel}
    />
  </div>
</div>

      <div className="bg-white rounded-2xl shadow border p-6">
        <h2 className="font-semibold text-lg mb-4">Add New Test</h2>

        <form
          onSubmit={handleSubmit}
          className="grid md:grid-cols-3 gap-4"
        >
          <input
            className="border rounded-xl px-4 py-2"
            placeholder="Test Name"
            value={form.testName}
            onChange={(e) =>
              setForm({ ...form, testName: e.target.value })
            }
          />

          <select
            className="border rounded-xl px-4 py-2"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          >
            <option>Pathology</option>
            <option>Radiology</option>
            <option>Cardiology</option>
            <option>General</option>
          </select>

          <input
            type="number"
            className="border rounded-xl px-4 py-2"
            placeholder="Price"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value })
            }
          />

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 md:col-span-3"
          >
            Add Test
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold">
          Test List ({tests.length})
        </div>
<div className="p-4 border-b">
  <input
    placeholder="Search Test..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full border rounded-xl px-4 py-2"
  />
</div>
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Price</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>

            <tbody>
             {tests
  .filter((t) =>
    t.testName.toLowerCase().includes(search.toLowerCase())
  )
  .map((test) => (
                <tr
                  key={test._id}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="p-3">{test.testName}</td>
                  <td className="p-3">{test.category}</td>
                <td className="p-3">
  {editingId === test._id ? (
    <input
      type="number"
      defaultValue={test.price}
      className="border rounded px-2 py-1 w-24"
      onBlur={(e) =>
        updatePrice(test._id, Number(e.target.value))
      }
      autoFocus
    />
  ) : (
    <span
      onClick={() => setEditingId(test._id)}
      className="cursor-pointer hover:text-blue-600"
    >
      ₹{test.price} ✏️
    </span>
  )}
</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteTest(test._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!tests.length && (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center p-8 text-slate-400"
                  >
                    No tests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}