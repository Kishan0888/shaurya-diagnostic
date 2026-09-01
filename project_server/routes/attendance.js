const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  checkIn, checkOut, getToday, getMonthly, manualEntry,
  selfCheckIn, selfCheckOut, getMyAttendance,
  exportExcel, exportPdf,
} = require('../controllers/attendanceController');

router.use(protect);

// Employee self-service (lab_staff)
router.post('/self/checkin', selfCheckIn);
router.post('/self/checkout', selfCheckOut);
router.get('/self/my', getMyAttendance);

// Admin/reception — mark for any employee
router.post('/checkin', authorize('admin', 'reception'), checkIn);
router.post('/checkout', authorize('admin', 'reception'), checkOut);

// View
router.get('/today', authorize('admin', 'reception'), getToday);
router.get('/monthly', authorize('admin', 'reception'), getMonthly);
router.post('/manual', authorize('admin'), manualEntry);

// Export
router.get('/export/excel', authorize('admin', 'reception'), exportExcel);
router.get('/export/pdf', authorize('admin', 'reception'), exportPdf);

module.exports = router;
