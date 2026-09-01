const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const ExcelJS = require('exceljs');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

const todayStr = () => new Date().toISOString().split('T')[0];
const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const LETTERHEAD_PATH = path.join(__dirname, '../assets/letterhead.png');

// ─── Employee self check-in (lab_staff) ───────────────────────────────────────
exports.selfCheckIn = async (req, res) => {
  try {
    // Find employee linked to logged-in user
    const employee = await Employee.findOne({ userId: req.user._id, isActive: true });
    if (!employee) return res.status(404).json({ success: false, message: 'No employee record linked to your account' });

    const date = todayStr();
    const now = new Date();

    const existing = await Attendance.findOne({ employeeId: employee._id, date });
    if (existing?.checkIn) return res.status(400).json({ success: false, message: 'Already checked in today' });

    const hour = now.getHours(), min = now.getMinutes();
    const status = (hour > 9 || (hour === 9 && min > 30)) ? 'Late' : 'Present';

    const record = await Attendance.findOneAndUpdate(
      { employeeId: employee._id, date },
      { checkIn: now, status },
      { upsert: true, new: true }
    );
    res.json({ success: true, record, employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.selfCheckOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id, isActive: true });
    if (!employee) return res.status(404).json({ success: false, message: 'No employee record linked to your account' });

    const date = todayStr();
    const record = await Attendance.findOne({ employeeId: employee._id, date });
    if (!record?.checkIn) return res.status(400).json({ success: false, message: 'You have not checked in today' });
    if (record.checkOut) return res.status(400).json({ success: false, message: 'Already checked out today' });

    record.checkOut = new Date();
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id, isActive: true });
    if (!employee) return res.status(404).json({ success: false, message: 'No employee record linked' });

    const date = todayStr();
    const todayRecord = await Attendance.findOne({ employeeId: employee._id, date });

    // Last 30 days history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const history = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: thirtyDaysAgo },
    }).sort('-date').limit(30);

    res.json({ success: true, employee, todayRecord, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin check-in on behalf of employee ─────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const date = todayStr();
    const now = new Date();

    const existing = await Attendance.findOne({ employeeId, date });
    if (existing?.checkIn) return res.status(400).json({ success: false, message: 'Already checked in' });

    const hour = now.getHours(), min = now.getMinutes();
    const status = (hour > 9 || (hour === 9 && min > 30)) ? 'Late' : 'Present';

    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { checkIn: now, status },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const date = todayStr();

    const record = await Attendance.findOne({ employeeId, date });
    if (!record?.checkIn) return res.status(400).json({ success: false, message: 'Not checked in today' });
    if (record.checkOut) return res.status(400).json({ success: false, message: 'Already checked out' });

    record.checkOut = new Date();
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const date = todayStr();
    const records = await Attendance.find({ date }).populate('employeeId', 'name role employeeId');
    const employees = await Employee.find({ isActive: true });

    const present = records.filter(r => r.checkIn);
    const late = records.filter(r => r.status === 'Late');
    const absent = employees.filter(e => !records.find(r => r.employeeId?._id?.toString() === e._id.toString()));

    res.json({
      success: true,
      records,
      presentCount: present.length,
      lateCount: late.length,
      absentCount: absent.length,
      absentees: absent,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMonthly = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];

    const query = { date: { $gte: start, $lte: end } };
    if (employeeId) query.employeeId = employeeId;

    const records = await Attendance.find(query)
      .populate('employeeId', 'name role employeeId')
      .sort('date');

    // Stats
    const presentCount = records.filter(r => r.status === 'Present').length;
    const lateCount = records.filter(r => r.status === 'Late').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;

    res.json({ success: true, records, stats: { presentCount, lateCount, absentCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.manualEntry = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status,
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Export Excel ─────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];

    const query = { date: { $gte: start, $lte: end } };
    if (employeeId) query.employeeId = employeeId;

    const records = await Attendance.find(query)
      .populate('employeeId', 'name role employeeId')
      .sort('date');

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shaurya Diagnostic Centre';
    const sheet = workbook.addWorksheet(`Attendance ${MONTHS[m]} ${y}`);

    // Header row
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee ID', key: 'empId', width: 14 },
      { header: 'Employee Name', key: 'name', width: 22 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Check In', key: 'checkIn', width: 14 },
      { header: 'Check Out', key: 'checkOut', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Style header
    sheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 22;

    records.forEach(r => {
      const row = sheet.addRow({
        date: r.date,
        empId: r.employeeId?.employeeId || '',
        name: r.employeeId?.name || '',
        role: r.employeeId?.role || '',
        checkIn: fmt(r.checkIn),
        checkOut: fmt(r.checkOut),
        status: r.status,
      });
      // Color status cell
      const statusCell = row.getCell('status');
      const colors = { Present: 'FF16A34A', Late: 'FFD97706', Absent: 'FFDC2626', 'Half Day': 'FF6B7280' };
      statusCell.font = { color: { argb: colors[r.status] || 'FF374151' }, bold: true };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Attendance-${MONTHS[m]}-${y}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Export PDF ───────────────────────────────────────────────────────────────
exports.exportPdf = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];

    const query = { date: { $gte: start, $lte: end } };
    if (employeeId) query.employeeId = employeeId;

    const records = await Attendance.find(query)
      .populate('employeeId', 'name role employeeId')
      .sort('date');

    const presentCount = records.filter(r => r.status === 'Present').length;
    const lateCount = records.filter(r => r.status === 'Late').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;

    const pdfDoc = await PDFDocument.create();
    const W = 595.28, H = 841.89;
    const LHEAD_H = 110;
    const MARGIN = 30;

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage([W, H]);
    let y_pos = H;

    const addLetterhead = async (p) => {
      p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
      if (fs.existsSync(LETTERHEAD_PATH)) {
        const lhBytes = fs.readFileSync(LETTERHEAD_PATH);
        const lhImg = await pdfDoc.embedPng(lhBytes);
        p.drawImage(lhImg, { x: 0, y: H - LHEAD_H, width: W, height: LHEAD_H });
      }
      return H - LHEAD_H - 20;
    };

    y_pos = await addLetterhead(page);

    // Title
    y_pos -= 18;
    page.drawText(`Attendance Report — ${MONTHS[m]} ${y}`, {
      x: MARGIN, y: y_pos, size: 14, font: fontBold, color: rgb(0.11, 0.3, 0.85),
    });
    y_pos -= 16;
    page.drawLine({ start: { x: MARGIN, y: y_pos }, end: { x: W - MARGIN, y: y_pos }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Summary stats
    y_pos -= 20;
    const stats = [
      `Total Records: ${records.length}`,
      `Present: ${presentCount}`,
      `Late: ${lateCount}`,
      `Absent: ${absentCount}`,
    ];
    stats.forEach((s, i) => {
      page.drawText(s, { x: MARGIN + i * 130, y: y_pos, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    });
    y_pos -= 18;

    // Table header
    const cols = [
      { label: 'Date', x: MARGIN, w: 65 },
      { label: 'Emp ID', x: MARGIN + 65, w: 55 },
      { label: 'Name', x: MARGIN + 120, w: 110 },
      { label: 'Role', x: MARGIN + 230, w: 90 },
      { label: 'Check In', x: MARGIN + 320, w: 65 },
      { label: 'Check Out', x: MARGIN + 385, w: 65 },
      { label: 'Status', x: MARGIN + 450, w: 60 },
    ];

    const drawTableHeader = (p, yp) => {
      p.drawRectangle({ x: MARGIN, y: yp - 4, width: W - MARGIN * 2, height: 18, color: rgb(0.11, 0.3, 0.85) });
      cols.forEach(c => {
        p.drawText(c.label, { x: c.x + 3, y: yp + 1, size: 8, font: fontBold, color: rgb(1, 1, 1) });
      });
      return yp - 20;
    };

    y_pos = drawTableHeader(page, y_pos);

    // Rows
    for (let i = 0; i < records.length; i++) {
      if (y_pos < 60) {
        page = pdfDoc.addPage([W, H]);
        y_pos = await addLetterhead(page);
        y_pos -= 10;
        y_pos = drawTableHeader(page, y_pos);
      }

      const r = records[i];
      const rowBg = i % 2 === 0 ? rgb(0.97, 0.98, 1) : rgb(1, 1, 1);
      page.drawRectangle({ x: MARGIN, y: y_pos - 3, width: W - MARGIN * 2, height: 15, color: rowBg });

      const statusColors = { Present: rgb(0.09, 0.64, 0.27), Late: rgb(0.85, 0.47, 0.04), Absent: rgb(0.86, 0.15, 0.15) };
      const sColor = statusColors[r.status] || rgb(0.4, 0.4, 0.4);

      const rowData = [
        { col: cols[0], val: r.date },
        { col: cols[1], val: r.employeeId?.employeeId || '' },
        { col: cols[2], val: r.employeeId?.name || '' },
        { col: cols[3], val: r.employeeId?.role || '' },
        { col: cols[4], val: fmt(r.checkIn) },
        { col: cols[5], val: fmt(r.checkOut) },
        { col: cols[6], val: r.status, color: sColor },
      ];

      rowData.forEach(({ col, val, color }) => {
        page.drawText(String(val).substring(0, 18), {
          x: col.x + 3, y: y_pos, size: 8,
          font: color ? fontBold : fontReg,
          color: color || rgb(0.15, 0.15, 0.15),
        });
      });
      y_pos -= 15;
    }

    // Footer
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
      p.drawText(`Page ${idx + 1} of ${pages.length} — Shaurya Diagnostic Centre — Generated ${new Date().toLocaleDateString('en-IN')}`, {
        x: MARGIN, y: 20, size: 7, font: fontReg, color: rgb(0.6, 0.6, 0.6),
      });
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Attendance-${MONTHS[m]}-${y}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
