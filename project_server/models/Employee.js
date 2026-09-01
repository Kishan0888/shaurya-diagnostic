const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  mobile: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

employeeSchema.pre('save', async function (next) {
  if (this.employeeId) return next();
  const count = await mongoose.model('Employee').countDocuments();
  this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
