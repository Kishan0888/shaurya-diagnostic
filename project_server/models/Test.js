
const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testCode: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
  },
  testName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    default: "General",
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Auto generate test code like TST001
testSchema.pre("save", async function (next) {
  if (this.testCode) return next();

  const lastTest = await mongoose.model("Test")
    .findOne()
    .sort({ testCode: -1 })
    .select("testCode");

  let nextNumber = 1;

  if (lastTest?.testCode) {
    nextNumber = parseInt(lastTest.testCode.replace("TST", ""), 10) + 1;
  }

  this.testCode = `TST${String(nextNumber).padStart(3, "0")}`;
  next();
});

module.exports = mongoose.model("Test", testSchema);