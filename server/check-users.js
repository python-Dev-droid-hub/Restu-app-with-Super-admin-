const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27019/restaurant_app');
  
  const chefId = '69a5b7d53102c8193f62e75f';
  const managerId = '69a1ff87478939bf1fd8a748';
  
  const { ObjectId } = mongoose.Types;
  
  // Simulate what the API does - get notifications for chef
  const chefNotifs = await mongoose.connection.db.collection('notifications')
    .find({ recipient: new ObjectId(chefId) })
    .sort({ createdAt: -1 })
    .limit(20)
    .skip(0)
    .toArray();
  
  console.log('Chef notifications (simulating API):', chefNotifs.length);
  chefNotifs.forEach(n => {
    console.log({
      _id: n._id.toString(),
      title: n.title,
      body: n.body,
      type: n.type,
      isRead: n.isRead
    });
  });
  
  // Check unread count
  const unreadCount = await mongoose.connection.db.collection('notifications')
    .countDocuments({ recipient: new ObjectId(chefId), isRead: false });
  console.log('\nUnread count for chef:', unreadCount);
  
  // Check manager notifications
  const managerNotifs = await mongoose.connection.db.collection('notifications')
    .find({ recipient: new ObjectId(managerId) })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  console.log('\nManager notifications:', managerNotifs.length);
  managerNotifs.forEach(n => {
    console.log({
      _id: n._id.toString(),
      title: n.title,
      body: n.body,
      type: n.type,
      isRead: n.isRead
    });
  });
  
  await mongoose.connection.close();
}

check().catch(console.error);
