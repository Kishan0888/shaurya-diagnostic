const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createInvoice, getInvoices, getInvoice, downloadInvoicePdf, getTodayStats } = require('../controllers/invoiceController');

router.use(protect);
router.use(authorize('admin', 'reception'));

router.get('/stats/today', getTodayStats);
router.route('/').get(getInvoices).post(createInvoice);
router.get('/:id', getInvoice);
router.get('/:id/pdf', downloadInvoicePdf);

module.exports = router;
