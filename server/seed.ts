require('ts-node/register');
require('dotenv').config();

const mongoose = require('mongoose');

async function seed() {
  try {
    // Import the actual User model
    const { User } = require('./src/models');
    const { Branch } = require('./src/models');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_app');
    console.log('Connected to MongoDB');

    // Find existing branch
    const existingBranch = await Branch.findOne({ deletedAt: null });
    console.log('Existing branch:', existingBranch ? existingBranch.branchName : 'None found');

    // Delete existing
    await User.deleteMany({ email: { $in: ['admin@restaurant.com', 'manager@restaurant.com'] } });
    console.log('Cleared existing users');

    // Create SUPER_ADMIN
    const superAdmin = new User({
      email: 'admin@restaurant.com',
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: 'Admin123!',
      phoneNumber: '+923001234567',
      emailVerified: true,
      isActive: true,
    });

    // Create BRANCH_MANAGER with assigned branch
    const branchManager = new User({
      email: 'manager@restaurant.com',
      displayName: 'Branch Manager',
      role: 'BRANCH_MANAGER',
      passwordHash: 'manager123',
      phoneNumber: '+923007654321',
      emailVerified: true,
      isActive: true,
      assignedBranch: existingBranch ? existingBranch._id : null,
    });

    await superAdmin.save();
    console.log('✅ Created SUPER_ADMIN: admin@restaurant.com / Admin123!');

    await branchManager.save();
    console.log('✅ Created BRANCH_MANAGER: manager@restaurant.com / manager123');

    // Update branch with manager if exists
    if (existingBranch) {
      await Branch.findByIdAndUpdate(existingBranch._id, {
        branchManager: branchManager._id
      });
      console.log(`✅ Assigned branch "${existingBranch.branchName}" to manager`);
      console.log(`   Branch Code: ${existingBranch.branchCode}`);
    } else {
      console.log('⚠️  No branch found in database. Please create a branch first.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
