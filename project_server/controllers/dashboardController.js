const Patient = require('../models/Patient');
const Invoice = require('../models/Invoice');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

exports.getDashboard = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      todayPatients,
      reportsGenerated,
      todayInvoices,
      attendanceToday,
      totalEmployees,
      weeklyPatients,
    ] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Patient.countDocuments({ generatedPdf: { $ne: null }, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Invoice.find({ date: { $gte: todayStart, $lte: todayEnd } }),
      Attendance.find({ date: todayStr }).populate('employeeId', 'name'),
      Employee.countDocuments({ isActive: true }),
      // Last 7 days patient count
      Patient.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.amount - (inv.discount || 0), 0);
    const presentToday = attendanceToday.filter(a => a.checkIn).length;

    res.json({
      success: true,
      stats: {
        todayPatients,
        reportsGenerated,
        todayInvoices: todayInvoices.length,
        todayRevenue,
        presentToday,
        totalEmployees,
        absentToday: totalEmployees - presentToday,
      },
      weeklyPatients,
      recentActivity: await Patient.find({ createdAt: { $gte: todayStart } })
        .select('patientId name testName createdAt')
        .sort('-createdAt')
        .limit(10),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
