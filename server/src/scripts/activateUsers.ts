import mongoose from 'mongoose';
import { User } from '@/models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function activateAllUsers() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Update all users to active
    const result = await User.updateMany(
      { deletedAt: null },
      { $set: { isActive: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users to active status`);

    // Show current active users count
    const activeUsers = await User.countDocuments({ isActive: true, deletedAt: null });
    const totalUsers = await User.countDocuments({ deletedAt: null });

    console.log(`📊 Active users: ${activeUsers}/${totalUsers}`);

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

activateAllUsers();
