import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ensureDefaultPlans } from '@/superadmin/services/planDefaults.service';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function seedPlans() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27019/restaurant_app';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await ensureDefaultPlans();

  await mongoose.disconnect();
  console.log('Done seeding plans');
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
