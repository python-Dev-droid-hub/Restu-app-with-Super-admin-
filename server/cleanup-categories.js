const mongoose = require('mongoose');

async function cleanup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/restaurant_app');
    console.log('Connected to database');
    
    // Delete all categories except Shawarma
    const result = await mongoose.connection.db.collection('categories').deleteMany({
      name: { $ne: 'Shawarma' }
    });
    
    console.log('Deleted categories:', result.deletedCount);
    
    // Verify remaining
    const remaining = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log('Remaining categories:', remaining.map(c => ({ name: c.name, id: c._id })));
    
    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();
