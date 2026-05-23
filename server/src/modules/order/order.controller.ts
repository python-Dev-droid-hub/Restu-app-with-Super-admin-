import { Request, Response, NextFunction } from 'express';
import { OrderRepository } from './order.repository';
import { MenuRepository } from '../menu/menu.repository';
import { RestaurantRepository } from '../restaurant/restaurant.repository';
import { UserRepository } from '../user/user.repository';
import { NotificationService } from '../notification/notification.service';
import NotificationServiceGlobal from '@/services/notificationService';
import { SystemSettings } from '@/models/SystemSettings';
import { DealCampaign } from '@/models/DealCampaign';
import { asyncHandler, sendSuccess } from '@/utils/response';
import { createError } from '@/utils/errorHandler';
import { IAuthRequest } from '@/types';
import OrderNotificationService from '@/services/orderNotificationService';
import { getInitialStatusForOrder, isValidStatusTransition } from '@/utils/orderStatusTransitions';
import {
  emitOrderCreated,
  emitOrderStatusUpdated,
  emitOrderCancelled,
  emitOrderAssigned,
} from '@/utils/orderRealtime';
import { validateRiderStatusChange, getOrderProximityForRider } from '@/services/locationService';
import { queueBillPrint, orderToBillOrder } from '@/services/printerService';
import { formatBillText } from '@/services/billFormatter';
import { Types } from 'mongoose';
import { RestaurantTable } from '@/models/RestaurantTable';
import { User } from '@/models/User';
import { normalizeOrderPayload } from '@/utils/normalizeOrderPayload';

export class OrderController {
  private orderRepository: OrderRepository;
  private menuRepository: MenuRepository;
  private restaurantRepository: RestaurantRepository;
  private userRepository: UserRepository;
  private notificationService: NotificationService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.menuRepository = new MenuRepository();
    this.restaurantRepository = new RestaurantRepository();
    this.userRepository = new UserRepository();
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

