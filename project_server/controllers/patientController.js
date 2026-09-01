const Patient = require('../models/Patient');

exports.createPatient = async (req, res) => {
  try {
    const patient = await Patient.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, date } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { testName: { $regex: search, $options: 'i' } },
      ];
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('invoiceId', 'invoiceNumber amount paymentMode')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('invoiceId')
      .populate('createdBy', 'name');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTodayPatients = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const patients = await Patient.find({ createdAt: { $gte: start, $lte: end } })
      .populate('invoiceId', 'invoiceNumber amount')
      .sort('-createdAt');
    res.json({ success: true, patients, count: patients.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
