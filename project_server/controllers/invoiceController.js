const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const Test = require('../models/Test');
const { normalizeInvoice, calcInvoice, round2 } = require('../utils/invoiceCalc');
const { getIstRange } = require('../utils/dateRange');

const LETTERHEAD_PATH = path.join(__dirname, '../assets/letterhead.png');
const OUTPUT_DIR = path.join(__dirname, '../uploads/invoices');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

exports.createInvoice = async (req, res) => {
  try {
    const {
      patientId,
      selectedTests,
      discount = 0,
      paymentMode,
      amountPaid,
      // Legacy single-amount invoice (Create Invoice from patient detail page)
      testName,
      amount,
    } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success:false,
        message:"Patient not found"
      });
    }

    const tests = Array.isArray(selectedTests) ? selectedTests : [];

    // Database ke test IDs aur custom tests alag karo
    const dbTestIds = tests
      .filter(t => !t.isCustom && t._id && !String(t._id).startsWith('custom-'))
      .map(t => t._id);

    const dbTests = dbTestIds.length
      ? await Test.find({ _id: { $in: dbTestIds } })
      : [];

    // DB wale tests
    const dbItems = dbTests.map(t => ({
      testId: t._id,
      testName: t.testName,
      price: Number(t.price) || 0,
      isCustom: false
    }));

    // Custom tests
    const customItems = tests
      .filter(t => t.isCustom || String(t._id || '').startsWith('custom-'))
      .map(t => ({
        testName: t.testName,
        price: Number(t.price) || 0,
        isCustom: true
      }));

    // Dono merge
    let items = [...dbItems, ...customItems];

    // No tests sent → single line item from testName + amount
    if (!items.length && Number(amount) > 0) {
      items = [{ testName: testName || patient.testName || 'Service', price: Number(amount), isCustom: true }];
    }

    if (!items.length) {
      return res.status(400).json({ success: false, message: 'Please select at least one test' });
    }

    const gross = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const disc = Math.min(Math.max(Number(discount) || 0, 0), gross);
    const net = round2(gross - disc);

    // Amount paid: blank → full payment; otherwise clamp between 0 and net
    let paid = (amountPaid === undefined || amountPaid === null || amountPaid === '')
      ? net
      : Math.min(Math.max(Number(amountPaid) || 0, 0), net);
    paid = round2(paid);

    const invoice = await Invoice.create({
      patientId,
      items,
      testName: items.map(i => i.testName).join(", "),
      amount: gross,
      discount: disc,
      amountPaid: paid,
      payments: paid > 0 ? [{ amount: paid, paymentMode: paymentMode || 'Cash', receivedBy: req.user._id }] : [],
      paymentMode,
      createdBy: req.user._id
    });

    patient.invoiceId = invoice._id;
    await patient.save();

    res.status(201).json({
      success:true,
      invoice: normalizeInvoice(invoice)
    });

  } catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

