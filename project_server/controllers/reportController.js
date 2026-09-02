const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const sharp = require('sharp');
const Patient = require('../models/Patient');

const LETTERHEAD_PATH = path.join(__dirname, '../assets/letterhead.png');
const OUTPUT_DIR = path.join(__dirname, '../uploads/generated');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const LETTERHEAD_HEIGHT_PT = 110; // points (~38.8mm)
const PAGE_WIDTH = 595.28;        // A4
const PAGE_HEIGHT = 841.89;       // A4
const MARGIN = 28.35;             // ~10mm

async function getLetterheadBytes() {
  if (!fs.existsSync(LETTERHEAD_PATH)) return null;
  return fs.readFileSync(LETTERHEAD_PATH);
}

async function embedLetterhead(pdfDoc, page) {
  const lhBytes = await getLetterheadBytes();
  if (!lhBytes) return;

  const lhImage = await pdfDoc.embedPng(lhBytes);

  // Draw full A4 letterhead as background
  page.drawImage(lhImage, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });
}

async function generateFromImage(imageBuffer, mimeType) {
  // Convert image to PNG if needed
  let pngBuffer = imageBuffer;
  if (mimeType !== 'image/png') {
    pngBuffer = await sharp(imageBuffer).png().toBuffer();
  }

  const meta = await sharp(pngBuffer).metadata();
  const imgAspect = meta.width / meta.height;

  const availableWidth = PAGE_WIDTH - 2 * MARGIN;
  const TOP_MARGIN = 105;
const BOTTOM_MARGIN = 60;

const availableHeight = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;

  let imgW = availableWidth;
  let imgH = imgW / imgAspect;
  if (imgH > availableHeight) {
    imgH = availableHeight;
    imgW = imgH * imgAspect;
  }

  const imgX = (PAGE_WIDTH - imgW) / 2;
  const imgY = PAGE_HEIGHT - TOP_MARGIN - imgH;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // White background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });

  await embedLetterhead(pdfDoc, page);

  const embedded = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(embedded, { x: imgX, y: imgY, width: imgW, height: imgH });

  return pdfDoc.save();
}

async function generateFromPdf(pdfBuffer) {
  const sourcePdf = await PDFDocument.load(pdfBuffer);
  const sourcePages = sourcePdf.getPages();
  const outputPdf = await PDFDocument.create();

  for (let i = 0; i < sourcePages.length; i++) {
    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [i]);
    const { width: srcW, height: srcH } = copiedPage.getSize();

    // Create new A4 page
    const newPage = outputPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    newPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });

    // Embed letterhead
    await embedLetterhead(outputPdf, newPage);

    // Embed source page as XObject
    const embedded = await outputPdf.embedPage(copiedPage);

    const TOP_MARGIN = 105;
const BOTTOM_MARGIN = 60;

const availH = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
    const availW = PAGE_WIDTH - 2 * MARGIN;
    const srcAspect = srcW / srcH;

    let drawW = availW;
    let drawH = drawW / srcAspect;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * srcAspect;
    }

    const drawX = (PAGE_WIDTH - drawW) / 2;
    const drawY = PAGE_HEIGHT - TOP_MARGIN - drawH;

    newPage.drawPage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });
  }

  return outputPdf.save();
}

exports.uploadReport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const fileBuffer = fs.readFileSync(req.file.path);
    const ext = path.extname(req.file.filename).toLowerCase();
    const isPdf = ext === '.pdf';

    let pdfBytes;
    if (isPdf) {
      pdfBytes = await generateFromPdf(fileBuffer);
    } else {
      pdfBytes = await generateFromImage(fileBuffer, req.file.mimetype);
    }

    const outFilename = `generated-${Date.now()}.pdf`;
    const outPath = path.join(OUTPUT_DIR, outFilename);
    fs.writeFileSync(outPath, pdfBytes);

    patient.reportFile = `/uploads/reports/${req.file.filename}`;
    patient.generatedPdf = `/uploads/generated/${outFilename}`;
    await patient.save();

    res.json({
      success: true,
      reportFile: patient.reportFile,
      generatedPdf: patient.generatedPdf,
      message: 'Report uploaded and PDF generated',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient?.generatedPdf) return res.status(404).json({ success: false, message: 'No report found' });

    const filePath = path.join(__dirname, '..', patient.generatedPdf);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${patient.patientId}-report.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.regenerateReport = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient?.reportFile) return res.status(400).json({ success: false, message: 'No original report found' });

    const originalPath = path.join(__dirname, '..', patient.reportFile);
    if (!fs.existsSync(originalPath)) return res.status(404).json({ success: false, message: 'Original file missing' });

    const fileBuffer = fs.readFileSync(originalPath);
    const ext = path.extname(originalPath).toLowerCase();
    const isPdf = ext === '.pdf';

    let pdfBytes;
    if (isPdf) {
      pdfBytes = await generateFromPdf(fileBuffer);
    } else {
      pdfBytes = await generateFromImage(fileBuffer, `image/${ext.slice(1)}`);
    }

    const outFilename = `generated-${Date.now()}.pdf`;
    const outPath = path.join(OUTPUT_DIR, outFilename);
    fs.writeFileSync(outPath, pdfBytes);

    patient.generatedPdf = `/uploads/generated/${outFilename}`;
    await patient.save();

    res.json({ success: true, generatedPdf: patient.generatedPdf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
