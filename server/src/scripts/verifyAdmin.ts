import mongoose from 'mongoose';
import { User } from '@/models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyAdminUser() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_app';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@restaurant.com' }).select('+passwordHash');
    
    if (!adminUser) {
      console.log('❌ Admin user NOT FOUND!');
      console.log('Creating admin user...\n');
      
      const newAdmin = new User({
        email: 'admin@restaurant.com',
        passwordHash: 'admin123',
        displayName: 'Super Administrator',
        role: 'SUPER_ADMIN',
        phoneNumber: '+923001111111',
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
      });
      
      await newAdmin.save();
      console.log('✅ Admin user CREATED successfully!');
      console.log('Email: admin@restaurant.com');
      console.log('Password: admin123');
      console.log('Role: SUPER_ADMIN\n');
    } else {
      console.log('✅ Admin user FOUND!');
      console.log('Email:', adminUser.email);
      console.log('Role:', adminUser.role);
      console.log('isActive:', adminUser.isActive);
      console.log('emailVerified:', adminUser.emailVerified);
      
      // Test password
      const isPasswordValid = await adminUser.comparePassword('admin123');
      console.log('Password "admin123" is valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('\n⚠️  Password mismatch! Resetting password to "admin123"...');
        adminUser.passwordHash = 'admin123';
        await adminUser.save();
        console.log('✅ Password reset successfully!');
      }
    }
    
    // List all SUPER_ADMIN users
    console.log('\n--- All SUPER_ADMIN Users ---');
    const superAdmins = await User.find({ role: 'SUPER_ADMIN' }).select('-passwordHash');
    superAdmins.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.displayName} (${user.isActive ? 'Active' : 'Inactive'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyAdminUser().then(() => process.exit(0)).catch(() => process.exit(1));
