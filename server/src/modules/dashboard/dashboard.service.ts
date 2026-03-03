import { User } from '@/models/User';
import { Order } from '@/models/Order';
import { Branch } from '@/models/Branch';
import { Payment } from '@/models/Payment';
import { Product } from '@/models/Product';

export class DashboardService {
  // Super Admin Dashboard Stats
  async getSuperAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's orders
    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Total items sold today
    const todayOrders = await Order.find({
      createdAt: { $gte: today }
    }).select('items');
    
    const totalItemsSold = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
    }, 0);
    
    // Today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // Total branches - count ALL branches (active and inactive)
    const totalBranches = await Branch.countDocuments();
    
    // Total users (customers)
    const totalUsers = await User.countDocuments({ role: 'CUSTOMER' });
    
    // Top performing branches (by orders)
    const topBranches = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: '$branch', orderCount: { $sum: 1 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);
    
    // Get branch names
    const branchIds = topBranches.map(b => b._id);
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('branchName');
    
    const topPerformingBranches = topBranches.map(tb => {
      const branch = branches.find(b => b._id.toString() === tb._id.toString());
      return {
        name: branch?.branchName || 'Unknown Branch',
        performance: Math.min(Math.round((tb.orderCount / ordersToday) * 100) || 0, 100)
      };
    });
    
    return {
      ordersToday,
      totalItemsSold,
      todayRevenue,
      totalBranches,
      totalUsers,
      topPerformingBranches
    };
  }

  // Super Admin Branches Data
  async getSuperAdminBranches() {
    const branches = await Branch.find()
      .select('branchName addressLine city isActive createdAt');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        // Get today's orders for this branch
        const todayOrders = await Order.countDocuments({
          branch: branch._id,
          createdAt: { $gte: today }
        });
        
        // Get total orders
        const totalOrders = await Order.countDocuments({
          branch: branch._id
        });
        
        // Get today's revenue
        const revenue = await Order.aggregate([
          { $match: { branch: branch._id, createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).then(result => result[0]?.total || 0);
        
        // Calculate performance (mock logic based on today's orders)
        const performance = Math.min(Math.round((todayOrders / 50) * 100), 100); // Assuming 50 orders is 100%
        
        return {
          id: branch._id,
          name: branch.branchName,
          location: `${branch.addressLine}, ${branch.city}`,
          manager: 'No Manager',
          performance,
          orders: todayOrders,
          revenue,
          status: branch.isActive ? 'active' : 'inactive'
        };
      })
    );
    
    return branchesWithStats;
  }

  // Super Admin Revenue Data
  async getSuperAdminRevenue(timeRange: string = '30d') {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Total revenue in period
    const totalRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // Pending payouts (mock calculation - 70% of revenue)
    const pendingPayouts = Math.round(totalRevenue * 0.7);
    
    // Monthly report data
    const monthlyReport = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Branch-wise revenue
    const branchRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$branch', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    
    const branchIds = branchRevenue.map(b => b._id);
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('branchName');
    
    const branchWiseData = branchRevenue.map(br => {
      const branch = branches.find(b => b._id.toString() === br._id.toString());
      return {
        name: branch?.branchName || 'Unknown Branch',
        revenue: br.revenue,
        orders: br.orders,
        percentage: totalRevenue > 0 ? Math.round((br.revenue / totalRevenue) * 100) : 0
      };
    });
    
    return {
      totalRevenue,
      pendingPayouts,
      monthlyReport: monthlyReport.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        revenue: m.revenue,
        orders: m.orders
      })),
      branchWise: branchWiseData
    };
  }

  // Admin Dashboard Stats
  async getAdminStats() {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalCustomers = await User.countDocuments({ isActive: true, role: 'CUSTOMER' });
    const totalRestaurants = await Branch.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({ deletedAt: null });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    return {
      totalUsers: totalCustomers,
      totalRestaurants,
      totalOrders,
      totalProducts,
      totalRevenue,
      usersChange: 12,
      restaurantsChange: 5,
      ordersChange: 18,
      revenueChange: 23
    };
  }

  // Admin Analytics with time range filtering
  async getAdminAnalytics(timeRange: string = '30d') {
    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Total revenue for the period
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    // Total orders for the period
    const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate } });

    // Average order value
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Revenue by month
    const revenueByMonth = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          revenue: 1,
          orders: 1
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top restaurants
    const topRestaurants = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $lookup: {
          from: 'branches',
          localField: 'order.branch',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $group: {
          _id: '$branch._id',
          name: { $first: '$branch.branchName' },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // User growth data (simplified - using user registration dates)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          users: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          users: 1
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Order status distribution
    const orderStatusDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Convert status distribution to expected format
    const statusMap: { [key: string]: number } = {
      PENDING: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      READY: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0
    };

    orderStatusDistribution.forEach((item: any) => {
      const status = item.status.toLowerCase().replace(/\s+/g, '_');
      if (statusMap.hasOwnProperty(status.toUpperCase())) {
        statusMap[status.toUpperCase()] = item.count;
      }
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topRestaurants: topRestaurants.map(r => ({
        name: r.name || 'Unknown Restaurant',
        revenue: r.revenue,
        orders: r.orders
      })),
      revenueByMonth: revenueByMonth.map(r => ({
        month: r.month,
        revenue: r.revenue,
        orders: r.orders
      })),
      userGrowth: userGrowth.map(u => ({
        month: u.month,
        users: u.users
      })),
      orderStatusDistribution: statusMap
    };
  }

  // Customer Dashboard Stats
  async getCustomerStats(userId: string) {
    const totalOrders = await Order.countDocuments({ customer: userId });
    const recentOrders = await Order.find({ customer: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product');

    return {
      totalOrders,
      recentOrders,
      favorites: []
    };
  }

  // Rider Dashboard Stats
  async getRiderStats(riderId: string) {
    const assignedDeliveries = await Order.countDocuments({ 
      assignedRider: riderId,
      status: { $in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] }
    });
    const completedDeliveries = await Order.countDocuments({
      assignedRider: riderId,
      status: 'DELIVERED'
    });

    return {
      assignedDeliveries,
      completedDeliveries,
      todayEarnings: 0,
      weeklyEarnings: 0
    };
  }

  // Rider Earnings
  async getRiderEarnings(riderId: string) {
    const rider = await User.findById(riderId);
    if (!rider) {
      return {
        totalEarnings: 0,
        thisWeekEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        weeklyBreakdown: []
      };
    }

    // Calculate total earnings from completed deliveries
    const totalEarnings = await Payment.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: { 'order.assignedRider': rider._id, 'order.status': 'DELIVERED', status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
    ]).then(result => result[0]?.total || 0);

    // Calculate this week's earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekEarnings = await Payment.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $match: {
          'order.assignedRider': rider._id,
          'order.status': 'DELIVERED',
          status: 'COMPLETED',
          createdAt: { $gte: weekStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
    ]).then(result => result[0]?.total || 0);

    // Calculate this month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthEarnings = await Payment.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $match: {
          'order.assignedRider': rider._id,
          'order.status': 'DELIVERED',
          status: 'COMPLETED',
          createdAt: { $gte: monthStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
    ]).then(result => result[0]?.total || 0);

    // Calculate last month's earnings
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0); // Last day of previous month

    const lastMonthEarnings = await Payment.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $match: {
          'order.assignedRider': rider._id,
          'order.status': 'DELIVERED',
          status: 'COMPLETED',
          createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
    ]).then(result => result[0]?.total || 0);

    return {
      totalEarnings,
      thisWeekEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      weeklyBreakdown: [] // Could implement daily breakdown if needed
    };
  }

  // Waiter Dashboard Stats
  async getWaiterStats(waiterId: string) {
    const activeTables = await Order.countDocuments({
      status: { $in: ['PENDING', 'PREPARING', 'READY'] },
      orderType: 'DINE_IN'
    });

    return {
      activeTables,
      ordersToServe: 0,
      recentOrders: []
    };
  }

  // Chef Dashboard Stats
  async getChefStats(chefId: string) {
    const pendingOrders = await Order.countDocuments({
      status: 'PENDING'
    });
    const preparingOrders = await Order.countDocuments({
      status: 'PREPARING'
    });
    const completedToday = await Order.countDocuments({
      status: 'READY',
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return {
      pendingOrders,
      preparingOrders,
      completedToday,
      avgPreparationTime: 15
    };
  }

  // Chef Kitchen Orders
  async getChefOrders(chefId: string) {
    // Get orders that are pending or preparing (kitchen queue)
    const orders = await Order.find({
      status: { $in: ['PENDING', 'PREPARING'] }
    })
    .sort({ createdAt: 1 }) // FIFO order
    .limit(20) // Limit to prevent overwhelming the UI
    .populate('items.product')
    .populate('customer', 'displayName email')
    .populate('branch', 'branchName');

    return orders.map((order: any) => ({
      id: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      tableNumber: order.tableNumber || (order.orderType === 'DELIVERY' ? 'DEL' : 'TAKE'),
      orderType: order.orderType,
      items: order.items.map((item: any) => ({
        id: item._id,
        name: item.product?.name || item.productName || 'Unknown Item',
        quantity: item.quantity,
        status: item.status || 'PENDING',
        preparationTime: item.preparationTime || 15,
        specialInstructions: item.specialInstructions,
        image: item.product?.image || item.product?.imageUrl || null
      })),
      priority: this.calculateOrderPriority(order),
      orderTime: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }) : 'Unknown',
      estimatedReadyTime: this.calculateEstimatedReadyTime(order),
      createdAt: order.createdAt,
      status: order.status,
      specialInstructions: order.specialInstructions
    }));
  }

  // Helper method to calculate order priority
  private calculateOrderPriority(order: any): 'NORMAL' | 'HIGH' | 'URGENT' {
    const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
    
    if (order.orderType === 'DELIVERY' && ageInMinutes > 30) return 'URGENT';
    if (order.orderType === 'DINE_IN' && ageInMinutes > 20) return 'HIGH';
    if (order.status === 'PREPARING' && ageInMinutes > 15) return 'HIGH';
    
    return 'NORMAL';
  }

  // Helper method to calculate estimated ready time
  private calculateEstimatedReadyTime(order: any): string {
    const totalPrepTime = order.items.reduce((total: number, item: any) => 
      total + (item.preparationTime || 15), 0);
    
    const estimatedTime = new Date(Date.now() + totalPrepTime * 60 * 1000);
    return estimatedTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }

  // Branch Manager Dashboard Stats
  async getManagerStats(managerId: string) {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    const totalOrders = await Order.countDocuments({ branch: branchId });
    const todayOrders = await Order.countDocuments({
      branch: branchId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Count total users (staff + manager) for this branch
    const totalUsers = await User.countDocuments({
      $or: [
        { assignedBranch: branchId },
        { _id: managerId }
      ],
      role: { $in: ['WAITER', 'CHEF', 'RIDER', 'BRANCH_MANAGER', 'ADMIN'] }
    });

    return {
      totalOrders,
      todayOrders,
      totalUsers,
      revenue: 0,
      activeStaff: 0
    };
  }

  // Branch Manager Staff
  async getBranchStaff(managerId: string) {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    if (!branchId) {
      return [];
    }

    const staff = await User.find({
      assignedBranch: branchId,
      role: { $in: ['WAITER', 'CHEF', 'RIDER'] }
    }).select('name email phoneNumber role isActive assignedSection specialization');

    return staff.map((member: any) => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phoneNumber,
      isActive: member.isActive,
      shift: member.assignedSection || 'Not Assigned'
    }));
  }

  // Branch Manager Inventory
  async getBranchInventory(managerId: string) {
    // For now, return mock inventory data as we don't have an inventory model yet
    // This should be replaced with actual inventory queries when the inventory system is implemented
    return [
      { id: '1', name: 'Chicken Breast', quantity: 25, reorderLevel: 10, unit: 'kg', lastRestocked: new Date().toISOString().split('T')[0] },
      { id: '2', name: 'Tomatoes', quantity: 8, reorderLevel: 15, unit: 'kg', lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '3', name: 'Pizza Dough', quantity: 50, reorderLevel: 20, unit: 'pcs', lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '4', name: 'Olive Oil', quantity: 12, reorderLevel: 5, unit: 'liters', lastRestocked: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '5', name: 'Cheese', quantity: 18, reorderLevel: 10, unit: 'kg', lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ];
  }

  // Branch Manager Analytics
  async getBranchAnalytics(managerId: string, timeRange: string = '30d') {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    if (!branchId) {
      return {
        weeklyRevenue: 0,
        monthlyOrders: 0,
        averageOrderValue: 0,
        changePercentages: { revenue: 0, orders: 0, avgValue: 0 }
      };
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Current period metrics
    const currentRevenue = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: { 'order.branch': branchId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const currentOrders = await Order.countDocuments({
      branch: branchId,
      createdAt: { $gte: startDate }
    });

    const currentAvgValue = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;

    // Previous period metrics for comparison
    const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const prevRevenue = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: prevStartDate, $lt: startDate } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: { 'order.branch': branchId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const prevOrders = await Order.countDocuments({
      branch: branchId,
      createdAt: { $gte: prevStartDate, $lt: startDate }
    });

    const prevAvgValue = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

    // Calculate percentage changes
    const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const ordersChange = prevOrders > 0 ? Math.round(((currentOrders - prevOrders) / prevOrders) * 100) : 0;
    const avgValueChange = prevAvgValue > 0 ? Math.round(((currentAvgValue - prevAvgValue) / prevAvgValue) * 100) : 0;

    return {
      weeklyRevenue: currentRevenue,
      monthlyOrders: currentOrders,
      averageOrderValue: currentAvgValue,
      changePercentages: {
        revenue: revenueChange,
        orders: ordersChange,
        avgValue: avgValueChange
      }
    };
  }
}
