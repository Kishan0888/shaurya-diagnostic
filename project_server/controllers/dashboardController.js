const Patient = require('../models/Patient');
const Invoice = require('../models/Invoice');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { getIstRange, listDays, istDateStr } = require('../utils/dateRange');
const { calcInvoice, round2 } = require('../utils/invoiceCalc');

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD   (defaults to today, IST)
exports.getDashboard = async (req, res) => {
  try {
    const { fromStr, toStr, start, end } = getIstRange(req.query.from, req.query.to);
    const days = listDays(fromStr, toStr);
    if (days.length > 366) {
      return res.status(400).json({ success: false, message: 'Please select a range of 1 year or less' });
    }
    const todayStr = istDateStr();
    const tz = '+05:30';

    const [
      patientsByDay,
      reportsByDay,
      invoices,
      attendance,
      totalEmployees,
      recentActivity,
    ] = await Promise.all([
      Patient.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, count: { $sum: 1 } } },
      ]),
      Patient.aggregate([
        { $match: { generatedPdf: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, count: { $sum: 1 } } },
      ]),
      Invoice.find({ date: { $gte: start, $lte: end } }).lean(),
      Attendance.find({ date: { $gte: fromStr, $lte: toStr } }).select('date checkIn').lean(),
      Employee.countDocuments({ isActive: true }),
      Patient.find({ createdAt: { $gte: start, $lte: end } })
        .select('patientId name testName createdAt')
        .sort('-createdAt')
        .limit(10),
    ]);

    // Day-wise buckets
    const daily = {};
    days.forEach(d => {
      daily[d] = { date: d, patients: 0, reports: 0, invoices: 0, grossAmount: 0, discount: 0, sales: 0, collected: 0, due: 0, present: 0 };
    });

    patientsByDay.forEach(p => { if (daily[p._id]) daily[p._id].patients = p.count; });
    reportsByDay.forEach(p => { if (daily[p._id]) daily[p._id].reports = p.count; });

    invoices.forEach(inv => {
      const d = istDateStr(new Date(inv.date || inv.createdAt));
      const row = daily[d];
      if (!row) return;
      const c = calcInvoice(inv);
      row.invoices += 1;
      row.grossAmount += c.grossAmount;
      row.discount += c.discount;
      row.sales += c.netAmount;
      row.collected += c.amountPaid;
      row.due += c.balanceAmount;
    });

    attendance.forEach(a => {
      if (a.checkIn && daily[a.date]) daily[a.date].present += 1;
    });

    const dailyList = days.map(d => {
      const r = daily[d];
      return { ...r, grossAmount: round2(r.grossAmount), discount: round2(r.discount), sales: round2(r.sales), collected: round2(r.collected), due: round2(r.due) };
    });

    const sum = (k) => round2(dailyList.reduce((s, r) => s + r[k], 0));
    const presentTotal = sum('present');
    const isSingleDay = days.length === 1;
    const presentToday = daily[todayStr]?.present ?? 0;

    const stats = {
      totalSales: sum('sales'),
      grossAmount: sum('grossAmount'),
      totalDiscount: sum('discount'),
      amountCollected: sum('collected'),
      balanceDue: sum('due'),
      totalPatients: sum('patients'),
      reportsGenerated: sum('reports'),
      totalInvoices: sum('invoices'),
      presentCount: presentTotal,
      avgPresentPerDay: days.length ? round2(presentTotal / days.length) : 0,
      totalEmployees,
      absentCount: isSingleDay ? Math.max(totalEmployees - presentTotal, 0) : null,

      // Backward-compatible keys (today / selected day)
      todayPatients: sum('patients'),
      todayInvoices: sum('invoices'),
      todayRevenue: sum('sales'),
      presentToday: isSingleDay ? presentTotal : presentToday,
      absentToday: isSingleDay ? Math.max(totalEmployees - presentTotal, 0) : Math.max(totalEmployees - presentToday, 0),
    };

    res.json({
      success: true,
      range: { from: fromStr, to: toStr, days: days.length },
      stats,
      daily: dailyList,
      weeklyPatients: dailyList.map(r => ({ _id: r.date, count: r.patients })),
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
