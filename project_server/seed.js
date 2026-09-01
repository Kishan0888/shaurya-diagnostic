require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Patient = require('./models/Patient');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create admin user
    const existing = await User.findOne({ email: 'admin@shaurya.com' });
    if (!existing) {
      await User.create({ name: 'Admin', email: 'admin@shaurya.com', password: 'admin123', role: 'admin' });
      console.log('✓ Admin user created — admin@shaurya.com / admin123');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Create reception user
    const recExisting = await User.findOne({ email: 'reception@shaurya.com' });
    if (!recExisting) {
      await User.create({ name: 'Reception Staff', email: 'reception@shaurya.com', password: 'reception123', role: 'reception' });
      console.log('✓ Reception user created — reception@shaurya.com / reception123');
    }

    // Create lab staff user
    const labExisting = await User.findOne({ email: 'lab@shaurya.com' });
    if (!labExisting) {
      await User.create({ name: 'Lab Technician', email: 'lab@shaurya.com', password: 'lab123', role: 'lab_staff' });
      console.log('✓ Lab staff user created — lab@shaurya.com / lab123');
    }

    // Create sample employees
    const empCount = await Employee.countDocuments();
    if (empCount === 0) {
      await Employee.insertMany([
  {
    employeeId: 'EMP001',
    name: 'Ravi Kumar',
    role: 'Lab Technician',
    mobile: '9876543210',
    email: 'ravi@shaurya.com'
  },
  {
    employeeId: 'EMP002',
    name: 'Priya Sharma',
    role: 'Receptionist',
    mobile: '9876543211',
    email: 'priya@shaurya.com'
  },
  {
    employeeId: 'EMP003',
    name: 'Amit Singh',
    role: 'Lab Technician',
    mobile: '9876543212',
    email: 'amit@shaurya.com'
  },
  {
    employeeId: 'EMP004',
    name: 'Sunita Devi',
    role: 'Helper',
    mobile: '9876543213'
  }
]);
      console.log('✓ Sample employees created');
    } else {
      console.log('✓ Employees already exist');
    }

    console.log('\n✅ Seed complete. Login credentials:');
    console.log('   Admin:     admin@shaurya.com     / admin123');
    console.log('   Reception: reception@shaurya.com / reception123');
    console.log('   Lab Staff: lab@shaurya.com       / lab123\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
