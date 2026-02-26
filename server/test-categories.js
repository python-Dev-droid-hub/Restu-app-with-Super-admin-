const mongoose = require('mongoose');

async function testCategories() {
  try {
    await mongoose.connect('mongodb://localhost:27017/restaurant_app');
    console.log('Connected to database');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Query categories collection directly
    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log('Categories found:', categories.length);
    console.log('Categories:', categories.map(c => ({ name: c.name, _id: c._id })));
    
    // Also try with Mongoose model
    const categorySchema = new mongoose.Schema({
      name: String,
      description: String,
      isActive: Boolean
    }, { timestamps: true });
    
    const Category = mongoose.model('Category', categorySchema);
    const cats = await Category.find({});
    console.log('Mongoose query found:', cats.length);
    
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCategories();
