import mongoose from 'mongoose';
import { User } from '@/models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkUserStatus() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27019/restaurant_app');
    console.log('✅ Connected to database\n');

    // Get all users
    const allUsers = await User.find({ deletedAt: null }).select('displayName email role isActive');
    console.log('👥 All users in database:');
    allUsers.forEach(user => {
      console.log(`   ${user.role}: ${user.displayName} (${user.email}) - ${user.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // Get active users
    const activeUsers = await User.countDocuments({ isActive: true, deletedAt: null });
    const totalUsers = await User.countDocuments({ deletedAt: null });

    console.log(`\n📊 Active users: ${activeUsers}/${totalUsers}`);

    // Specifically check admin users
    const adminUsers = await User.find({ role: 'ADMIN', deletedAt: null }).select('displayName email isActive');
    console.log('\n👑 Admin users:');
    adminUsers.forEach(admin => {
      console.log(`   ${admin.displayName} (${admin.email}) - ${admin.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

checkUserStatus();
