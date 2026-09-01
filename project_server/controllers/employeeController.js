const Employee = require('../models/Employee');
const User = require('../models/User');

exports.createEmployee = async (req, res) => {
  try {
    const { name, role, mobile, email, createLogin, password } = req.body;

    // Create employee first
    const employee = await Employee.create({ name, role, mobile, email });

    let createdUser = null;

    if (createLogin && password && email) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Employee.findByIdAndDelete(employee._id);
        return res.status(400).json({ success: false, message: 'Email already registered as a user' });
      }

      // Map role to user role
      const userRole = (['admin', 'reception', 'lab_staff'].includes(role.toLowerCase().replace(' ', '_')))
        ? role.toLowerCase().replace(' ', '_')
        : 'lab_staff';

      createdUser = await User.create({
        name,
        email,
        password,
        role: userRole,
        employeeId: employee._id,
      });

      employee.userId = createdUser._id;
      await employee.save();
    }

    res.status(201).json({
      success: true,
      employee,
      userCreated: !!createdUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .populate('userId', 'email role isActive')
      .sort('name');
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { createLogin, password, ...updateData } = req.body;
    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });

    // If creating login access for existing employee
    if (createLogin && password && employee.email && !employee.userId) {
      const existing = await User.findOne({ email: employee.email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered as a user' });
      }
      const user = await User.create({
        name: employee.name,
        email: employee.email,
        password,
        role: 'lab_staff',
        employeeId: employee._id,
      });
      employee.userId = user._id;
      await employee.save();
    }

    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    // Deactivate linked user too
    if (employee?.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: false });
    }
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
