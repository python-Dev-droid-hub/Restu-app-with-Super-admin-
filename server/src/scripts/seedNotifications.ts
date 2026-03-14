import { Notification } from '../models/Notification';

export const seedNotifications = async () => {
  try {
    // Check if notifications already exist
    const existingCount = await Notification.countDocuments();
    if (existingCount > 0) {
      console.log('Notifications already exist, skipping seed');
      return;
    }

    // Create some sample notifications for admin
    const sampleNotifications = [
      {
        recipient: null, // System-wide notification for admin
        title: 'Welcome to Restaurant Admin',
        body: 'Your restaurant management system is now active and ready to use.',
        type: 'SYSTEM',
        priority: 'HIGH',
        isRead: false,
      },
      {
        recipient: null,
        title: 'New Order Received',
        body: 'A new order has been placed for delivery. Order #ORD-001',
        type: 'ORDER_ALERT',
        priority: 'NORMAL',
        isRead: false,
        data: { orderId: 'sample-order-1' },
      },
      {
        recipient: null,
        title: 'System Maintenance Completed',
        body: 'Scheduled maintenance has been completed successfully.',
        type: 'SYSTEM',
        priority: 'NORMAL',
        isRead: true,
      },
      {
        recipient: null,
        title: 'Payment Alert',
        body: 'A payment of Rs. 1,250 has been processed successfully.',
        type: 'PAYMENT_ALERT',
        priority: 'LOW',
        isRead: false,
      },
      {
        recipient: null,
        title: 'Branch Status Update',
        body: 'Branch "Link Road" is now open and accepting orders.',
        type: 'SYSTEM',
        priority: 'NORMAL',
        isRead: false,
      },
    ];

    for (const notificationData of sampleNotifications) {
      await Notification.create(notificationData);
    }

    console.log('Sample notifications created successfully');
  } catch (error) {
    console.error('Error seeding notifications:', error);
  }
};
