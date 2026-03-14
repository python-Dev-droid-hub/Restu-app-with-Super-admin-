import { Request, Response, NextFunction } from 'express';
import { OrderRepository } from './order.repository';
import { MenuRepository } from '../menu/menu.repository';
import { RestaurantRepository } from '../restaurant/restaurant.repository';
import { NotificationService } from '../notification/notification.service';
import NotificationServiceGlobal from '@/services/notificationService';
import { SystemSettings } from '@/models/SystemSettings';
import { DealCampaign } from '@/models/DealCampaign';
import { asyncHandler, sendSuccess } from '@/utils/response';
import { createError } from '@/utils/errorHandler';
import { IAuthRequest } from '@/types';
import OrderNotificationService from '@/services/orderNotificationService';

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

  /**
   * Send notification to all users with a specific role in a branch
   */
  private async notifyByRole(role: string, branchId: string, type: string, title: string, message: string, data: any, priority: string = 'NORMAL') {
    try {
      await NotificationServiceGlobal.notifyByRole({
        role,
        branchId,
        type,
        title,
        message,
        data,
        priority,
      });
    } catch (e) {
      console.error(`[Order Event] Failed to notify ${role} role:`, e);
    }
  }

  createOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    console.log('[ORDER DEBUG] ====== START ORDER CREATION ======');
    console.log('[ORDER DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.user!._id;
    const {
      items,
      restaurantId,
      phoneNumber,
      alternatePhoneNumber,
      deliveryAddress,
      orderType,
      paymentMethod,
      deliveryInstructions,
      tableId,
      table,
      selectedTable,
      tableNumber,
      table_number,
    } = req.body;

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

      // ===== DealCampaign deal expansion =====
      // If menuItemId is a deal embedded inside an active campaign, expand it into products.
      try {
        const dealCampaign = await DealCampaign.findOne({
          deletedAt: null,
          status: 'ACTIVE',
          'deals._id': item.menuItemId,
        }).lean();

        const deal: any = dealCampaign
          ? (dealCampaign as any).deals?.find((d: any) => d?._id?.toString() === item.menuItemId?.toString())
          : null;

        if (deal && deal.isActive !== false) {
          console.log('[ORDER DEBUG] Deal found in campaign:', {
            campaignId: (dealCampaign as any)?._id,
            dealId: deal._id,
            title: deal.title,
            price: deal.price,
          });

          const baseQty = Math.max(1, Number(item.quantity) || 1);
          const dealItems = Array.isArray(deal.items) ? deal.items : [];

          if (dealItems.length === 0) {
            throw createError(`Deal "${deal.title}" has no items configured`, 400);
          }

          const expanded = [] as any[];
          let expandedTotalUnits = 0;

          for (const di of dealItems) {
            const productId = di?.productId;
            const qty = Math.max(1, Number(di?.quantity) || 1) * baseQty;
            if (!productId) {
              throw createError(`Deal "${deal.title}" is missing a product`, 400);
            }

            const menuItem = await this.menuRepository.findMenuItemById(productId);
            if (!menuItem) {
              throw createError(`Deal item product ${productId} not found`, 400);
            }
            if (!menuItem.isAvailable) {
              throw createError(`Deal item product ${menuItem.name} is not available`, 400);
            }

            expanded.push({ menuItem, quantity: qty });
            expandedTotalUnits += qty;
          }

          const dealPrice = Number(deal.price) || 0;
          const unitPrice = expandedTotalUnits > 0 ? dealPrice / expandedTotalUnits : 0;

          for (const ex of expanded) {
            const lineTotal = unitPrice * ex.quantity;
            totalAmount += lineTotal;
            validatedItems.push({
              product: ex.menuItem._id,
              quantity: ex.quantity,
              unitPrice,
              totalPrice: lineTotal,
              productName: ex.menuItem.name,
              customizations: item.customizations || [],
              hasDeal: true,
            });
          }

          continue; // go to next order payload item
        }
      } catch (dealErr: any) {
        if (dealErr?.statusCode) throw dealErr;
        console.error('[ORDER DEBUG] Deal lookup failed (continuing as normal product):', dealErr?.message || dealErr);
      }
      
      let menuItem = await this.menuRepository.findMenuItemById(item.menuItemId);
      console.log(`[ORDER DEBUG] Menu item lookup result:`, { found: !!menuItem, isAvailable: menuItem?.isAvailable });
      
      // If not found with normal query, try without soft-delete filter
      if (!menuItem) {
        const MenuItem = require('@/models/Menu').MenuItem;
        const rawItem = await MenuItem.findById(item.menuItemId).setOptions({ skipMiddleware: true } as any);
        if (rawItem && rawItem.deletedAt) {
          console.log(`[ORDER DEBUG] Item ${item.menuItemId} is soft-deleted`);
          throw createError(`Product "${rawItem.name}" is no longer available`, 400);
        }
      }
      
      if (!menuItem) {
        console.log(`[ORDER DEBUG] Item NOT FOUND: ${item.menuItemId}`);
        throw createError(`Menu item ${item.menuItemId} not found`, 400);
      }
      
      if (!menuItem.isAvailable) {
        console.log(`[ORDER DEBUG] Item NOT AVAILABLE: ${item.menuItemId}`);
        throw createError(`Menu item ${item.menuItemId} is not available`, 400);
      }

      console.log(`[ORDER DEBUG] Item ${item.menuItemId} validated OK, price=${menuItem.price}, hasSizes=${menuItem.hasSizes}`);
      
      // Calculate effective price - use effectivePrice virtual or calculate from productSizes
      let unitPrice = menuItem.price;
      
      if (menuItem.hasSizes && menuItem.productSizes && menuItem.productSizes.length > 0) {
        // For sized products, use effectivePrice virtual or get lowest size price
        if (menuItem.effectivePrice !== undefined) {
          unitPrice = menuItem.effectivePrice;
        } else {
          // Get the lowest size price as default
          const sizePrices = menuItem.productSizes.map((ps: any) => ps.price);
          unitPrice = Math.min(...sizePrices);
        }
        console.log(`[ORDER DEBUG] Sized product - using price: ${unitPrice} (base price was: ${menuItem.price})`);
      }
      
      // Handle customizations (size selection) - find matching size price
      if (item.customizations && item.customizations.length > 0) {
        const sizeCustomization = item.customizations.find((c: any) => c.optionName === 'Size');
        if (sizeCustomization && menuItem.productSizes) {
          const productSize = menuItem.productSizes.find((ps: any) => 
            ps.size?.name === sizeCustomization.optionValue || 
            ps.sizeName === sizeCustomization.optionValue
          );
          if (productSize) {
            unitPrice = productSize.price;
            console.log(`[ORDER DEBUG] Size customization found - ${sizeCustomization.optionValue}, price: ${unitPrice}`);
          }
        }
      }
      
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product: item.menuItemId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: unitPrice * item.quantity,
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
    const normalizedOrderTypeForFees =
      orderType === 'pickup' || orderType === 'DINE_IN' || orderType === 'dine_in'
        ? 'DINE_IN'
        : orderType;
    const deliveryFee = normalizedOrderTypeForFees === 'DELIVERY' ? restaurant.deliveryFee : 0;
    
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

    const normalizedOrderType =
      orderType === 'pickup' || orderType === 'DINE_IN' || orderType === 'dine_in'
        ? 'DINE_IN'
        : orderType;

    const resolvedTableId = tableId || table || selectedTable;
    const resolvedTableNumber = tableNumber || table_number;

    const orderData: any = {
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
      specialInstructions: req.body.specialInstructions || deliveryInstructions,
      estimatedDeliveryTime,
      orderType: normalizedOrderType,
      paymentMethod,
      phoneNumber,
      alternatePhoneNumber,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    };

    if (normalizedOrderType === 'DINE_IN') {
      orderData.waiter = userId;
      if (resolvedTableId) orderData.table = resolvedTableId;
      if (resolvedTableNumber) orderData.tableNumber = resolvedTableNumber;
    }
    
    console.log('[ORDER DEBUG] Order data prepared:', JSON.stringify(orderData, null, 2));

    console.log('[ORDER DEBUG] Creating order in database...');
    const order = await this.orderRepository.create(orderData);
    console.log('[ORDER DEBUG] Order created with ID:', order._id);

    console.log('[ORDER DEBUG] Populating order...');
    const populatedOrder = await this.orderRepository.findById(order._id);
    console.log('[ORDER DEBUG] Order populated successfully');

    // Real-time notification (DB + WebSocket if connected users)
    try {
      await OrderNotificationService.notifyOrderPlaced(order._id.toString());
      
      // Send role-based notifications to Chef, Manager, and Admin for ALL order types
      const branchId = restaurantId;
      const notifData = { orderId: order._id.toString(), orderNumber, orderType: normalizedOrderType };
      const notifMessage = `New ${normalizedOrderType.toLowerCase()} order #${orderNumber}`;
      
      // Notify Chef, Manager, Admin roles for all order types
      await this.notifyByRole('CHEF', branchId, 'NEW_ORDER', 'New Order', notifMessage, notifData, 'HIGH');
      await this.notifyByRole('BRANCH_MANAGER', branchId, 'NEW_ORDER', 'New Order', notifMessage, notifData, 'HIGH');
      await this.notifyByRole('ADMIN', branchId, 'NEW_ORDER', 'New Order', notifMessage, notifData, 'NORMAL');
      
      // Also notify riders for delivery orders
      if (normalizedOrderType === 'DELIVERY') {
        await this.notifyByRole('RIDER', branchId, 'NEW_ORDER', 'New Delivery Order', notifMessage, notifData, 'NORMAL');
      }
    } catch (notifError) {
      console.error('[Order Event] notifyOrderPlaced failed:', notifError);
    }
    
    console.log('[ORDER DEBUG] ====== ORDER CREATION SUCCESS ======');

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);
  });

  updateOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const { items, specialInstructions, addItems, removeItems, updateItems } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization
    // - Waiters: allowed (any waiter can serve/add items) until payment succeeds
    // - Branch manager: allowed
    // - Admin: allowed
    const isWaiter = userRole === 'WAITER';
    const isBranchManager = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isAdmin = userRole === 'ADMIN';

    if (!isWaiter && !isBranchManager && !isAdmin) {
      throw createError('Not authorized to update this order', 403);
    }

    // Disallow updates once order is finalized or paid
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw createError('Cannot update a completed or cancelled order', 400);
    }
    if (order.paymentStatus === 'SUCCESS') {
      throw createError('Cannot update order after payment is successful', 400);
    }

    const updateData: any = {};

    // Attribute modifications to the current waiter (so payment history follows the waiter who served/added items)
    if (userRole === 'WAITER') {
      updateData.waiter = userId;
    }

    // Update special instructions
    if (specialInstructions !== undefined) {
      updateData.specialInstructions = specialInstructions;
    }

    // Start with existing items
    let currentItems = [...(order.items || [])];

    // Update existing items (quantity or specialInstructions)
    if (updateItems && updateItems.length > 0) {
      for (const updateItem of updateItems) {
        const itemIndex = currentItems.findIndex(
          (item: any) => (item._id?.toString() || item.id) === updateItem.itemId
        );
        if (itemIndex >= 0) {
          if (updateItem.quantity !== undefined) {
            currentItems[itemIndex].quantity = updateItem.quantity;
            currentItems[itemIndex].totalPrice = currentItems[itemIndex].unitPrice * updateItem.quantity;
          }
          if (updateItem.specialInstructions !== undefined) {
            currentItems[itemIndex].specialInstructions = updateItem.specialInstructions;
          }
        }
      }
      updateData.items = currentItems;
    }

    // Add new items to existing items
    if (addItems && addItems.length > 0) {
      const newItems = [];
      for (const item of addItems) {
        const menuItem = await this.menuRepository.findMenuItemById(item.menuItemId);
        if (!menuItem || !menuItem.isAvailable) {
          throw createError(`Menu item ${item.menuItemId} not found or unavailable`, 400);
        }
        
        // Calculate effective price for sized products
        let unitPrice = menuItem.price;
        if (menuItem.hasSizes && menuItem.productSizes && menuItem.productSizes.length > 0) {
          if (menuItem.effectivePrice !== undefined) {
            unitPrice = menuItem.effectivePrice;
          } else {
            const sizePrices = menuItem.productSizes.map((ps: any) => ps.price);
            unitPrice = Math.min(...sizePrices);
          }
        }
        
        // Handle size customization
        if (item.customizations && item.customizations.length > 0) {
          const sizeCustomization = item.customizations.find((c: any) => c.optionName === 'Size');
          if (sizeCustomization && menuItem.productSizes) {
            const productSize = menuItem.productSizes.find((ps: any) => 
              ps.size?.name === sizeCustomization.optionValue || 
              ps.sizeName === sizeCustomization.optionValue
            );
            if (productSize) {
              unitPrice = productSize.price;
            }
          }
        }
        
        newItems.push({
          product: item.menuItemId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
          productName: menuItem.name,
          customizations: item.customizations || [],
          specialInstructions: item.specialInstructions || '',
          status: 'PENDING', // New items always start as PENDING
        });
      }
      currentItems = updateData.items || currentItems;
      updateData.items = [...currentItems, ...newItems];
    }

    // Remove items by item ID
    if (removeItems && removeItems.length > 0) {
      currentItems = updateData.items || currentItems;
      console.log('[ORDER UPDATE] Removing items:', removeItems);
      console.log('[ORDER UPDATE] Current items IDs:', currentItems.map((i: any) => i._id?.toString()));
      
      updateData.items = currentItems.filter((item: any) => {
        const itemId = item._id?.toString();
        const shouldRemove = removeItems.includes(itemId);
        console.log('[ORDER UPDATE] Item', itemId, 'shouldRemove:', shouldRemove);
        return !shouldRemove;
      });
      
      console.log('[ORDER UPDATE] Remaining items:', updateData.items.length);
    }

    // Recalculate totals if items changed
    if (updateData.items) {
      const newTotal = updateData.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      updateData.subtotal = newTotal;
      updateData.totalAmount = newTotal;
      updateData.finalAmount = newTotal + (order.taxAmount || 0) + (order.deliveryFee || 0);
    }

    // If new items were added, check if any are PENDING and update order status accordingly
    // This ensures chef sees the order again when new items are added to a served order
    if (addItems && addItems.length > 0) {
      const hasPendingItems = updateData.items?.some((item: any) => item.status === 'PENDING');
      if (hasPendingItems) {
        // Reset order status to PREPARING if it was SERVED/READY so chef sees new items
        if (['SERVED', 'READY', 'PICKED_UP'].includes(order.status)) {
          updateData.status = 'PREPARING';
          console.log('[ORDER UPDATE] Resetting order status to PREPARING due to new pending items');
        }
      }
    }

    const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
    const populatedOrder = await this.orderRepository.findById(orderId);

    sendSuccess(res, populatedOrder, 'Order updated successfully');

    // Notify chef about new items added
    if (addItems && addItems.length > 0 && populatedOrder.branch) {
      try {
        await this.notifyByRole(
          'CHEF',
          populatedOrder.branch._id.toString(),
          'NEW_ORDER',
          'New Items Added',
          `Order #${populatedOrder.orderNumber} has ${addItems.length} new item(s) to prepare`,
          { orderId: populatedOrder._id, orderNumber: populatedOrder.orderNumber },
          'HIGH'
        );
      } catch (notifError) {
        console.error('[ORDER UPDATE] Failed to notify chef:', notifError);
      }
    }
  });

  // Update item status - Chef can mark individual items as PREPARING, READY, SERVED
  updateItemStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    if (!['PREPARING', 'READY', 'SERVED'].includes(status)) {
      throw createError('Invalid item status. Must be PREPARING, READY, or SERVED', 400);
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Only chef/kitchen staff can update item status
    const isChef = ['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(userRole);

    if (!isChef && !isAdmin) {
      throw createError('Not authorized to update item status', 403);
    }

    // Find and update the item
    const itemIndex = order.items.findIndex((item: any) => 
      item._id?.toString() === itemId || item.id?.toString() === itemId
    );

    if (itemIndex === -1) {
      throw createError('Item not found in order', 404);
    }

    // Update item status and timestamp
    const updateData: any = {};
    updateData[`items.${itemIndex}.status`] = status;
    
    if (status === 'PREPARING') {
      updateData[`items.${itemIndex}.preparingAt`] = new Date();
    } else if (status === 'READY') {
      updateData[`items.${itemIndex}.readyAt`] = new Date();
    } else if (status === 'SERVED') {
      updateData[`items.${itemIndex}.servedAt`] = new Date();
    }

    const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
    const populatedOrder = await this.orderRepository.findById(orderId);

    // Check if all items are now READY - update order status
    const allItemsReady = populatedOrder.items.every((item: any) => 
      item.status === 'READY' || item.status === 'SERVED'
    );
    
    if (allItemsReady && populatedOrder.status === 'PREPARING') {
      await this.orderRepository.updateById(orderId, { status: 'READY' });
      populatedOrder.status = 'READY';
      
      // Notify waiter that order is ready
      if (populatedOrder.waiter) {
        try {
          await this.notificationService.createOrderStatusNotification(
            populatedOrder.waiter._id.toString(),
            populatedOrder._id.toString(),
            populatedOrder.orderNumber,
            'READY',
            'Order Ready',
            `Order #${populatedOrder.orderNumber} is ready to be served.`
          );
        } catch (e) {
          console.error('[ITEM STATUS] Failed to notify waiter:', e);
        }
      }
    }

    // Check if all items are SERVED - update order status
    const allItemsServed = populatedOrder.items.every((item: any) => item.status === 'SERVED');
    if (allItemsServed && ['READY', 'PREPARING'].includes(populatedOrder.status)) {
      await this.orderRepository.updateById(orderId, { status: 'SERVED' });
      populatedOrder.status = 'SERVED';
    }

    sendSuccess(res, populatedOrder, 'Item status updated successfully');
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
    const { status, paymentMethod, paymentStatus } = req.body;
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
    // Allow any waiter from the branch to pick up orders (not just assigned waiter)
    const isWaiter = userRole === 'WAITER' && (
      (order.waiter && order.waiter._id.toString() === userId.toString()) ||
      (order.branch && order.branch._id.toString() === (req.user as any).assignedBranch?.toString())
    );

    // Define allowed status transitions by role
    const allowedTransitions = {
      restaurant_owner: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'CANCELLED'],
      chef: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
      driver: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      admin: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKED_UP', 'COMPLETED', 'SERVED'],
      waiter: ['PICKED_UP', 'SERVED', 'COMPLETED'],
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
    } else if (isWaiter && allowedTransitions.waiter.includes(status)) {
      // Waiter can only mark as COMPLETED if payment is done
      if (status === 'COMPLETED') {
        // Check if payment info is being sent with this request
        if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
          // Payment is being confirmed now, allow it
        } else {
          // Check existing payment status on the order
          const existingPaymentStatus = (order as any).paymentStatus || 'PENDING';
          if (existingPaymentStatus !== 'SUCCESS' && existingPaymentStatus !== 'PAID') {
            throw createError('Cannot complete order - payment not received', 400);
          }
        }
      }
      canUpdate = true;
    }

    if (!canUpdate) {
      throw createError('Not authorized to update order to this status', 403);
    }

    // Prepare all updates in a single object to avoid parallel save errors
    const updateData: any = { status };
    
    // When chef marks order as PREPARING, mark all PENDING items as PREPARING
    if (status === 'PREPARING' && isChef) {
      const itemUpdates: any = {};
      order.items.forEach((item: any, index: number) => {
        if (item.status === 'PENDING' || !item.status) {
          itemUpdates[`items.${index}.status`] = 'PREPARING';
          itemUpdates[`items.${index}.preparingAt`] = new Date();
        }
      });
      Object.assign(updateData, itemUpdates);
    }
    
    // When chef marks order as READY, mark all non-SERVED items as READY
    if (status === 'READY' && isChef) {
      const itemUpdates: any = {};
      order.items.forEach((item: any, index: number) => {
        if (item.status !== 'SERVED') {
          itemUpdates[`items.${index}.status`] = 'READY';
          itemUpdates[`items.${index}.readyAt`] = new Date();
        }
      });
      Object.assign(updateData, itemUpdates);
      updateData.readyAt = new Date();
    }
    
    // Generate invoice when order is picked up
    if (status === 'PICKED_UP') {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateData.invoiceNumber = `INV-${dateStr}-${random}`;
      updateData.pickedUpAt = new Date();
      
      // Mark all READY items as SERVED when waiter picks up
      const itemUpdates: any = {};
      order.items.forEach((item: any, index: number) => {
        if (item.status === 'READY') {
          itemUpdates[`items.${index}.status`] = 'SERVED';
          itemUpdates[`items.${index}.servedAt`] = new Date();
        }
      });
      Object.assign(updateData, itemUpdates);
    }

    // Mark completed time when order is completed
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      // Add payment info if provided
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
        console.log('[OrderController] Setting paymentMethod:', paymentMethod);
      }
      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
        console.log('[OrderController] Setting paymentStatus:', paymentStatus);
      }
      console.log('[OrderController] Completing order with updateData:', JSON.stringify(updateData));
    }

    // Single update operation instead of multiple saves
    const updatedOrder = await this.orderRepository.updateById(id, updateData);
    const populatedOrder = await this.orderRepository.findById(id);

    // Real-time customer/rider/kitchen notifications (DB + WebSocket)
    try {
      const orderId = order._id.toString();
      switch (status) {
        case 'KITCHEN_ACCEPTED':
        case 'CONFIRMED':
          // no dedicated helper in service; treat as preparing for now
          await OrderNotificationService.notifyOrderPreparing(orderId);
          // Notify waiter that order was accepted by kitchen
          if (order.waiter) {
            await this.notificationService.createOrderStatusNotification(
              order.waiter._id.toString(),
              orderId,
              order.orderNumber || `ORD-${orderId.slice(-6).toUpperCase()}`,
              'KITCHEN_ACCEPTED',
              'Order Accepted by Kitchen',
              `Order #${order.orderNumber} has been accepted by kitchen and will be prepared soon.`
            );
          }
          break;
        case 'PREPARING':
          await OrderNotificationService.notifyOrderPreparing(orderId);
          // Notify waiter that order is being prepared
          if (order.waiter) {
            await this.notificationService.createOrderStatusNotification(
              order.waiter._id.toString(),
              orderId,
              order.orderNumber || `ORD-${orderId.slice(-6).toUpperCase()}`,
              'PREPARING',
              'Order is Being Prepared',
              `Order #${order.orderNumber} is now being prepared by the kitchen.`
            );
          }
          break;
        case 'READY':
          await OrderNotificationService.notifyOrderReady(orderId);
          break;
        case 'RIDER_ASSIGNED':
          if (updatedOrder?.rider?._id) {
            await OrderNotificationService.notifyRiderAssigned(orderId, updatedOrder.rider._id.toString());
          }
          break;
        case 'OUT_FOR_DELIVERY':
          if (updatedOrder?.rider?._id) {
            await OrderNotificationService.notifyOrderOutForDelivery(orderId, updatedOrder.rider._id.toString());
          }
          break;
        case 'DELIVERED':
          await OrderNotificationService.notifyOrderDelivered(orderId);
          break;
        case 'CANCELLED':
          await OrderNotificationService.notifyOrderCancelled(orderId);
          // Notify waiter if order was cancelled
          if (order.waiter) {
            await this.notificationService.createOrderStatusNotification(
              order.waiter._id.toString(),
              orderId,
              order.orderNumber || `ORD-${orderId.slice(-6).toUpperCase()}`,
              'CANCELLED',
              'Order Cancelled',
              `Order #${order.orderNumber} has been cancelled.`
            );
          }
          break;
        default:
          break;
      }
    } catch (notifError) {
      console.error('[Order Event] updateOrderStatus notification failed:', notifError);
    }

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

    sendSuccess(res, populatedOrder, 'Order status updated successfully');
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

    // Real-time rider assigned notifications (DB + WebSocket)
    try {
      await OrderNotificationService.notifyRiderAssigned(id, userId.toString());
    } catch (notifError) {
      console.error('[Order Event] acceptOrder notifyRiderAssigned failed:', notifError);
    }

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
    
    console.log('[getAllOrders] Filter:', JSON.stringify(filter), 'Page:', pageNum, 'Limit:', limitNum);

    const orders = await this.orderRepository.findAllOrders(filter, pageNum, limitNum);
    console.log('[getAllOrders] Orders found:', orders?.length || 0);
    
    const normalizedOrders = (orders || []).map((o: any) => {
      const orderObj = o.toObject ? o.toObject() : o;
      const tableNumber = orderObj?.table?.tableNumber || orderObj?.tableNumber;
      const items = Array.isArray(orderObj?.items)
        ? orderObj.items.map((it: any) => ({
            ...it,
            image: it?.image || it?.product?.imageUrl || it?.product?.image,
          }))
        : [];
      return {
        ...orderObj,
        id: orderObj._id.toString(),
        tableNumber,
        items,
        // Ensure these fields are properly mapped for frontend
        finalAmount: orderObj.totalAmount,
        total: orderObj.totalAmount,
        // Include waiter name for payment history
        waiterName: orderObj?.waiter?.displayName || orderObj?.waiterName || null,
        // Explicitly map payment fields
        paymentStatus: orderObj.paymentStatus,
        paymentMethod: orderObj.paymentMethod,
        completedAt: orderObj.completedAt,
        invoiceNumber: orderObj.invoiceNumber,
      };
    });
    
    console.log('[getAllOrders] Sample order payment fields:', normalizedOrders[0] ? {
      orderNumber: normalizedOrders[0].orderNumber,
      paymentStatus: normalizedOrders[0].paymentStatus,
      paymentMethod: normalizedOrders[0].paymentMethod,
      status: normalizedOrders[0].status
    } : 'No orders');
    const total = await this.orderRepository.countOrders(filter);

    const response = {
      orders: normalizedOrders,
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
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isBranchManager = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isManager = userRole === 'BRANCH_MANAGER';

    // Waiter can only mark as PICKED_UP
    if (isWaiter && status === 'PICKED_UP') {
      const updateData: any = { status };
      if (picked_up_at) {
        updateData.pickedUpAt = new Date(picked_up_at);
      }
      
      // Mark all READY items as SERVED when waiter picks up
      const itemUpdates: any = {};
      order.items.forEach((item: any, index: number) => {
        if (item.status === 'READY') {
          itemUpdates[`items.${index}.status`] = 'SERVED';
          itemUpdates[`items.${index}.servedAt`] = new Date();
        }
      });
      Object.assign(updateData, itemUpdates);
      
      const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
      const populatedOrder = await this.orderRepository.findById(orderId);
      sendSuccess(res, populatedOrder, 'Order marked as picked up');
      return;
    }

    // Chef can update to PREPARING, READY, or DELIVERED (case-insensitive)
    const statusUpper = status?.toUpperCase();
    if (isChef && ['PREPARING', 'READY', 'DELIVERED'].includes(statusUpper)) {
      const updateData: any = { status: statusUpper };
      if (statusUpper === 'READY' && ready_at) {
        updateData.readyAt = new Date(ready_at);
      } else if (statusUpper === 'READY') {
        updateData.readyAt = new Date();
      }
      
      // When chef marks order as PREPARING, mark all PENDING items as PREPARING
      if (statusUpper === 'PREPARING') {
        const itemUpdates: any = {};
        order.items.forEach((item: any, index: number) => {
          if (item.status === 'PENDING' || !item.status) {
            itemUpdates[`items.${index}.status`] = 'PREPARING';
            itemUpdates[`items.${index}.preparingAt`] = new Date();
          }
        });
        Object.assign(updateData, itemUpdates);
      }
      
      // When chef marks order as READY, mark all non-SERVED items as READY
      if (statusUpper === 'READY') {
        const itemUpdates: any = {};
        order.items.forEach((item: any, index: number) => {
          if (item.status !== 'SERVED') {
            itemUpdates[`items.${index}.status`] = 'READY';
            itemUpdates[`items.${index}.readyAt`] = new Date();
          }
        });
        Object.assign(updateData, itemUpdates);
      }
      
      const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
      const populatedOrder = await this.orderRepository.findById(orderId);
      sendSuccess(res, populatedOrder, `Order status updated to ${statusUpper}`);
      return;
    }

    // Admin/BranchManager/Manager/SuperAdmin can update to any valid status
    if (isAdmin || isBranchManager || isManager) {
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

  getBranchOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const { status, page = '1', limit = '20', branchId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Get user's branch ID from query or user data
    let targetBranchId = branchId as string;
    
    if (!targetBranchId) {
      // Get from req.user which has assignedBranch populated
      targetBranchId = req.user!.assignedBranch?.toString() || '';
    }

    // Build filter - show ALL orders for the branch (not filtered by waiter)
    const filter: any = {};
    
    // Only filter by branch if we have one
    if (targetBranchId) {
      filter.branch = targetBranchId;
    }
    
    // For waiters, only show DINE_IN orders (they don't need delivery orders)
    if (userRole === 'WAITER') {
      filter.orderType = 'DINE_IN';
    }
    
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

    const normalizedOrders = (orders || []).map((o: any) => {
      const tableNumber = o?.table?.tableNumber || o?.tableNumber;
      const items = Array.isArray(o?.items)
        ? o.items.map((it: any) => ({
            ...it,
            image: it?.image || it?.product?.imageUrl || it?.product?.image,
          }))
        : [];
      return {
        ...o,
        id: o._id.toString(),
        tableNumber,
        items,
      };
    });

    const response = {
      orders: normalizedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    sendSuccess(res, response, 'Branch orders retrieved successfully');
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

    const normalizedOrders = (orders || []).map((o: any) => {
      const tableNumber = o?.table?.tableNumber || o?.tableNumber;
      const items = Array.isArray(o?.items)
        ? o.items.map((it: any) => ({
            ...it,
            image: it?.image || it?.product?.imageUrl || it?.product?.image,
          }))
        : [];
      return {
        ...o,
        id: o._id.toString(),
        tableNumber,
        items,
      };
    });

    const response = {
      orders: normalizedOrders,
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
