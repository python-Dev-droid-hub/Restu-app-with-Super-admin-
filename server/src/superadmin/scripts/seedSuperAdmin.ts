import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { SuperAdmin } from '@/superadmin/models/SuperAdmin';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function seedSuperAdmin() {
  await connectDatabase();

  const email = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]
    || 'platform@yourapp.com';
  const password = process.argv.find((a) => a.startsWith('--password='))?.split('=')[1]
    || 'SuperAdmin123!';
  const displayName = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1]
    || 'Platform Super Admin';

  const existing = await SuperAdmin.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Super admin ${email} already exists`);
    await disconnectDatabase();
    return;
  }

  await SuperAdmin.create({
    email: email.toLowerCase(),
    passwordHash: password,
    displayName,
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  console.log(`\nSuper admin created:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Login: POST /api/superadmin/auth/login`);

  await disconnectDatabase();
}

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
