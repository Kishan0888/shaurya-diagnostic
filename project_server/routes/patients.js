const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createPatient, getPatients, getPatient,
  updatePatient, deletePatient, getTodayPatients,
} = require('../controllers/patientController');

router.use(protect);
router.use(authorize('admin', 'reception'));

router.get('/today', getTodayPatients);
router.route('/').get(getPatients).post(createPatient);
router.route('/:id').get(getPatient).put(updatePatient).delete(deletePatient);

module.exports = router;
