const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');

const LETTERHEAD_PATH = path.join(__dirname, '../assets/letterhead.png');
const OUTPUT_DIR = path.join(__dirname, '../uploads/invoices');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

exports.createInvoice = async (req, res) => {
  try {
    const { patientId, testName, amount, discount, paymentMode } = req.body;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const invoice = await Invoice.create({
      patientId, testName, amount, discount, paymentMode, createdBy: req.user._id,
    });

    patient.invoiceId = invoice._id;
    await patient.save();

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, date } = req.query;
    const query = {};
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('patientId', 'name patientId mobile')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('patientId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
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

    const patient = invoice.patientId;
    drawRow('Patient Name:', patient.name, y);
    drawRow('Date:', new Date(invoice.date).toLocaleDateString('en-IN'), y, 280);
    y -= 18;
    drawRow('Patient ID:', patient.patientId, y);
    drawRow('Mobile:', patient.mobile, y, 280);
    y -= 18;
    drawRow('Referring Doctor:', patient.referringDoctor || 'Self', y);
    y -= 18;
    drawRow('Age / Gender:', `${patient.age} / ${patient.gender}`, y);

    // Table Header
    y -= 30;
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('Test / Service', { x: 50, y: y + 3, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Amount (Rs.)', { x: 460, y: y + 3, size: 10, font: fontBold, color: rgb(1, 1, 1) });

    // Table Row
    y -= 24;
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 20, color: rgb(0.95, 0.97, 1) });
    page.drawText(invoice.testName, { x: 50, y: y + 3, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(invoice.amount.toFixed(2), { x: 468, y: y + 3, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });

    // Totals
    y -= 40;
    if (invoice.discount > 0) {
      page.drawText('Discount:', { x: 400, y, size: 10, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(`- ${invoice.discount.toFixed(2)}`, { x: 468, y, size: 10, font: fontReg, color: rgb(0.7, 0.1, 0.1) });
      y -= 18;
    }
    const net = invoice.amount - (invoice.discount || 0);
    page.drawLine({ start: { x: 390, y: y + 12 }, end: { x: 555, y: y + 12 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText('Net Amount:', {
  x: 360,
  y,
  size: 11,
  font: fontBold,
  color: rgb(0.1, 0.3, 0.7),
});

page.drawText(`Rs. ${net.toFixed(2)}`, {
  x: 465,
  y,
  size: 11,
  font: fontBold,
  color: rgb(0.1, 0.3, 0.7),
});

    y -= 25;
    page.drawText('Payment Mode:', { x: 40, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(invoice.paymentMode, { x: 160, y, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });

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
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const invoices = await Invoice.find({ date: { $gte: start, $lte: end } });
    const total = invoices.reduce((sum, inv) => sum + inv.amount - (inv.discount || 0), 0);
    res.json({ success: true, count: invoices.length, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
