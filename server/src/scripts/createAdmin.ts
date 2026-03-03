import mongoose from 'mongoose';
import { User } from '@/models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface CreateAdminOptions {
  email: string;
  password: string;
  displayName: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phoneNumber?: string;
}

async function createAdminUser(options: CreateAdminOptions) {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_app';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: options.email });
    if (existingUser) {
      console.log(`User with email ${options.email} already exists`);
      console.log('Updating user to SUPER_ADMIN role...');
      existingUser.role = options.role;
      await existingUser.save();
      console.log('User updated successfully!');
      return existingUser;
    }

    // Create new admin user
    const adminUser = new User({
      email: options.email,
      passwordHash: options.password,
      displayName: options.displayName,
      role: options.role,
      phoneNumber: options.phoneNumber,
      emailVerified: true,
      phoneVerified: true,
      isActive: true,
    });

    await adminUser.save();
    console.log(`\n✅ ${options.role} user created successfully!`);
    console.log(`Email: ${options.email}`);
    console.log(`Password: ${options.password}`);
    console.log(`Role: ${options.role}`);
    
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1] || 'superadmin@restaurant.com';
const password = args.find(arg => arg.startsWith('--password='))?.split('=')[1] || 'SuperAdmin123!';
const displayName = args.find(arg => arg.startsWith('--name='))?.split('=')[1] || 'Super Administrator';
const role = (args.find(arg => arg.startsWith('--role='))?.split('=')[1] || 'SUPER_ADMIN') as 'ADMIN' | 'SUPER_ADMIN';
const phoneNumber = args.find(arg => arg.startsWith('--phone='))?.split('=')[1] || '+923000000000';

// Run the script
createAdminUser({
  email,
  password,
  displayName,
  role,
  phoneNumber,
}).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
