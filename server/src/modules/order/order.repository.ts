import { Order } from '@/models/Order';
import { User } from '@/models/User';
import { Branch } from '@/models/Branch';
import { Product } from '@/models/Product';
import { RestaurantTable } from '@/models/RestaurantTable';
import { Types } from 'mongoose';

export class OrderRepository {
  async create(orderData: any): Promise<any> {
    const order = new Order(orderData);
    return await order.save();
  }

  async findById(id: string | Types.ObjectId): Promise<any | null> {
    return await Order.findById(id)
      .populate('customer', 'displayName email phoneNumber')
      .populate('branch', 'branchName branchCode addressLine location lat lng')
      .populate('rider', 'displayName phoneNumber')
      .populate('waiter', 'displayName')
      .populate('chef', 'displayName')
      .populate('table', 'tableNumber seatingCapacity')
      .populate('items.product', 'name imageUrl hasSizes')
      .populate('items.size', 'sizeName')
      .populate('coupon', 'code discountType discountValue')
      .populate('deal', 'title discountType discountValue');
  }

  async updateById(id: string | Types.ObjectId, updateData: any): Promise<any | null> {
    console.log('[OrderRepository] updateById called with id:', id, 'updateData:', JSON.stringify(updateData));
    const result = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'displayName email phoneNumber')
      .populate('branch', 'branchName branchCode addressLine location lat lng')
      .populate('rider', 'displayName phoneNumber')
      .populate('waiter', 'displayName')
      .populate('chef', 'displayName')
      .populate('table', 'tableNumber seatingCapacity')
      .populate('items.product', 'name imageUrl hasSizes')
      .populate('items.size', 'sizeName')
      .populate('coupon', 'code discountType discountValue')
      .populate('deal', 'title discountType discountValue');
    
