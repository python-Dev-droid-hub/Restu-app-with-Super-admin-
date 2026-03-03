import mongoose from 'mongoose';
import { Order } from './src/models/Order';

async function createTestOrder() {
  try {
    await mongoose.connect('mongodb://localhost:27017/restaurant-app');
    console.log('Connected to MongoDB');
    
    const branchId = '69a1ff3c478939bf1fd8a73c';
    
    // Create a test order
    const testOrder = new Order({
      orderNumber: 'TEST-001',
      branch: branchId,
      customer: new mongoose.Types.ObjectId(),
      status: 'PENDING',
      orderType: 'DINE_IN',
      items: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: 25
      }],
      subtotal: 50,
      totalAmount: 50,
      finalAmount: 50,
      paymentStatus: 'PENDING'
    });
    
    await testOrder.save();
    console.log('Test order created:', testOrder._id);
    console.log('Order details:', JSON.stringify(testOrder, null, 2));
    
    // Verify it was created
    const count = await Order.countDocuments({ branch: branchId });
    console.log('Total orders for branch:', count);
    
    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestOrder();
