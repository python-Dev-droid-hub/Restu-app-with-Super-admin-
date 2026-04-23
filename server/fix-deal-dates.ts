import mongoose from 'mongoose';

async function fixDealDates() {
  try {
    await mongoose.connect('mongodb://localhost:27019/restaurant_app');
    const db = mongoose.connection.db;
    
    if (!db) {
      console.error('Database connection not established');
      process.exit(1);
      return;
    }
    
    // Update the campaign to extend endDate to 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    const result = await db.collection('dealcampaigns').updateOne(
      { _id: new mongoose.Types.ObjectId('69b1c82acb44cce20373d39e') },
      { $set: { endDate: oneYearFromNow } }
    );
    
    console.log('Updated campaign:', result.modifiedCount, 'document(s)');
    
    // Verify
    const campaign = await db.collection('dealcampaigns').findOne({ _id: new mongoose.Types.ObjectId('69b1c82acb44cce20373d39e') });
    console.log('New endDate:', campaign?.endDate);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDealDates();
