const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadReport, downloadReport, regenerateReport } = require('../controllers/reportController');

router.use(protect);
router.use(authorize('admin', 'reception', 'lab_staff'));

router.post('/:patientId/upload', upload.single('report'), uploadReport);
router.get('/:patientId/download', downloadReport);
router.post('/:patientId/regenerate', regenerateReport);

module.exports = router;