    console.log('[OrderRepository] Update result - paymentMethod:', result?.paymentMethod, 'paymentStatus:', result?.paymentStatus);
    return result;
  }

  async updateStatus(id: string | Types.ObjectId, status: string): Promise<any | null> {
    const order = await Order.findById(id);
    if (!order) return null;

    (order as any).updateStatus(status);
    return await order.save();
  }

  async findByCustomerId(
    customerId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ orders: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = { customer: customerId };
    
    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('branch', 'branchName branchCode')
        .populate('items.product', 'name imageUrl')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return { orders, total };
  }

  async findByBranchId(
    branchId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ orders: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Use branchId directly - MongoDB will handle string to ObjectId conversion
      const filter: any = { branch: branchId };
      
      if (status) {
        filter.status = status;
      }

      console.log('[findByBranchId] Query filter:', JSON.stringify(filter));
      console.log('[findByBranchId] BranchId type:', typeof branchId);

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('customer', 'displayName phoneNumber')
          .populate('items.product', 'name imageUrl')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter)
      ]);

      console.log('[findByBranchId] Found orders:', orders.length, 'Total:', total);
      return { orders, total };
    } catch (error: any) {
      console.error('[findByBranchId] ERROR:', error.message);
      console.error('[findByBranchId] Stack:', error.stack);
      throw error;
    }
  }

  async findByRiderId(
    riderId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ orders: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = { rider: riderId };
    
    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'displayName phoneNumber')
        .populate('branch', 'branchName branchCode addressLine city state country postalCode location lat lng')
        .populate('items.product', 'name imageUrl')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return { orders, total };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filter: any = {},
    sort: string = '-createdAt'
  ): Promise<{ orders: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'displayName email phoneNumber')
        .populate('branch', 'branchName branchCode')
        .populate('rider', 'displayName phoneNumber')
        .populate('waiter', 'displayName')
        .populate('chef', 'displayName')
        .populate('items.product', 'name imageUrl')
        .populate('coupon', 'code discountType discountValue')
        .populate('deal', 'title discountType discountValue')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return { orders, total };
  }

  async getOrdersByStatus(status: string, page: number = 1, limit: number = 10): Promise<{ orders: any[]; total: number }> {
    return await this.findAll(page, limit, { status });
  }

  async getPendingOrders(page: number = 1, limit: number = 10): Promise<{ orders: any[]; total: number }> {
    return await this.getOrdersByStatus('PENDING', page, limit);
  }

  async getActiveOrdersForRider(riderId: string | Types.ObjectId): Promise<any[]> {
    return await Order.find({
      rider: riderId,
      status: { $in: ['OUT_FOR_DELIVERY'] },
    })
      .populate('customer', 'displayName phoneNumber')
      .populate('branch', 'branchName branchCode addressLine city state country postalCode location lat lng')
      .populate('items.product', 'name imageUrl')
      .sort('createdAt');
  }

  async getAvailableOrdersForRiders(page: number = 1, limit: number = 10): Promise<{ orders: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const filter: any = {
      status: { $in: ['READY', 'PREPARING'] },
      orderType: 'DELIVERY',
      rider: { $exists: false },
    };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'displayName phoneNumber')
        .populate('branch', 'branchName branchCode addressLine city state country postalCode location lat lng')
        .populate('items.product', 'name imageUrl')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return { orders, total };
  }

  async assignRider(orderId: string | Types.ObjectId, riderId: string | Types.ObjectId): Promise<any | null> {
    return await this.updateById(orderId, {
      rider: riderId,
      status: 'RIDER_ASSIGNED',
    });
  }

  async cancelOrder(id: string | Types.ObjectId, reason?: string): Promise<any | null> {
    const order = await Order.findById(id);
    if (!order || !(order as any).canBeCancelled()) {
      return null;
    }

    (order as any).updateStatus('CANCELLED');
    if (reason) {
      (order as any).cancellationReason = reason;
    }
    
    return await order.save();
  }

  async updatePaymentStatus(id: string | Types.ObjectId, paymentStatus: string): Promise<any | null> {
    return await this.updateById(id, { paymentStatus });
  }

  async addReview(id: string | Types.ObjectId, foodRating?: number, serviceRating?: number, deliveryRating?: number): Promise<any | null> {
    const updateData: any = {};
    if (foodRating) updateData.foodRating = foodRating;
    if (serviceRating) updateData.serviceRating = serviceRating;
    if (deliveryRating) updateData.deliveryRating = deliveryRating;
    
    return await this.updateById(id, updateData);
  }

  async getOrderStats(branchId?: string | Types.ObjectId): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<string, number>;
    averageOrderValue: number;
  }> {
    const matchStage: any = {};
    if (branchId) {
      matchStage.branch = new Types.ObjectId(branchId);
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          ordersByStatus: {
            $push: '$status',
          },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      ordersByStatus: [],
      averageOrderValue: 0,
    };

    // Count orders by status
    const statusCounts: Record<string, number> = {};
    result.ordersByStatus.forEach((status: string) => {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      totalOrders: result.totalOrders,
      totalRevenue: result.totalRevenue,
      ordersByStatus: statusCounts,
      averageOrderValue: result.averageOrderValue,
    };
  }

  async getDailyStats(
    branchId?: string | Types.ObjectId,
    days: number = 30
  ): Promise<any[]> {
    const matchStage: any = {
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    };
    
    if (branchId) {
      matchStage.branch = new Types.ObjectId(branchId);
    }

    return await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
  }

  // New methods for branch-based operations
  async findByBranch(branchId: string, status?: string): Promise<any[]> {
    return await (Order as any).findByBranch(branchId, status);
  }

  async findByCustomer(customerId: string, status?: string): Promise<any[]> {
    return await (Order as any).findByCustomer(customerId, status);
  }

  async findAllOrders(filter: any = {}, page: number = 1, limit: number = 10): Promise<any[]> {
    const skip = (page - 1) * limit;

    return await Order.find(filter)
      .populate('customer', 'displayName email phoneNumber')
      .populate('branch', 'branchName branchCode addressLine city state')
      .populate('rider', 'displayName phoneNumber')
      .populate('waiter', 'displayName')
      .populate('chef', 'displayName')
      .populate('table', 'tableNumber')
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countOrders(filter: any = {}): Promise<number> {
    return await Order.countDocuments(filter);
  }

  async submitToKitchen(orderId: string, chefId?: string): Promise<any | null> {
    const order = await Order.findById(orderId);
    if (!order) {
      return null;
    }

    // Check if order is in PENDING status
    if ((order as any).status !== 'PENDING') {
      return null;
    }

    // Update status to KITCHEN_ACCEPTED
    (order as any).status = 'KITCHEN_ACCEPTED';
    (order as any).kitchenAcceptedAt = new Date();
    if (chefId) {
      (order as any).chef = new Types.ObjectId(chefId);
    }

    return await order.save();
  }
}
