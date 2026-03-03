// Run this script to fix the table index
// Usage: npx ts-node src/scripts/fixTableIndex.ts

import mongoose from 'mongoose';
import { RestaurantTable } from '../models/RestaurantTable';
import dotenv from 'dotenv';

dotenv.config();

async function fixTableIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_app');
    console.log('Connected to MongoDB');

    // Drop the old index
    try {
      await RestaurantTable.collection.dropIndex('branch_1_tableNumber_1');
      console.log('Dropped old index: branch_1_tableNumber_1');
    } catch (e: any) {
      if (e.message.includes('index not found')) {
        console.log('Index already dropped or does not exist');
      } else {
        console.error('Error dropping index:', e.message);
      }
    }

    // Sync indexes to recreate with new definition
    await RestaurantTable.syncIndexes();
    console.log('Synced indexes successfully');

    // Show current indexes
    const indexes = await RestaurantTable.collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTableIndex();
