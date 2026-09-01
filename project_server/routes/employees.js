const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createEmployee, getEmployees, updateEmployee, deleteEmployee } = require('../controllers/employeeController');

router.use(protect);
router.route('/')
  .get(authorize('admin', 'reception'), getEmployees)
  .post(authorize('admin'), createEmployee);
router.route('/:id')
  .put(authorize('admin'), updateEmployee)
  .delete(authorize('admin'), deleteEmployee);

module.exports = router;
