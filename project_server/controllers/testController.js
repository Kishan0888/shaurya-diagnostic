
const Test = require("../models/Test");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
// Get all tests
exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ testName: 1 });
    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create test
exports.createTest = async (req, res) => {
  try {
    const test = await Test.create(req.body);
    res.status(201).json({ success: true, test });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update test
exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!test)
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });

    res.json({ success: true, test });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete test
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);

    if (!test)
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });

    res.json({
      success: true,
      message: "Test deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.importTests = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file required",
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;

    for (const row of rows) {
      if (!row["Test Name"] || !row.Price) continue;

      const exists = await Test.findOne({
        testName: row["Test Name"],
      });

      if (exists) continue;

      await Test.create({
        testName: row["Test Name"],
        category: row.Category || "General",
        price: Number(row.Price),
      });

      imported++;
    }

    // Uploaded file delete
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      imported,
      message: `${imported} tests imported successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};