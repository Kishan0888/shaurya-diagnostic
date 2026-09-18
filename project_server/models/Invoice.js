const mongoose = require('mongoose');

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
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Credit'], default: 'Cash' },
  isPaid: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.pre('save', async function (next) {
  // Auto calculate total for multi-test invoices
if (this.selectedTests?.length) {
  this.subtotal = this.selectedTests.reduce(
    (sum, test) => sum + Number(test.price || 0),
    0
  );

  this.totalAmount = this.subtotal - (this.discount || 0);

  // Old fields bhi fill kar do compatibility ke liye
  this.testName = this.selectedTests.map(t => t.testName).join(", ");
  this.amount = this.totalAmount;
}
  if (this.invoiceNumber) return next();
  const count = await mongoose.model('Invoice').countDocuments();
  const year = new Date().getFullYear().toString().slice(-2);
  this.invoiceNumber = `SDC-INV-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
