import { Request, Response, NextFunction } from 'express';
import { OrderRepository } from './order.repository';
import { MenuRepository } from '../menu/menu.repository';
import { RestaurantRepository } from '../restaurant/restaurant.repository';
import { NotificationService } from '../notification/notification.service';
import { SystemSettings } from '@/models/SystemSettings';
import { IAuthRequest, sendSuccess, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';

export class OrderController {
  private orderRepository: OrderRepository;
  private menuRepository: MenuRepository;
  private restaurantRepository: RestaurantRepository;
  private notificationService: NotificationService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.menuRepository = new MenuRepository();
    this.restaurantRepository = new RestaurantRepository();
    this.notificationService = new NotificationService();
  }

  createOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    console.log('[ORDER DEBUG] ====== START ORDER CREATION ======');
    console.log('[ORDER DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.user!._id;
    const { items, restaurantId, deliveryAddress, orderType, paymentMethod, deliveryInstructions } = req.body;

    console.log('[ORDER DEBUG] userId:', userId);
    console.log('[ORDER DEBUG] restaurantId:', restaurantId);
    console.log('[ORDER DEBUG] items count:', items?.length);

    // Validate restaurant
    console.log('[ORDER DEBUG] Validating restaurant...');
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    console.log('[ORDER DEBUG] Restaurant found:', !!restaurant);
    
    if (!restaurant || !restaurant.isActive) {
      console.log('[ORDER DEBUG] Restaurant validation FAILED:', { exists: !!restaurant, isActive: restaurant?.isActive });
      throw createError('Restaurant not available', 404);
    }
    console.log('[ORDER DEBUG] Restaurant validated OK');

    // Validate menu items and calculate total
    console.log('[ORDER DEBUG] Starting item validation...');
    let totalAmount = 0;
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[ORDER DEBUG] Processing item ${i + 1}/${items.length}: menuItemId=${item.menuItemId}`);
      
      const menuItem = await this.menuRepository.findMenuItemById(item.menuItemId);
      console.log(`[ORDER DEBUG] Menu item lookup result:`, { found: !!menuItem, isAvailable: menuItem?.isAvailable });
      
      if (!menuItem) {
        console.log(`[ORDER DEBUG] Item NOT FOUND: ${item.menuItemId}`);
        throw createError(`Menu item ${item.menuItemId} not found`, 400);
      }
      
      if (!menuItem.isAvailable) {
        console.log(`[ORDER DEBUG] Item NOT AVAILABLE: ${item.menuItemId}`);
        throw createError(`Menu item ${item.menuItemId} is not available`, 400);
      }

      console.log(`[ORDER DEBUG] Item ${item.menuItemId} validated OK, price=${menuItem.price}`);
      
      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price * item.quantity,
        productName: menuItem.name,
        customizations: item.customizations || [],
      });
    }
    
    console.log('[ORDER DEBUG] All items validated, totalAmount:', totalAmount);

    // Check minimum order amount
    console.log('[ORDER DEBUG] Checking minimum order amount:', { totalAmount, minOrderAmount: restaurant.minOrderAmount });
    if (totalAmount < restaurant.minOrderAmount) {
      console.log('[ORDER DEBUG] Minimum order amount FAILED');
      throw createError(`Minimum order amount is $${restaurant.minOrderAmount}`, 400);
    }
    console.log('[ORDER DEBUG] Minimum order amount OK');

    // Calculate fees
    console.log('[ORDER DEBUG] Calculating fees...');
    const deliveryFee = orderType === 'delivery' ? restaurant.deliveryFee : 0;
    
    // Fetch tax rate from settings (default to 0 if not set)
    const settings = await SystemSettings.findOne();
    const taxRate = (settings?.taxRate ?? 0) / 100; // Convert percentage to decimal
    console.log('[ORDER DEBUG] Tax rate from settings:', settings?.taxRate ?? 0, '% =', taxRate);
    
    const tax = totalAmount * taxRate;
    const finalAmount = totalAmount + deliveryFee + tax;
    console.log('[ORDER DEBUG] Fees calculated:', { deliveryFee, taxRate, tax, finalAmount });

    // Calculate estimated delivery time
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + restaurant.deliveryTime);

    // Generate order number manually (pre-save hook should do this, but let's be safe)
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 9000) + 1000);
    const orderNumber = `ORD${year}${month}${day}${randomNum}`;

    const orderData = {
      customer: userId, // The waiter is both customer and waiter for dine-in orders
      branch: restaurantId,
      orderNumber,
      items: validatedItems,
      subtotal: totalAmount,
      totalAmount,
      deliveryFee,
      taxAmount: tax,
      finalAmount,
      deliveryAddress,
      deliveryInstructions,
      estimatedDeliveryTime,
      orderType: orderType === 'pickup' ? 'DINE_IN' : orderType,
      paymentMethod,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      waiter: userId, // Set the waiter who created this order
    };
    
    console.log('[ORDER DEBUG] Order data prepared:', JSON.stringify(orderData, null, 2));

    console.log('[ORDER DEBUG] Creating order in database...');
    const order = await this.orderRepository.create(orderData);
    console.log('[ORDER DEBUG] Order created with ID:', order._id);

    console.log('[ORDER DEBUG] Populating order...');
    const populatedOrder = await this.orderRepository.findById(order._id);
    console.log('[ORDER DEBUG] Order populated successfully');
    
    console.log('[ORDER DEBUG] ====== ORDER CREATION SUCCESS ======');

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);
  });

  getMyOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const { orders, total } = await this.orderRepository.findByCustomerId(userId, page, limit, status);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Orders retrieved successfully');
  });

  getOrderById = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization
    const isCustomer = order.customer._id.toString() === userId.toString();
    const isRestaurantOwner = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isDriver = order.rider && order.rider._id.toString() === userId.toString();
    const isAdmin = userRole === 'ADMIN';

    if (!isCustomer && !isRestaurantOwner && !isDriver && !isAdmin) {
      throw createError('Not authorized to view this order', 403);
    }

    sendSuccess(res, order, 'Order retrieved successfully');
  });

  updateOrderStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization based on status update
    const isRestaurantOwner = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isDriver = order.rider && order.rider._id.toString() === userId.toString();
    const isChef = userRole === 'CHEF';
    const isAdmin = userRole === 'ADMIN';

    // Define allowed status transitions by role
    const allowedTransitions = {
      restaurant_owner: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'CANCELLED'],
      chef: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
      driver: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      admin: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKED_UP'],
    };

    let canUpdate = false;
    if (isRestaurantOwner && allowedTransitions.restaurant_owner.includes(status)) {
      canUpdate = true;
    } else if (isChef && allowedTransitions.chef.includes(status)) {
      canUpdate = true;
    } else if (isDriver && allowedTransitions.driver.includes(status)) {
      canUpdate = true;
    } else if (isAdmin && allowedTransitions.admin.includes(status)) {
      canUpdate = true;
    }

    if (!canUpdate) {
      throw createError('Not authorized to update order to this status', 403);
    }

    const updatedOrder = await this.orderRepository.updateStatus(id, status);

    // Send notification to waiter when order is READY (for DINE_IN orders)
    if (status === 'READY' && order.orderType === 'DINE_IN' && order.waiter) {
      try {
        await this.notificationService.createKitchenReadyNotification(
          order.waiter._id.toString(),
          order._id.toString(),
          order.table?.tableNumber || order.tableNumber || '-',
          order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`
        );
      } catch (notifError) {
        console.error('Failed to send kitchen ready notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    sendSuccess(res, updatedOrder, 'Order status updated successfully');
  });

  cancelOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization
    const isCustomer = order.customer._id.toString() === userId.toString();
    const isRestaurantOwner = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isAdmin = userRole === 'ADMIN';

    if (!isCustomer && !isRestaurantOwner && !isAdmin) {
      throw createError('Not authorized to cancel this order', 403);
    }

    const cancelledOrder = await this.orderRepository.cancelOrder(id, reason);
    if (!cancelledOrder) {
      throw createError('Order cannot be cancelled', 400);
    }

    sendSuccess(res, cancelledOrder, 'Order cancelled successfully');
  });

  getRestaurantOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to view restaurant orders', 403);
    }

    const { orders, total } = await this.orderRepository.findByBranchId(restaurantId, page, limit, status);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Restaurant orders retrieved successfully');
  });

  getDriverOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const { orders, total } = await this.orderRepository.findByRiderId(userId, page, limit, status);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Driver orders retrieved successfully');
  });

  getAvailableOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { orders, total } = await this.orderRepository.getAvailableOrdersForRiders(page, limit);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Available orders retrieved successfully');
  });

  acceptOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    if (order.status !== 'READY') {
      throw createError('Order is not ready for delivery', 400);
    }

    if (order.rider) {
      throw createError('Order already has a rider assigned', 400);
    }

    const updatedOrder = await this.orderRepository.assignRider(id, userId);

    sendSuccess(res, updatedOrder, 'Order accepted successfully');
  });

  addReview = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user!._id;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    if (order.customer._id.toString() !== userId.toString()) {
      throw createError('Not authorized to review this order', 403);
    }

    if (order.status !== 'delivered') {
      throw createError('Order must be delivered to be reviewed', 400);
    }

    if (order.rating) {
      throw createError('Order has already been reviewed', 400);
    }

    const updatedOrder = await this.orderRepository.addReview(id, rating, review);

    // Update restaurant rating
    if (updatedOrder && order.restaurant) {
      await this.restaurantRepository.updateRating(order.restaurant._id, rating);
    }

    sendSuccess(res, updatedOrder, 'Review added successfully');
  });

  getOrderStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    if (restaurantId) {
      // Verify restaurant ownership
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (!restaurant) {
        throw createError('Restaurant not found', 404);
      }

      if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
        throw createError('Not authorized to view restaurant stats', 403);
      }
    }

    const stats = await this.orderRepository.getOrderStats(restaurantId);

    sendSuccess(res, stats, 'Order statistics retrieved successfully');
  });

  getAllOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await this.orderRepository.findAllOrders(filter, pageNum, limitNum);
    const total = await this.orderRepository.countOrders(filter);

    const response = {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    sendSuccess(res, response, 'Orders retrieved successfully');
  });

  submitToKitchen = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const { chef_id } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Find the order
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization - waiter who created the order, branch manager, or admin
    const isWaiter = order.waiter && order.waiter._id.toString() === userId.toString();
    const isBranchManager = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isAdmin = userRole === 'ADMIN';

    if (!isWaiter && !isBranchManager && !isAdmin) {
      throw createError('Not authorized to submit this order to kitchen', 403);
    }

    // Check if order is in PENDING status
    if (order.status !== 'PENDING') {
      throw createError('Order must be in PENDING status to submit to kitchen', 400);
    }

    // Submit to kitchen
    const updatedOrder = await this.orderRepository.submitToKitchen(orderId, chef_id);
    if (!updatedOrder) {
      throw createError('Failed to submit order to kitchen', 500);
    }

    // Populate and return
    const populatedOrder = await this.orderRepository.findById(orderId);

    sendSuccess(res, { order: populatedOrder, status: 'KITCHEN_ACCEPTED' }, 'Order submitted to kitchen successfully');
  });

  patchOrderStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const { status, picked_up_at, ready_at } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Authorization checks
    const isWaiter = order.waiter && order.waiter._id.toString() === userId.toString();
    const isChef = userRole === 'CHEF';
    const isAdmin = userRole === 'ADMIN';
    const isBranchManager = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();

    // Waiter can only mark as PICKED_UP
    if (isWaiter && status === 'PICKED_UP') {
      const updateData: any = { status };
      if (picked_up_at) {
        updateData.pickedUpAt = new Date(picked_up_at);
      }
      const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
      const populatedOrder = await this.orderRepository.findById(orderId);
      sendSuccess(res, populatedOrder, 'Order marked as picked up');
      return;
    }

    // Chef can update to PREPARING or READY
    if (isChef && ['PREPARING', 'READY'].includes(status)) {
      const updateData: any = { status };
      if (status === 'READY' && ready_at) {
        updateData.readyAt = new Date(ready_at);
      } else if (status === 'READY') {
        updateData.readyAt = new Date();
      }
      const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
      const populatedOrder = await this.orderRepository.findById(orderId);
      sendSuccess(res, populatedOrder, `Order status updated to ${status}`);
      return;
    }

    // Admin/BranchManager can update to any valid status
    if (isAdmin || isBranchManager) {
      const updateData: any = { status };
      if (picked_up_at) updateData.pickedUpAt = new Date(picked_up_at);
      if (ready_at) updateData.readyAt = new Date(ready_at);
      
      const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
      const populatedOrder = await this.orderRepository.findById(orderId);
      sendSuccess(res, populatedOrder, 'Order status updated');
      return;
    }

    throw createError('Not authorized to update this order', 403);
  });

  getWaiterOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const waiterId = req.user!._id;
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Build filter
    const filter: any = { waiter: waiterId };
    
    // Support multiple statuses (comma-separated)
    if (status && status !== 'all') {
      const statuses = (status as string).split(',').map(s => s.trim().toUpperCase());
      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else {
        filter.status = { $in: statuses };
      }
    }

    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      this.orderRepository.findAllOrders(filter, pageNum, limitNum),
      this.orderRepository.countOrders(filter),
    ]);

    const response = {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    sendSuccess(res, response, 'Waiter orders retrieved successfully');
  });
}
