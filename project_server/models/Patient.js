const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobile: { type: String, required: true, trim: true },
  testName: { type: String, required: true, trim: true },
  referringDoctor: { type: String, trim: true, default: 'Self' },
  reportFile: { type: String, default: null },
  generatedPdf: { type: String, default: null },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

patientSchema.pre('save', async function (next) {
  if (this.patientId) return next();
  const count = await mongoose.model('Patient').countDocuments();
  this.patientId = `SDC${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
