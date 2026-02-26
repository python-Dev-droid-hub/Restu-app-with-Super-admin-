import mongoose from 'mongoose';
import { User } from '@/models/User';
import { AuthService } from '../modules/auth/auth.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface UserSeedData {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'BRANCH_MANAGER' | 'CHEF' | 'WAITER' | 'RIDER' | 'CUSTOMER';
  phoneNumber?: string;
  // Role-specific fields
  vehicleNumber?: string;
  vehicleType?: string;
  specialization?: string;
  assignedSection?: string;
}

const usersToSeed: UserSeedData[] = [
  {
    name: 'Admin User',
    email: 'admin@restaurant.com',
    password: 'admin123',
    role: 'ADMIN',
    phoneNumber: '+92-300-1111111',
  },
  {
    name: 'Branch Manager',
    email: 'manager@restaurant.com',
    password: 'manager123',
    role: 'BRANCH_MANAGER',
    phoneNumber: '+92-300-2222222',
  },
  {
    name: 'Head Chef',
    email: 'chef@restaurant.com',
    password: 'chef123',
    role: 'CHEF',
    phoneNumber: '+92-300-3333333',
    specialization: 'Italian Cuisine',
  },
  {
    name: 'Waiter John',
    email: 'waiter@restaurant.com',
    password: 'waiter123',
    role: 'WAITER',
    phoneNumber: '+92-300-4444444',
    assignedSection: 'Main Hall',
  },
  {
    name: 'Rider Mike',
    email: 'rider@restaurant.com',
    password: 'rider123',
    role: 'RIDER',
    phoneNumber: '+92-300-5555555',
    vehicleNumber: 'LHR-1234',
    vehicleType: 'Motorcycle',
  },
  {
    name: 'Customer Sarah',
    email: 'customer@restaurant.com',
    password: 'customer123',
    role: 'CUSTOMER',
    phoneNumber: '+92-300-6666666',
  },
  {
    name: 'Customer Demo',
    email: 'demo@restaurant.com',
    password: 'demo123',
    role: 'CUSTOMER',
    phoneNumber: '+92-300-7777777',
  },
];

async function seedUsers() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    const authService = new AuthService();
    const createdUsers: Array<{ email: string; role: string; password: string }> = [];
    const updatedUsers: Array<{ email: string; role: string }> = [];

    for (const userData of usersToSeed) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });

        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          
          // Update role if different
          if (existingUser.role !== userData.role) {
            console.log(`   Updating role from ${existingUser.role} to ${userData.role}...`);
            existingUser.role = userData.role;
            await existingUser.save();
            updatedUsers.push({ email: userData.email, role: userData.role });
          }
          
          // Ensure user is active
          if (!existingUser.isActive) {
            console.log(`   Setting user to active...`);
            existingUser.isActive = true;
          }
          
          // Update role-specific fields
          if (userData.vehicleNumber) existingUser.vehicleNumber = userData.vehicleNumber;
          if (userData.vehicleType) existingUser.vehicleType = userData.vehicleType;
          if (userData.specialization) existingUser.specialization = userData.specialization;
          if (userData.assignedSection) existingUser.assignedSection = userData.assignedSection;
          if (userData.phoneNumber) existingUser.phoneNumber = userData.phoneNumber;
          
          await existingUser.save();
          console.log(`   ✅ User updated\n`);
        } else {
          // Create new user
          const { user } = await authService.register({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
          });

          // Set role-specific fields after registration
          if (userData.vehicleNumber) user.vehicleNumber = userData.vehicleNumber;
          if (userData.vehicleType) user.vehicleType = userData.vehicleType;
          if (userData.specialization) user.specialization = userData.specialization;
          if (userData.assignedSection) user.assignedSection = userData.assignedSection;
          if (userData.phoneNumber) user.phoneNumber = userData.phoneNumber;
          
          await user.save();

          createdUsers.push({
            email: userData.email,
            role: userData.role,
            password: userData.password,
          });
          
          console.log(`✅ Created ${userData.role}: ${userData.email}`);
          console.log(`   Password: ${userData.password}\n`);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${userData.email}:`, error);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(50));
    
    if (createdUsers.length > 0) {
      console.log(`\n🆕 Created ${createdUsers.length} new users:`);
      createdUsers.forEach(u => {
        console.log(`   • ${u.role}: ${u.email} / ${u.password}`);
      });
    }

    if (updatedUsers.length > 0) {
      console.log(`\n🔄 Updated ${updatedUsers.length} existing users:`);
      updatedUsers.forEach(u => {
        console.log(`   • ${u.email} → ${u.role}`);
      });
    }

    console.log(`\n👥 Total users in database: ${await User.countDocuments()}`);
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding users:', error);
    process.exit(1);
  }
}

// Run the script
seedUsers();
