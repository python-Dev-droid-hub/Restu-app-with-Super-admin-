import mongoose from 'mongoose';

async function dropOldIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27019/restaurant_app');
    const db = mongoose.connection.db;
    
    if (!db) {
      console.error('Database connection not established');
      process.exit(1);
      return;
    }
    
    const indexes = await db.collection('favorites').indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Drop old problematic indexes
    for (const idx of indexes) {
      const name = idx.name;
      if (name && (name.includes('customer_1_branch') || name === 'customer_1_type_1_branch_1')) {
        try {
          await db.collection('favorites').dropIndex(name);
          console.log(`Dropped index: ${name}`);
        } catch (e: any) {
          console.log(`Could not drop ${name}: ${e.message}`);
        }
      }
    }
    
    console.log('Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropOldIndexes();
