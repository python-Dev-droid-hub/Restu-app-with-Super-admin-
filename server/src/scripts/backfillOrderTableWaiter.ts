/**
 * One-time backfill: persist tableNumber + waiterName on existing DINE_IN orders.
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/backfillOrderTableWaiter.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Order } from '@/models/Order';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const orders = await Order.find({ orderType: 'DINE_IN' })
    .populate('waiter', 'displayName email')
    .populate('table', 'tableNumber');

  let updated = 0;
  for (const doc of orders) {
    const o = doc.toObject() as any;
    const patch: Record<string, string> = {};

    if (!o.tableNumber) {
      if (o.table?.tableNumber) patch.tableNumber = String(o.table.tableNumber);
      else {
        const m = String(o.addressLine || '').match(/table\s*#?\s*([A-Za-z0-9_-]+)/i);
        if (m?.[1]) patch.tableNumber = m[1];
      }
    }

    if (!o.waiterName) {
      const w = o.waiter;
      if (w && typeof w === 'object') {
        const label =
          (w.displayName && String(w.displayName).trim()) ||
          (w.email ? String(w.email).split('@')[0] : '');
        if (label) patch.waiterName = label;
      }
    }

    if (Object.keys(patch).length) {
      await Order.updateOne({ _id: doc._id }, { $set: patch });
      updated += 1;
    }
  }

  console.log(`Backfill complete. Updated ${updated} of ${orders.length} dine-in orders.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
