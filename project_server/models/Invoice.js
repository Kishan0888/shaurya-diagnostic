const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  testName: { type: String, required: true },
  amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Credit'], default: 'Cash' },
  isPaid: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.pre('save', async function (next) {
  if (this.invoiceNumber) return next();
  const count = await mongoose.model('Invoice').countDocuments();
  const year = new Date().getFullYear().toString().slice(-2);
  this.invoiceNumber = `SDC-INV-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
