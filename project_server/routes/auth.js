const express = require('express');
const router = express.Router();
const {
  login, getMe, createUser, getUsers, updateUser,
  changePassword, resetPassword,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/users', protect, authorize('admin'), createUser);
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.post('/users/:id/reset-password', protect, authorize('admin'), resetPassword);
router.put('/change-password', protect, changePassword);

module.exports = router;
