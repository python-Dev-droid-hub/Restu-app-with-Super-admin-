import mongoose from 'mongoose';

async function checkDeals() {
  try {
    await mongoose.connect('mongodb://localhost:27017/restaurant_app');
    const db = mongoose.connection.db;
    
    if (!db) {
      console.error('Database connection not established');
      process.exit(1);
      return;
    }
    
    // Get all campaigns (without filter)
    const allCampaigns = await db.collection('dealcampaigns').find({}).toArray();
    console.log('Total campaigns in DB:', allCampaigns.length);
    
    for (const c of allCampaigns) {
      console.log('\n--- Campaign ---');
      console.log('  _id:', c._id);
      console.log('  name:', c.name);
      console.log('  status:', c.status);
      console.log('  deletedAt:', c.deletedAt);
      console.log('  startDate:', c.startDate);
      console.log('  endDate:', c.endDate);
      console.log('  branch:', c.branch);
      console.log('  deals count:', c.deals?.length || 0);
      if (c.deals?.length > 0) {
        console.log('  deals:', JSON.stringify(c.deals, null, 2));
      }
    }
    
    // Check the filter used by API
    const now = new Date();
    const filter: any = {
      deletedAt: null,
      status: 'ACTIVE',
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    };
    
    const activeCampaigns = await db.collection('dealcampaigns').find(filter).toArray();
    console.log('\n--- Active campaigns matching API filter ---');
    console.log('Count:', activeCampaigns.length);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeals();