// Collect due / balance amount against an invoice
exports.recordPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const amt = round2(req.body.amount);
    if (!(amt > 0)) return res.status(400).json({ success: false, message: 'Enter a valid amount' });

    const current = calcInvoice(invoice.toObject());
    if (current.balanceAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice is already fully paid' });
    }
    if (amt > current.balanceAmount) {
      return res.status(400).json({ success: false, message: `Amount cannot exceed balance of Rs. ${current.balanceAmount}` });
    }

    invoice.amountPaid = round2(current.amountPaid + amt);
    invoice.payments.push({ amount: amt, paymentMode: req.body.paymentMode || 'Cash', receivedBy: req.user._id });
    await invoice.save();

    const populated = await Invoice.findById(invoice._id).populate('patientId', 'name patientId mobile');
    res.json({ success: true, invoice: normalizeInvoice(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, date } = req.query;
    const query = {};
    if (date) {
      const { start, end } = getIstRange(date, date);
      query.date = { $gte: start, $lte: end };
    }
    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('patientId', 'name patientId mobile')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, invoices: invoices.map(normalizeInvoice), total, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('patientId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice: normalizeInvoice(invoice) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('patientId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // White bg
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

    // Letterhead
   // Full-page Letterhead (same as report)
if (fs.existsSync(LETTERHEAD_PATH)) {
  const lhBytes = fs.readFileSync(LETTERHEAD_PATH);
  const lhImg = await pdfDoc.embedPng(lhBytes);

  page.drawImage(lhImg, {
    x: 0,
    y: 0,
    width,
    height,
  });
}

    // Invoice Header
    let y = height - 150;
    page.drawText('INVOICE', { x: 40, y, size: 20, font: fontBold, color: rgb(0.1, 0.3, 0.7) });
    page.drawText(String(invoice.invoiceNo || invoice.invoiceNumber), { x: 350, y, size: 12, font: fontBold, color: rgb(0.1, 0.3, 0.7) });

    y -= 20;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Patient Info
    y -= 25;
    const drawRow = (label, value, yPos, xOffset = 0) => {
      page.drawText(label, { x: 40 + xOffset, y: yPos, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(String(value || ''), { x: 160 + xOffset, y: yPos, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    };

    const patient = invoice.patientId || {};
    drawRow('Patient Name:', patient.name, y);
    drawRow('Date:', new Date(invoice.date).toLocaleDateString('en-IN'), y, 280);
    y -= 18;
    drawRow('Patient ID:', patient.patientId, y);
    drawRow('Mobile:', patient.mobile, y, 280);
    y -= 18;
    drawRow('Referring Doctor:', patient.referringDoctor || 'Self', y);
    y -= 18;
    drawRow('Age / Gender:', `${patient.age ?? ''} / ${patient.gender ?? ''}`, y);

    // Table Header
    y -= 30;
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('Test / Service', { x: 50, y: y + 3, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Amount (Rs.)', { x: 460, y: y + 3, size: 10, font: fontBold, color: rgb(1, 1, 1) });

    // Table Row
    y -= 18;
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: rgb(0.95, 0.97, 1) });
    y -= 18;

invoice.items.forEach((item, index) => {

  page.drawRectangle({
    x:40,
    y:y-4,
    width:515,
    height:20,
    color: rgb(0.95,0.97,1)
  });

  page.drawText(String(item.testName || ''),{
    x:50,
    y:y+3,
    size:10,
    font:fontReg
  });

  page.drawText(Number(item.price || 0).toFixed(2),{
    x:468,
    y:y+3,
    size:10,
    font:fontReg
  });

  y -= 22;

});

    // Totals
    const calc = calcInvoice(invoice.toObject());
    y -= 30;
    const drawTotal = (label, value, opts = {}) => {
      const font = opts.bold ? fontBold : fontReg;
      const color = opts.color || rgb(0.2, 0.2, 0.2);
      const size = opts.size || 10;
      page.drawText(label, { x: 360, y, size, font, color });
      const txt = `Rs. ${value.toFixed(2)}`;
      page.drawText(txt, { x: 545 - font.widthOfTextAtSize(txt, size), y, size, font, color });
      y -= 18;
    };
    drawTotal('Total Amount:', calc.grossAmount);
    drawTotal('Discount:', calc.discount, { color: rgb(0.7, 0.1, 0.1) });
    page.drawLine({ start: { x: 355, y: y + 13 }, end: { x: 555, y: y + 13 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    drawTotal('Net Amount:', calc.netAmount, { bold: true, size: 11, color: rgb(0.1, 0.3, 0.7) });
    drawTotal('Amount Paid:', calc.amountPaid, { color: rgb(0.05, 0.5, 0.2) });
    drawTotal('Balance Due:', calc.balanceAmount, { bold: true, color: calc.balanceAmount > 0 ? rgb(0.75, 0.1, 0.1) : rgb(0.2, 0.2, 0.2) });

    y -= 10;
    page.drawText('Payment Mode:', { x: 40, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(String(invoice.paymentMode || ''), { x: 160, y, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
    page.drawText('Payment Status:', { x: 40, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(calc.paymentStatus, { x: 160, y, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });

    // Footer
    y -= 80;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 15;
    page.drawText('Thank you for choosing Shaurya Diagnostic Centre', {
      x: 130, y, size: 10, font: fontReg, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;
    page.drawText('This is a computer-generated invoice. No signature required.', {
      x: 130, y, size: 8, font: fontReg, color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
  'Content-Disposition',
  `attachment; filename="${invoice.invoiceNo || invoice.invoiceNumber}.pdf"`
);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
  console.error("🔥 Invoice PDF Error:", err);
  res.status(500).json({
    success: false,
    message: err.message,
    stack: err.stack
  });
}
};

exports.getTodayStats = async (req, res) => {
  try {
    const { start, end } = getIstRange();
    const invoices = await Invoice.find({ date: { $gte: start, $lte: end } }).lean();
    let total = 0, collected = 0, due = 0;
    invoices.forEach(inv => {
      const c = calcInvoice(inv);
      total += c.netAmount; collected += c.amountPaid; due += c.balanceAmount;
    });
    res.json({ success: true, count: invoices.length, total: round2(total), collected: round2(collected), due: round2(due) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
