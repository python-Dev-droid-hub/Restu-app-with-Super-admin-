import NotificationService from './notificationService';
import { Order } from '../models/Order';
import { User } from '../models/User';

const getOrderTotal = (order: any) => order?.totalAmount ?? 0;
const getUserDisplayName = (user: any) => user?.displayName || 'Unknown';
const getUserPhone = (user: any) => user?.phoneNumber;
const getOrderTableNumber = (order: any) => order?.table?.tableNumber;

class OrderNotificationService {
  /**
   * Order placed - notify kitchen staff and customer
   */
  static async notifyOrderPlaced(orderId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('branch')
        .populate('items.product');

      if (!order || !order.branch) return;

      console.log('[Order Event] Order placed:', orderId);

      // Notify all CHEF in the branch
      await NotificationService.notifyByRole({
        role: 'CHEF',
        branchId: order.branch._id.toString(),
        type: 'NEW_COOKING_ORDER',
        title: 'New Order to Cook',
        message: `Order #${order.orderNumber} is ready to be prepared (${order.items.length} items)`,
        priority: 'HIGH',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          items: order.items.length,
          total: getOrderTotal(order),
        },
      });

      // Notify BRANCH_MANAGER
      await NotificationService.notifyByRole({
        role: 'BRANCH_MANAGER',
        branchId: order.branch._id.toString(),
        type: 'BRANCH_ORDER',
        title: 'New Order Received',
        message: `Order #${order.orderNumber} - $${getOrderTotal(order)} received`,
        priority: 'MEDIUM',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: getOrderTotal(order),
          items: order.items.length,
        },
      });

      // Notify CUSTOMER
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'ORDER_PLACED',
          title: 'Order Confirmed',
          message: `Your order #${order.orderNumber} has been received and is being prepared`,
          priority: 'MEDIUM',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            estimatedTime: 30,
          },
          relatedOrder: order._id.toString(),
        });
      }
    } catch (error) {
      console.error('[Order Event] Order placed error:', error);
    }
  }

  /**
   * Order preparing - notify customer
   */
  static async notifyOrderPreparing(orderId: string) {
    try {
      const order = await Order.findById(orderId).populate('customer');
      if (!order || !order.customer) return;

      console.log('[Order Event] Order preparing:', orderId);

      await NotificationService.sendNotification({
        recipient: order.customer._id.toString(),
        recipientRole: 'CUSTOMER',
        type: 'ORDER_PREPARING',
        title: 'Order is Being Prepared',
        message: `Your order #${order.orderNumber} is being prepared by our kitchen team`,
        priority: 'LOW',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          estimatedTime: 15,
        },
        relatedOrder: order._id.toString(),
      });
    } catch (error) {
      console.error('[Order Event] Order preparing error:', error);
    }
  }

  /**
   * Order ready - notify customer, rider, and manager
   */
  static async notifyOrderReady(orderId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('rider')
        .populate('branch')
        .populate('table');

      if (!order) return;

      console.log('[Order Event] Order ready:', orderId);

      const orderTypeText = order.orderType === 'DELIVERY' ? 'delivery' : 'pickup';

      // Notify customer
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'ORDER_READY',
          title: 'Order is Ready!',
          message: `Your order #${order.orderNumber} is ready for ${orderTypeText}`,
          priority: 'HIGH',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify assigned rider (if delivery)
      if (order.rider && order.orderType === 'DELIVERY') {
        await NotificationService.sendNotification({
          recipient: order.rider._id.toString(),
          recipientRole: 'RIDER',
          type: 'DELIVERY_UPDATED',
          title: 'Order Ready for Pickup',
          message: `Order #${order.orderNumber} is ready. Proceed to branch for pickup.`,
          priority: 'HIGH',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            branchId: order.branch?._id,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify waiters for dine-in
      if (order.orderType === 'DINE_IN' && order.branch) {
        await NotificationService.notifyByRole({
          role: 'WAITER',
          branchId: order.branch._id.toString(),
          type: 'KITCHEN_READY',
          title: 'Order Ready for Table',
          message: `Order #${order.orderNumber} is ready to serve`,
          priority: 'HIGH',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: getOrderTableNumber(order),
          },
        });
      }
    } catch (error) {
      console.error('[Order Event] Order ready error:', error);
    }
  }

  /**
   * Rider assigned - notify customer and rider
   */
  static async notifyRiderAssigned(orderId: string, riderId: string) {
    try {
      const order = await Order.findById(orderId).populate('customer');
      const rider = await User.findById(riderId);

      if (!order || !rider) return;

      console.log('[Order Event] Rider assigned:', { orderId, riderId });

      // Notify customer
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'RIDER_ASSIGNED',
          title: 'Rider Assigned',
          message: `${rider.displayName || 'A rider'} has been assigned to deliver your order #${order.orderNumber}`,
          priority: 'MEDIUM',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            riderId: rider._id,
            riderName: getUserDisplayName(rider),
            riderPhone: getUserPhone(rider),
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify rider
      await NotificationService.sendNotification({
        recipient: rider._id.toString(),
        recipientRole: 'RIDER',
        type: 'DELIVERY_ASSIGNED',
        title: 'New Delivery Assignment',
        message: `You've been assigned order #${order.orderNumber}. Review details and accept.`,
        priority: 'HIGH',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerAddress: order.addressLine,
          estimatedEarning: order.deliveryFee,
        },
        relatedOrder: order._id.toString(),
      });
    } catch (error) {
      console.error('[Order Event] Rider assigned error:', error);
    }
  }

  /**
   * Order out for delivery - notify customer
   */
  static async notifyOrderOutForDelivery(orderId: string, riderId: string) {
    try {
      const order = await Order.findById(orderId).populate('customer');
      const rider = await User.findById(riderId);

      if (!order || !rider || !order.customer) return;

      console.log('[Order Event] Out for delivery:', orderId);

      await NotificationService.sendNotification({
        recipient: order.customer._id.toString(),
        recipientRole: 'CUSTOMER',
        type: 'ORDER_OUT_FOR_DELIVERY',
        title: 'Your Order is on the Way!',
        message: `${rider.displayName || 'Your rider'} is on the way with your order #${order.orderNumber}`,
        priority: 'HIGH',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          riderId: rider._id,
          riderName: getUserDisplayName(rider),
          riderPhone: getUserPhone(rider),
        },
        relatedOrder: order._id.toString(),
      });
    } catch (error) {
      console.error('[Order Event] Out for delivery error:', error);
    }
  }

  /**
   * Order delivered - notify customer, rider earnings, and manager
   */
  static async notifyOrderDelivered(orderId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('rider')
        .populate('branch');

      if (!order) return;

      console.log('[Order Event] Order delivered:', orderId);

      // Notify customer
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'ORDER_DELIVERED',
          title: 'Order Delivered!',
          message: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!`,
          priority: 'MEDIUM',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            deliveredAt: new Date(),
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify rider about earnings
      if (order.rider) {
        await NotificationService.sendNotification({
          recipient: order.rider._id.toString(),
          recipientRole: 'RIDER',
          type: 'EARNINGS_UPDATE',
          title: 'Earnings Added',
          message: `$${order.deliveryFee || 0} earned for delivering order #${order.orderNumber}`,
          priority: 'LOW',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            earning: order.deliveryFee,
            totalDelivered: 1,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify branch manager
      if (order.branch) {
        await NotificationService.notifyByRole({
          role: 'BRANCH_MANAGER',
          branchId: order.branch._id.toString(),
          type: 'DELIVERY_ALERT',
          title: 'Order Delivered',
          message: `Order #${order.orderNumber} successfully delivered`,
          priority: 'LOW',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
          },
        });
      }
    } catch (error) {
      console.error('[Order Event] Order delivered error:', error);
    }
  }

  /**
   * Order cancelled - notify all parties
   */
  static async notifyOrderCancelled(orderId: string, reason?: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('rider')
        .populate('branch');

      if (!order) return;

      console.log('[Order Event] Order cancelled:', orderId);

      const message = reason
        ? `Order #${order.orderNumber} has been cancelled. Reason: ${reason}`
        : `Order #${order.orderNumber} has been cancelled`;

      // Notify customer
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'ORDER_CANCELLED',
          title: 'Order Cancelled',
          message: message,
          priority: 'HIGH',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            reason: reason,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify rider (if assigned)
      if (order.rider) {
        await NotificationService.sendNotification({
          recipient: order.rider._id.toString(),
          recipientRole: 'RIDER',
          type: 'DELIVERY_UPDATED',
          title: 'Delivery Cancelled',
          message: `Order #${order.orderNumber} has been cancelled`,
          priority: 'HIGH',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify kitchen staff
      if (order.branch) {
        await NotificationService.notifyByRole({
          role: 'CHEF',
          branchId: order.branch._id.toString(),
          type: 'ORDER_CANCELLED',
          title: 'Order Cancelled',
          message: `Order #${order.orderNumber} has been cancelled. Stop preparation if not ready.`,
          priority: 'URGENT',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
          },
        });
      }
    } catch (error) {
      console.error('[Order Event] Order cancelled error:', error);
    }
  }

  /**
   * Payment received - notify customer and manager
   */
  static async notifyPaymentReceived(orderId: string, amount: number) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('branch');

      if (!order) return;

      console.log('[Order Event] Payment received:', { orderId, amount });

      // Notify customer
      if (order.customer) {
        await NotificationService.sendNotification({
          recipient: order.customer._id.toString(),
          recipientRole: 'CUSTOMER',
          type: 'PAYMENT_SUCCESS',
          title: 'Payment Confirmed',
          message: `Payment of $${amount} for order #${order.orderNumber} has been received`,
          priority: 'MEDIUM',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: amount,
          },
          relatedOrder: order._id.toString(),
        });
      }

      // Notify branch manager
      if (order.branch) {
        await NotificationService.notifyByRole({
          role: 'BRANCH_MANAGER',
          branchId: order.branch._id.toString(),
          type: 'REVENUE_UPDATE',
          title: 'Payment Received',
          message: `$${amount} received for order #${order.orderNumber}`,
          priority: 'MEDIUM',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: amount,
          },
        });
      }
    } catch (error) {
      console.error('[Order Event] Payment error:', error);
    }
  }

  /**
   * Rider accepted delivery
   */
  static async notifyRiderAccepted(orderId: string, riderId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('branch');

      if (!order || !order.branch) return;

      console.log('[Order Event] Rider accepted:', { orderId, riderId });

      // Notify branch manager
      await NotificationService.notifyByRole({
        role: 'BRANCH_MANAGER',
        branchId: order.branch._id.toString(),
        type: 'DELIVERY_ALERT',
        title: 'Rider Accepted Delivery',
        message: `A rider has accepted order #${order.orderNumber} for delivery`,
        priority: 'MEDIUM',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          riderId: riderId,
        },
      });
    } catch (error) {
      console.error('[Order Event] Rider accepted error:', error);
    }
  }

  /**
   * Rider picked up order
   */
  static async notifyRiderPickedUp(orderId: string, riderId: string) {
    try {
      const order = await Order.findById(orderId).populate('customer');
      const rider = await User.findById(riderId);

      if (!order || !rider || !order.customer) return;

      console.log('[Order Event] Rider picked up:', { orderId, riderId });

      await NotificationService.sendNotification({
        recipient: order.customer._id.toString(),
        recipientRole: 'CUSTOMER',
        type: 'ORDER_OUT_FOR_DELIVERY',
        title: 'Rider Picked Up Your Order',
        message: `${rider.displayName || 'Your rider'} has picked up order #${order.orderNumber} and is on the way`,
        priority: 'HIGH',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          riderId: rider._id,
          riderName: getUserDisplayName(rider),
          riderPhone: getUserPhone(rider),
        },
        relatedOrder: order._id.toString(),
      });
    } catch (error) {
      console.error('[Order Event] Rider picked up error:', error);
    }
  }
}

export default OrderNotificationService;
