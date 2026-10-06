const mongoose = require('mongoose');
const { calcInvoice } = require('../utils/invoiceCalc');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  // Legacy fields (old invoices ke liye)
items: [{
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: function () {
      return !this.isCustom;
    }
  },
  testName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isCustom: {
    type: Boolean,
    default: false
  }
}],
// New multi-test support
selectedTests: [
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
    },
    testName: String,
    category: String,
    price: Number,
  },
],

subtotal: { type: Number, default: 0 },
discount: { type: Number, default: 0 },
totalAmount: { type: Number, default: 0 },
// Gross amount (before discount) and joined test names – used by list/PDF
amount: { type: Number, default: 0 },
testName: { type: String, default: '' },
// Payment tracking
amountPaid: { type: Number },
balanceAmount: { type: Number, default: 0 },
paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Paid' },
payments: [{
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'Cash' },
  date: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}],
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Credit'], default: 'Cash' },
  isPaid: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.pre('save', async function (next) {
  // Auto calculate totals, paid and balance (works for items and selectedTests)
  const c = calcInvoice(this);
  this.subtotal = c.grossAmount;
  this.amount = c.grossAmount;
  this.discount = c.discount;
  this.totalAmount = c.netAmount;
  this.amountPaid = c.amountPaid;
  this.balanceAmount = c.balanceAmount;
  this.paymentStatus = c.paymentStatus;
  this.isPaid = c.balanceAmount <= 0;
  const list = this.items?.length ? this.items : (this.selectedTests || []);
  if (list.length) this.testName = list.map(t => t.testName).join(', ');

  if (this.invoiceNumber) return next();
  const count = await mongoose.model('Invoice').countDocuments();
  const year = new Date().getFullYear().toString().slice(-2);
  this.invoiceNumber = `SDC-INV-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