  private async resolveGuestCustomer(customerName?: string, phoneNumber?: string) {
    const normalizedName = String(customerName || '').trim() || 'Guest Customer';
    const phoneDigits = String(phoneNumber || '').replace(/\D/g, '');
    const normalizedPhone = phoneDigits.replace(/^0+/, '');
    const validGuestPhone = /^[1-9]\d{0,15}$/.test(normalizedPhone) ? normalizedPhone : undefined;
    const emailKey = phoneDigits || `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const guestEmail = `guest.${emailKey}@example.com`;
    const existing = await this.userRepository.findByEmail(guestEmail);
    if (existing) {
      return existing;
    }
    const created = await this.userRepository.create({
      email: guestEmail,
      passwordHash: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      displayName: normalizedName,
      role: 'CUSTOMER' as any,
      phoneNumber: validGuestPhone,
      emailVerified: false,
      phoneVerified: false,
      isActive: true,
    } as any);
    return created;
  }

  createOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    console.log('[ORDER DEBUG] ====== START ORDER CREATION ======');
    console.log('[ORDER DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      items,
      restaurantId,
      customerName,
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

    const actor = req.user || (await this.resolveGuestCustomer(customerName, phoneNumber) as any);
    const userId = actor?._id;
    const userRole = actor?.role;
    const resolvedCustomerName =
      (typeof customerName === 'string' && customerName.trim().length > 0)
        ? customerName.trim()
        : (actor as any)?.displayName || (actor as any)?.name || '';

    // Customer orders must include a name (either provided or from profile)
    if (userRole === 'CUSTOMER' && !resolvedCustomerName) {
      throw createError('Customer name is required', 400);
    }

    console.log('[ORDER DEBUG] userId:', userId);
    console.log('[ORDER DEBUG] restaurantId:', restaurantId);
    console.log('[ORDER DEBUG] items count:', items?.length);

    // Validate restaurant
    console.log('[ORDER DEBUG] Validating restaurant...');
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    console.log('[ORDER DEBUG] Restaurant found:', !!restaurant);
    
    if (!restaurant || restaurant.isActive === false) {
      console.log('[ORDER DEBUG] Restaurant validation FAILED:', { exists: !!restaurant, isActive: restaurant?.isActive });
      throw createError('Branch not available', 404);
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
            if (menuItem.isAvailable === false || menuItem.isActive === false) {
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
      
      if (menuItem.isAvailable === false || menuItem.isActive === false) {
        console.log(`[ORDER DEBUG] Item NOT AVAILABLE: ${item.menuItemId}`);
        throw createError(`"${menuItem.name}" is not available`, 400);
      }

      console.log(`[ORDER DEBUG] Item ${item.menuItemId} validated OK, price=${menuItem.price}, hasSizes=${menuItem.hasSizes}`);
      
      // Calculate effective price - use effectivePrice virtual or calculate from productSizes
      let unitPrice = Number(menuItem.effectivePrice ?? menuItem.price ?? 0);
      
      if (menuItem.hasSizes && menuItem.productSizes && menuItem.productSizes.length > 0) {
        const sizePrices = menuItem.productSizes
          .map((ps: any) => Number(ps?.price))
          .filter((p: number) => Number.isFinite(p) && p > 0);
        if (sizePrices.length > 0) {
          unitPrice = Math.min(...sizePrices);
        }
        console.log(`[ORDER DEBUG] Sized product - using price: ${unitPrice} (base price was: ${menuItem.price})`);
      }

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw createError(`"${menuItem.name}" has no valid price configured`, 400);
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

    // Check minimum order amount (branch field optional; system settings fallback)
    const settingsForMin = await SystemSettings.findOne().lean();
    const minOrderAmount = Number(
      restaurant.minOrderAmount ?? settingsForMin?.deliverySettings?.minimumOrder ?? 0
    );
    console.log('[ORDER DEBUG] Checking minimum order amount:', { totalAmount, minOrderAmount });
    if (minOrderAmount > 0 && totalAmount < minOrderAmount) {
      console.log('[ORDER DEBUG] Minimum order amount FAILED');
      throw createError(`Minimum order amount is ${minOrderAmount}`, 400);
    }
    console.log('[ORDER DEBUG] Minimum order amount OK');

    // Calculate fees
    console.log('[ORDER DEBUG] Calculating fees...');
    const normalizedOrderTypeForFees =
      orderType === 'pickup' || orderType === 'DINE_IN' || orderType === 'dine_in'
        ? 'DINE_IN'
        : orderType;
    const deliveryFee =
      normalizedOrderTypeForFees === 'DELIVERY' ? Number(restaurant.deliveryFee ?? 0) : 0;
    
    // Fetch tax rate from settings (default to 0 if not set)
    const settings = settingsForMin || (await SystemSettings.findOne());
    const taxRate = (settings?.taxRate ?? 0) / 100; // Convert percentage to decimal
    console.log('[ORDER DEBUG] Tax rate from settings:', settings?.taxRate ?? 0, '% =', taxRate);
    
    const tax = totalAmount * taxRate;
    const finalAmount = totalAmount + deliveryFee + tax;
    console.log('[ORDER DEBUG] Fees calculated:', { deliveryFee, taxRate, tax, finalAmount });

    // Calculate estimated delivery time
    const estimatedDeliveryTime = new Date();
    const deliveryMinutes = Number(
      restaurant.deliveryTime ?? settings?.deliverySettings?.estimatedDeliveryTime ?? 30
    );
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + deliveryMinutes);

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
    let resolvedTableNumber = tableNumber ?? table_number;
    if (normalizedOrderType === 'DINE_IN' && resolvedTableId && !resolvedTableNumber) {
      const tableDoc = await RestaurantTable.findById(resolvedTableId).select('tableNumber').lean();
      if (tableDoc?.tableNumber) resolvedTableNumber = String(tableDoc.tableNumber);
    }

    const orderData: any = {
      customer: userId, // The waiter is both customer and waiter for dine-in orders
      customerName: resolvedCustomerName || 'Walk-in Customer',
      branch: restaurantId,
      orderNumber,
      items: validatedItems,
      subtotal: totalAmount,
      totalAmount,
      deliveryFee,
      taxAmount: tax,
      finalAmount,
      // NOTE: Order model does not persist a deliveryAddress object.
      // Store text in addressLine and coords in deliveryLocation instead.
      addressLine: deliveryAddress?.street || deliveryAddress?.address || '',
      deliveryInstructions,
      specialInstructions: req.body.specialInstructions || deliveryInstructions,
      estimatedDeliveryTime,
      orderType: normalizedOrderType,
      paymentMethod,
      phoneNumber,
      alternatePhoneNumber,
      status: getInitialStatusForOrder(normalizedOrderType, userRole),
      paymentStatus: 'PENDING',
    };

    if (normalizedOrderType === 'DINE_IN' && userRole === 'WAITER') {
      orderData.kitchenAcceptedAt = new Date();
      orderData.items = validatedItems.map((item: any) => ({
        ...item,
        status: 'PREPARING',
        preparingAt: new Date(),
      }));
    }

    if (normalizedOrderType === 'DELIVERY') {
      const coords = deliveryAddress?.coordinates;
      const lat = coords?.lat;
      const lng = coords?.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        orderData.deliveryLocation = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }

    if (normalizedOrderType === 'DINE_IN') {
      orderData.waiter = userId;
      if (resolvedTableId) orderData.table = resolvedTableId;
      if (resolvedTableNumber) orderData.tableNumber = String(resolvedTableNumber);

      const waiterProfile = await User.findById(userId).select('displayName email').lean();
      const waiterLabel =
        (waiterProfile?.displayName && String(waiterProfile.displayName).trim()) ||
        (waiterProfile?.email ? String(waiterProfile.email).split('@')[0] : '') ||
        (userRole === 'WAITER' ? 'Waiter' : '');
      if (waiterLabel) orderData.waiterName = waiterLabel;
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
      if (normalizedOrderType === 'DINE_IN' && userRole === 'WAITER') {
        await OrderNotificationService.notifyOrderPreparing(order._id.toString());
      } else {
        await OrderNotificationService.notifyOrderPlaced(order._id.toString());
      }
      
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
    
    const waiterId =
      populatedOrder?.waiter?._id?.toString?.() ||
      (userRole === 'WAITER' ? userId.toString() : undefined);
    emitOrderCreated({
      orderId: order._id.toString(),
      status: orderData.status,
      branchId: restaurantId,
      orderType: normalizedOrderType,
      order: populatedOrder,
      waiterId,
    });

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
        if (!menuItem || menuItem.isAvailable === false || menuItem.isActive === false) {
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
  // Waiter can mark items as RETURNED
  updateItemStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { orderId, itemId } = req.params;
    const { status, reason } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Allow RETURNED status for waiters, plus standard statuses for chef
    const allowedStatuses = ['PREPARING', 'READY', 'SERVED', 'RETURNED'];
    if (!allowedStatuses.includes(status)) {
      throw createError('Invalid item status. Must be PREPARING, READY, SERVED, or RETURNED', 400);
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization
    const isChef = ['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER'].includes(userRole);
    const isWaiter = userRole === 'WAITER' || userRole === 'BRANCH_MANAGER';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    // Only chefs can update to PREPARING, READY, SERVED
    if (['PREPARING', 'READY', 'SERVED'].includes(status) && !isChef && !isAdmin) {
      throw createError('Not authorized to update item status to ' + status, 403);
    }

    // Only waiters/admins can mark items as RETURNED
    if (status === 'RETURNED' && !isWaiter && !isAdmin) {
      throw createError('Only waiters can return items', 403);
    }

    if (status === 'RETURNED') {
      const orderStatus = String(order.status || '').toUpperCase();
      if (!['SERVED', 'COMPLETED'].includes(orderStatus)) {
        throw createError('Items can only be returned after the order is served or completed', 400);
      }
      if (order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'PAID') {
        throw createError('Cannot return items after payment is completed', 400);
      }
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
    } else if (status === 'RETURNED') {
      updateData[`items.${itemIndex}.returnedAt`] = new Date();
      updateData[`items.${itemIndex}.returnReason`] = reason || 'Returned by waiter';
      // Mark item as returned and update order totals
      updateData[`items.${itemIndex}.isReturned`] = true;
    }

    const updatedOrder = await this.orderRepository.updateById(orderId, updateData);
    const populatedOrder = await this.orderRepository.findById(orderId);

    // Recalculate order totals if item was returned
    if (status === 'RETURNED') {
      const returnedItem = populatedOrder.items[itemIndex];
      const newSubtotal = populatedOrder.items.reduce((sum: number, item: any) => {
        if (item.status === 'RETURNED' || item.isReturned) {
          return sum; // Don't include returned items in total
        }
        return sum + (item.totalPrice || item.unitPrice * item.quantity || 0);
      }, 0);
      
      // Update order totals
      const taxAmount = populatedOrder.taxAmount || 0;
      const deliveryFee = populatedOrder.deliveryFee || 0;
      const newTotal = newSubtotal + taxAmount + deliveryFee;
      
      await this.orderRepository.updateById(orderId, {
        subtotal: newSubtotal,
        totalAmount: newSubtotal,
        finalAmount: newTotal,
      });
      
      // Reload the order with updated totals
      const reloadedOrder = await this.orderRepository.findById(orderId);
      
      // Notify chef about returned item
      if (reloadedOrder.branch) {
        try {
          await this.notifyByRole(
            'CHEF',
            reloadedOrder.branch._id.toString(),
            'ITEM_RETURNED',
            'Item Returned',
            `Item in Order #${reloadedOrder.orderNumber} was returned: ${returnedItem.productName || 'Unknown Item'}${reason ? ` (Reason: ${reason})` : ''}`,
            { orderId: reloadedOrder._id, itemId, reason },
            'HIGH'
          );
        } catch (notifError) {
          console.error('[ITEM RETURN] Failed to notify chef:', notifError);
        }
      }
      
      sendSuccess(res, reloadedOrder, 'Item returned successfully');
      return;
    }

    // Check if all items are now READY - update order status
    const allItemsReady = populatedOrder.items.every((item: any) => 
      item.status === 'READY' || item.status === 'SERVED' || item.status === 'RETURNED'
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
    const allItemsServed = populatedOrder.items.every((item: any) => 
      item.status === 'SERVED' || item.status === 'RETURNED'
    );
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

  getGuestOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    sendSuccess(res, {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      branch: order.branch ? { branchName: (order.branch as any).branchName } : undefined,
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            quantity: item.quantity,
            product: { name: item.productName || item.product?.name || 'Item' },
          }))
        : [],
    }, 'Order status retrieved successfully');
  });

  getOrderById = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const role = String(userRole);

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // Check authorization
    const isCustomer = order.customer._id.toString() === userId.toString();
    const isRestaurantOwner = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isDriver = order.rider && order.rider._id.toString() === userId.toString();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const userBranch = (req.user as any).assignedBranch;
    const userBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
    const orderBranchId = order.branch?._id?.toString() || order.branch?.toString?.() || '';
    const isBranchManagerForOrder =
      (role === 'BRANCH_MANAGER' || role === 'MANAGER') &&
      !!userBranchId &&
      !!orderBranchId &&
      userBranchId === orderBranchId;

     // Riders should be able to view delivery orders that are available/ready (unassigned)
     // so they can inspect details before accepting.
     const isRider = userRole === 'RIDER' || userRole === 'SUPER_ADMIN';
     const isAvailableDeliveryForRider =
       isRider &&
       String(order?.orderType || '').toUpperCase() === 'DELIVERY' &&
       ['READY', 'RIDER_ASSIGNED'].includes(String(order?.status || '').toUpperCase()) &&
       (!order.rider || String(order.rider?._id || order.rider) === String(userId));

    if (!isCustomer && !isRestaurantOwner && !isBranchManagerForOrder && !isDriver && !isAdmin && !isAvailableDeliveryForRider) {
      throw createError('Not authorized to view this order', 403);
    }

    sendSuccess(res, normalizeOrderPayload(order), 'Order retrieved successfully');
  });

  updateOrderStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, paymentMethod, paymentStatus, latitude, longitude } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const role = String(userRole);

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    const normalizedStatus = String(status || '').toUpperCase();
    const orderType = String(order.orderType || 'DELIVERY');

    if (
      !isValidStatusTransition(String(order.status), normalizedStatus, orderType, role)
    ) {
      throw createError(
        `Invalid status transition from ${order.status} to ${normalizedStatus} for ${orderType}`,
        400
      );
    }

    const isDriverCheck = order.rider && order.rider._id.toString() === userId.toString();
    if (isDriverCheck && ['PICKED_UP', 'DELIVERED'].includes(normalizedStatus)) {
      const locCheck = validateRiderStatusChange({
        riderId: userId.toString(),
        order,
        newStatus: normalizedStatus,
        requestCoords:
          typeof latitude === 'number' && typeof longitude === 'number'
            ? { latitude, longitude }
            : null,
        skipValidation: userRole === 'SUPER_ADMIN',
      });
      if (!locCheck.ok) {
        throw createError(locCheck.message, 400);
      }
    }

    // Check authorization based on status update
    const isRestaurantOwner = order.branch?.branchManager && order.branch.branchManager.toString() === userId.toString();
    const isDriver = order.rider && order.rider._id.toString() === userId.toString();
    const kitchenRoles = new Set(['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER']);
    const isChef = kitchenRoles.has(role);
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    // Allow any waiter from the branch to pick up orders (not just assigned waiter)
    const userBranch = (req.user as any).assignedBranch;
    const userBranchId = userBranch?._id?.toString() || userBranch?.toString() || '';
    const orderBranchId = order.branch?._id?.toString() || order.branch?.toString?.() || '';
    const isBranchManagerForOrder =
      (role === 'BRANCH_MANAGER' || role === 'MANAGER') &&
      !!userBranchId &&
      !!orderBranchId &&
      userBranchId === orderBranchId;
    const isWaiter = userRole === 'WAITER' && (
      (order.waiter && order.waiter._id.toString() === userId.toString()) ||
      (order.branch && order.branch._id.toString() === userBranchId)
    );

    // Define allowed status transitions by role
    const allowedTransitions = {
      restaurant_owner: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'CANCELLED'],
      chef: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
      driver: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      admin: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKED_UP', 'COMPLETED', 'SERVED'],
      waiter: ['READY', 'SERVED', 'COMPLETED', 'PICKED_UP'],
      branch_manager: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKED_UP', 'COMPLETED', 'SERVED'],
    };

    let canUpdate = false;
    if (isRestaurantOwner && allowedTransitions.restaurant_owner.includes(normalizedStatus)) {
      canUpdate = true;
    } else if (isChef && allowedTransitions.chef.includes(normalizedStatus)) {
      canUpdate = true;
    } else if (isDriver && allowedTransitions.driver.includes(normalizedStatus)) {
      canUpdate = true;
    } else if (isAdmin && allowedTransitions.admin.includes(normalizedStatus)) {
      canUpdate = true;
    } else if (isBranchManagerForOrder && allowedTransitions.branch_manager.includes(normalizedStatus)) {
      canUpdate = true;
    } else if (isWaiter && allowedTransitions.waiter.includes(normalizedStatus)) {
      if (
        orderType === 'DINE_IN' &&
        normalizedStatus === 'PICKED_UP'
      ) {
        throw createError('PICKED_UP is not used for dine-in orders. Use SERVED instead.', 400);
      }
      // Waiter can only mark as COMPLETED if payment is done
      if (normalizedStatus === 'COMPLETED') {
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
    const updateData: any = { status: normalizedStatus };

    // Waiter marking dine-in READY → mark items ready; SERVED → mark items served
    if (isWaiter && orderType === 'DINE_IN' && normalizedStatus === 'READY') {
      order.items.forEach((item: any, index: number) => {
        if (item.status !== 'SERVED' && item.status !== 'RETURNED') {
          updateData[`items.${index}.status`] = 'READY';
          updateData[`items.${index}.readyAt`] = new Date();
        }
      });
    }
    if (isWaiter && orderType === 'DINE_IN' && normalizedStatus === 'SERVED') {
      order.items.forEach((item: any, index: number) => {
        if (item.status === 'READY') {
          updateData[`items.${index}.status`] = 'SERVED';
          updateData[`items.${index}.servedAt`] = new Date();
        }
      });
      updateData.servedAt = new Date();
    }
    
    // When chef marks order as PREPARING, mark all PENDING items as PREPARING
    if (normalizedStatus === 'PREPARING' && isChef) {
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
    if (normalizedStatus === 'READY' && isChef) {
      const itemUpdates: any = {};
      order.items.forEach((item: any, index: number) => {
        if (item.status !== 'SERVED') {
          itemUpdates[`items.${index}.status`] = 'READY';
          itemUpdates[`items.${index}.readyAt`] = new Date();
        }
      });
      Object.assign(updateData, itemUpdates);
      updateData.readyAt = new Date();
      
      // AUTO-ASSIGNMENT: For delivery orders without a rider, find nearest on-duty rider
      if (order.orderType === 'DELIVERY' && !order.rider) {
        try {
          // Get branch location for finding nearby riders
          const branchLocation = order.branch?.location;
          if (branchLocation) {
            // Extract coordinates - handle both GeoJSON and plain lat/lng formats
            let longitude: number | undefined;
            let latitude: number | undefined;
            
            if (branchLocation.coordinates && Array.isArray(branchLocation.coordinates)) {
              // GeoJSON format: [longitude, latitude]
              longitude = branchLocation.coordinates[0];
              latitude = branchLocation.coordinates[1];
            } else if (branchLocation.longitude !== undefined && branchLocation.latitude !== undefined) {
              longitude = branchLocation.longitude;
              latitude = branchLocation.latitude;
            } else if (branchLocation.lng !== undefined && branchLocation.lat !== undefined) {
              longitude = branchLocation.lng;
              latitude = branchLocation.lat;
            }
            
            if (longitude !== undefined && latitude !== undefined) {
              console.log(`[AUTO-ASSIGN] Looking for riders near branch at [${longitude}, ${latitude}]`);
              
              const nearbyRiders = await this.userRepository.findNearbyOnDutyRiders(longitude, latitude, 10);
              
              if (nearbyRiders.length > 0) {
                const nearestRider = nearbyRiders[0];
                console.log(`[AUTO-ASSIGN] Found ${nearbyRiders.length} riders, assigning to nearest: ${nearestRider.displayName} (${nearestRider._id})`);
                
                // Assign rider to order
                updateData.rider = nearestRider._id;
                updateData.status = 'RIDER_ASSIGNED';
                
                // Notify the assigned rider
                try {
                  await NotificationServiceGlobal.sendNotification({
                    recipient: nearestRider._id.toString(),
                    recipientRole: 'RIDER',
                    type: 'ORDER_ASSIGNED',
                    title: 'New Delivery Assignment',
                    message: `Order #${order.orderNumber} has been auto-assigned to you. Pick up from ${order.branch?.branchName || 'restaurant'}.`,
                    data: {
                      orderId: order._id.toString(),
                      orderNumber: order.orderNumber,
                    },
                    priority: 'HIGH',
                  });
                  console.log(`[AUTO-ASSIGN] Notification sent to rider ${nearestRider._id}`);
                } catch (notifError) {
                  console.error('[AUTO-ASSIGN] Failed to notify rider:', notifError);
                }
              } else {
                console.log('[AUTO-ASSIGN] No on-duty riders found within 10km');
              }
            } else {
              console.log('[AUTO-ASSIGN] Branch location coordinates not available');
            }
          } else {
            console.log('[AUTO-ASSIGN] No branch location found for order');
          }
        } catch (assignError) {
          console.error('[AUTO-ASSIGN] Failed to auto-assign rider:', assignError);
          // Don't fail the order update if auto-assignment fails
        }
      }
    }
    
    // Generate invoice when order is picked up
    if (normalizedStatus === 'PICKED_UP') {
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
    if (normalizedStatus === 'COMPLETED') {
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

    // Real-time notifications (DB + WebSocket)
    const orderId = order._id.toString();
    const orderNumber = order.orderNumber || `ORD-${orderId.slice(-6).toUpperCase()}`;
    const actorUserId = userId.toString();
    const actorName = String((req.user as any)?.displayName || (req.user as any)?.name || 'Waiter').trim();
    const tableNumber = String(order.table?.tableNumber || order.tableNumber || '').trim();
    const notifyBranchId =
      order.branch?._id?.toString?.() || (order.branch ? String(order.branch) : userBranchId || undefined);
    const waiterStatusNotifyInput = {
      orderId,
      orderNumber,
      newStatus: normalizedStatus,
      actorUserId,
      actorDisplayName: actorName,
      branchId: notifyBranchId,
      tableNumber: tableNumber || undefined,
      orderType,
    };

    try {
      const waiterDroveStatus =
        isWaiter && ['READY', 'SERVED', 'COMPLETED', 'PICKED_UP'].includes(normalizedStatus);

      if (waiterDroveStatus) {
        await OrderNotificationService.notifyWaiterStatusChange(waiterStatusNotifyInput);
      } else if (normalizedStatus === 'CANCELLED' && isWaiter) {
        await OrderNotificationService.notifyOrderCancelled(orderId);
        await OrderNotificationService.notifyWaiterStatusChange({
          ...waiterStatusNotifyInput,
          skipTeamRoles: ['CHEF'],
        });
      } else {
        switch (normalizedStatus) {
          case 'KITCHEN_ACCEPTED':
          case 'CONFIRMED':
            await OrderNotificationService.notifyOrderPreparing(orderId);
            if (order.waiter) {
              await this.notificationService.createOrderStatusNotification(
                order.waiter._id.toString(),
                orderId,
                orderNumber,
                'KITCHEN_ACCEPTED',
                'Order Accepted by Kitchen',
                `Order #${order.orderNumber} has been accepted by kitchen and will be prepared soon.`
              );
            }
            break;
          case 'PREPARING':
            await OrderNotificationService.notifyOrderPreparing(orderId);
            if (order.waiter) {
              await this.notificationService.createOrderStatusNotification(
                order.waiter._id.toString(),
                orderId,
                orderNumber,
                'PREPARING',
                'Order is Being Prepared',
                `Order #${order.orderNumber} is now being prepared by the kitchen.`
              );
            }
            break;
          case 'READY':
            await OrderNotificationService.notifyOrderReady(orderId);
            if (order.orderType === 'DINE_IN' && order.waiter) {
              await this.notificationService.createKitchenReadyNotification(
                order.waiter._id.toString(),
                orderId,
                tableNumber || '-',
                orderNumber
              );
            }
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
            break;
          default:
            break;
        }
      }
    } catch (notifError) {
      console.error('[Order Event] updateOrderStatus notification failed:', notifError);
    }

    const branchId =
      order.branch?._id?.toString?.() || (order.branch ? String(order.branch) : undefined);
    const waiterId =
      order.waiter?._id?.toString?.() || (order.waiter ? String(order.waiter) : undefined);
    const riderId =
      updatedOrder?.rider?._id?.toString?.() ||
      order.rider?._id?.toString?.() ||
      undefined;

    if (normalizedStatus === 'RIDER_ASSIGNED' && riderId) {
      emitOrderAssigned({
        orderId: order._id.toString(),
        status: normalizedStatus,
        branchId,
        orderType,
        order: populatedOrder,
        waiterId,
        riderId,
      });
    } else if (normalizedStatus === 'CANCELLED') {
      emitOrderCancelled({
        orderId: order._id.toString(),
        status: normalizedStatus,
        branchId,
        orderType,
        order: populatedOrder,
        waiterId,
        riderId,
      });
    } else {
      emitOrderStatusUpdated({
        orderId: order._id.toString(),
        status: normalizedStatus,
        branchId,
        orderType,
        order: populatedOrder,
        waiterId,
        riderId,
      });
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');
  });

  returnOrderItem = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    req.params.orderId = req.params.orderId || req.params.id;
    const { orderId, itemId } = req.params;
    const { reason } = req.body as { reason?: string };
    const userRole = req.user!.role;

    if (userRole !== 'WAITER' && userRole !== 'BRANCH_MANAGER' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw createError('Only waiters can return items', 403);
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    const orderStatus = String(order.status || '').toUpperCase();
    if (!['SERVED', 'COMPLETED'].includes(orderStatus)) {
      throw createError('Items can only be returned after the order is served or completed', 400);
    }

    const itemIndex = order.items.findIndex(
      (item: any) => item._id?.toString() === itemId || item.id?.toString() === itemId
    );
    if (itemIndex === -1) {
      throw createError('Item not found in order', 404);
    }

    const item = order.items[itemIndex] as any;
    if (item.status === 'RETURNED' || item.isReturned) {
      throw createError('Item is already returned', 400);
    }

    if (order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'PAID') {
      throw createError('Cannot return items after payment is completed', 400);
    }

    const updateData: Record<string, unknown> = {
      [`items.${itemIndex}.status`]: 'RETURNED',
      [`items.${itemIndex}.isReturned`]: true,
      [`items.${itemIndex}.returnedAt`]: new Date(),
      [`items.${itemIndex}.returnReason`]: reason || 'Returned by waiter',
    };

    await this.orderRepository.updateById(orderId, updateData);

    const reloadedOrder = await this.orderRepository.findById(orderId);
    const newSubtotal = (reloadedOrder?.items || []).reduce((sum: number, row: any) => {
      if (row.status === 'RETURNED' || row.isReturned) return sum;
      return sum + (row.totalPrice || row.unitPrice * row.quantity || 0);
    }, 0);
    const taxAmount = reloadedOrder?.taxAmount || 0;
    const deliveryFee = reloadedOrder?.deliveryFee || 0;
    const newFinal = newSubtotal + taxAmount + deliveryFee;

    await this.orderRepository.updateById(orderId, {
      subtotal: newSubtotal,
      totalAmount: newSubtotal,
      finalAmount: newFinal,
    });

    const populatedOrder = await this.orderRepository.findById(orderId);

    if (populatedOrder?.branch) {
      try {
        await this.notifyByRole(
          'BRANCH_MANAGER',
          populatedOrder.branch._id.toString(),
          'ITEM_RETURNED',
          'Item Returned',
          `Order #${populatedOrder.orderNumber}: ${item.productName || 'item'} returned${reason ? ` (${reason})` : ''}`,
          { orderId, itemId, reason },
          'HIGH'
        );
        await this.notifyByRole(
          'ADMIN',
          populatedOrder.branch._id.toString(),
          'ITEM_RETURNED',
          'Item Returned',
          `Order #${populatedOrder.orderNumber}: item returned`,
          { orderId, itemId },
          'NORMAL'
        );
      } catch (notifError) {
        console.error('[returnOrderItem] notify failed', notifError);
      }
    }

    sendSuccess(res, populatedOrder, 'Item returned successfully');
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
      orders: (orders || []).map((o: any) => normalizeOrderPayload(o)),
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

    // Get orders assigned to this rider
    const assignedResult = await this.orderRepository.findByRiderId(userId, page, limit, status);

    // Also get available delivery orders (READY with no rider) that could be picked up
    const availableResult = await this.orderRepository.getAvailableOrdersForRiders(page, limit);

    // Combine both, removing duplicates (in case rider has orders that are also "available")
    const assignedIds = new Set(assignedResult.orders.map(o => o._id.toString()));
    const availableOrders = availableResult.orders.filter(o => !assignedIds.has(o._id.toString()));

    const allOrders = [...assignedResult.orders, ...availableOrders];
    const total = assignedResult.total + availableOrders.length;

    const totalPages = Math.ceil(total / limit);

    console.log(`[getDriverOrders] Rider ${userId}: ${assignedResult.orders.length} assigned, ${availableOrders.length} available`);

    sendSuccess(res, {
      orders: allOrders,
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
    const populatedOrder = await this.orderRepository.findById(id);
    const branchId =
      order.branch?._id?.toString?.() || (order.branch ? String(order.branch) : undefined);
    const orderType = String(order.orderType || 'DELIVERY');

    emitOrderAssigned({
      orderId: String(id),
      status: 'RIDER_ASSIGNED',
      branchId,
      orderType,
      order: populatedOrder || updatedOrder,
      riderId: userId.toString(),
    });

    // Real-time rider assigned notifications (DB + WebSocket)
    try {
      await OrderNotificationService.notifyRiderAssigned(id, userId.toString());
    } catch (notifError) {
      console.error('[Order Event] acceptOrder notifyRiderAssigned failed:', notifError);
    }

    sendSuccess(res, populatedOrder || updatedOrder, 'Order accepted successfully');
  });

  rejectOrder = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    const assignedRiderId = String((order as any)?.rider?._id ?? (order as any)?.rider ?? '').trim();
    const currentUserId = String(userId ?? '').trim();

    // Debug logging to diagnose authorization issues
    console.log('[rejectOrder] Debug:', {
      orderId: id,
      userId: userId.toString(),
      orderRider: order.rider ? {
        _id: order.rider._id?.toString(),
        displayName: order.rider.displayName
      } : null,
      orderStatus: order.status,
      orderRiderId: order.rider?._id?.toString(),
      userIdString: userId.toString(),
      match: assignedRiderId === currentUserId
    });

    // Check if the current rider is the one rejecting
    const isAssignedRider = !!assignedRiderId && assignedRiderId === currentUserId;
    if (!isAssignedRider) {
      throw createError('Not authorized to reject this order', 403);
    }

    // Update order: clear rider, record rejection reason, set status back to READY
    const updateData: any = {
      rider: null,
      rejectionReason: reason || 'Rider rejected the order',
      status: 'READY',
    };

    const updatedOrder = await this.orderRepository.updateById(id, updateData);
    const populatedOrder = await this.orderRepository.findById(id);

    // Notify admin and branch manager only (not customer)
    try {
      const orderId = order._id.toString();
      const branchId = order.branch?._id?.toString();

      // Notify branch manager
      if (branchId) {
        await this.notifyByRole(
          'BRANCH_MANAGER',
          branchId,
          'ORDER_REJECTED_BY_RIDER',
          'Order Rejected by Rider',
          `Order #${order.orderNumber} was rejected by ${order.rider?.displayName || 'rider'}${reason ? ` (Reason: ${reason})` : ''}`,
          { orderId: order._id, rejectionReason: reason },
          'HIGH'
        );
      }

      // Notify admin
      await this.notifyByRole(
        'ADMIN',
        branchId || '',
        'ORDER_REJECTED_BY_RIDER',
        'Order Rejected by Rider',
        `Order #${order.orderNumber} was rejected${reason ? ` (Reason: ${reason})` : ''}`,
        { orderId: order._id, rejectionReason: reason },
        'HIGH'
      );
    } catch (notifError) {
      console.error('[Order Reject] Failed to send notifications:', notifError);
    }

    const branchId =
      order.branch?._id?.toString?.() || (order.branch ? String(order.branch) : undefined);
    emitOrderStatusUpdated({
      orderId: String(id),
      status: 'READY',
      branchId,
      orderType: String(order.orderType || 'DELIVERY'),
      order: populatedOrder,
      riderId: currentUserId,
    });

    sendSuccess(res, populatedOrder, 'Order rejected successfully');
  });

  addReview = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { foodRating, deliveryRating } = req.body;
    const userId = req.user!._id;

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw createError('Order not found', 404);
    }

    if (order.customer._id.toString() !== userId.toString()) {
      throw createError('Not authorized to review this order', 403);
    }

    if (order.status !== 'DELIVERED') {
      throw createError('Order must be delivered to be reviewed', 400);
    }

    if (order.foodRating || order.deliveryRating) {
      throw createError('Order has already been reviewed', 400);
    }

    const updatedOrder = await this.orderRepository.addReview(id, foodRating, undefined, deliveryRating);

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
    const { status, page = '1', limit = '10', branchId } = req.query as any;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = {};

    const userRole = req.user?.role;

    const userBranch = req.user?.assignedBranch as any;
    const assignedBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';

    // Branch scoping
    // - If branchId is supplied, filter by it
    // - If role is branch-scoped, force it to their assigned branch
    const requestedBranchId = branchId ? String(branchId) : '';
    const isBranchScopedRole = userRole === 'BRANCH_MANAGER' || userRole === 'WAITER' || userRole === 'CHEF';

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw createError('Access denied. No branch assigned to this user.', 403);
      }
      const asObj = Types.ObjectId.isValid(assignedBranchId) ? new Types.ObjectId(assignedBranchId) : null;
      filter.branch = asObj ? { $in: [asObj, assignedBranchId] } : assignedBranchId;
    } else if (requestedBranchId) {
      const asObj = Types.ObjectId.isValid(requestedBranchId) ? new Types.ObjectId(requestedBranchId) : null;
      filter.branch = asObj ? { $in: [asObj, requestedBranchId] } : requestedBranchId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }
    
    console.log('[getAllOrders] Filter:', JSON.stringify(filter), 'Page:', pageNum, 'Limit:', limitNum);

    const orders = await this.orderRepository.findAllOrders(filter, pageNum, limitNum);
    console.log('[getAllOrders] Orders found:', orders?.length || 0);
    
    const normalizedOrders = (orders || []).map((o: any) => normalizeOrderPayload(o));
    
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

  generateBill = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const id = String(req.params.id || req.params.orderId || '').trim();
    if (!id) throw createError('Order id is required', 400);
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(id);
    if (!order) throw createError('Order not found', 404);

    const branchId = order.branch?._id?.toString() || String(order.branch);
    const isStaff = ['WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
    if (!isStaff) throw createError('Not authorized', 403);

    const settings = await SystemSettings.findOne().lean();
    const restaurantName = (settings as any)?.restaurantName || (settings as any)?.appName || 'Restaurant';
    const branchName = order.branch?.branchName || 'Branch';
    const billText = formatBillText(orderToBillOrder(order), { restaurantName, branchName });

    let printJob = null;
    let printError: string | null = null;
    try {
      printJob = await queueBillPrint({
        order,
        branchId,
        requestedBy: userId.toString(),
        restaurantName,
        branchName,
      });
    } catch (e: any) {
      printError = e?.message || 'Print queue failed';
    }

    sendSuccess(
      res,
      {
        order,
        billText,
        printJob,
        printQueued: !!printJob,
        printError,
      },
      printJob ? 'Bill generated and sent to printer' : 'Bill generated (print unavailable)'
    );
  });

  getOrderProximity = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const order = await this.orderRepository.findById(id);
    if (!order) throw createError('Order not found', 404);

    const isRider =
      userRole === 'RIDER' &&
      order.rider &&
      String(order.rider._id || order.rider) === String(userId);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(userRole);
    if (!isRider && !isAdmin) throw createError('Not authorized', 403);

    const proximity = getOrderProximityForRider(userId.toString(), order);
    sendSuccess(res, proximity, 'Proximity data retrieved');
  });

  patchOrderStatus = asyncHandler(async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    req.params.id = req.params.orderId || req.params.id;
    return this.updateOrderStatus(req, res, next);
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
      // assignedBranch is either an ObjectId or a populated object with _id
      const userBranch = req.user!.assignedBranch as any;
      targetBranchId = userBranch?._id?.toString() || userBranch?.toString() || '';
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

    const normalizedOrders = (orders || []).map((o: any) => normalizeOrderPayload(o));

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

    const normalizedOrders = (orders || []).map((o: any) => normalizeOrderPayload(o));

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
