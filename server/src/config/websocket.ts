import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Express } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { User } from '@/models/User';
import { Branch } from '@/models/Branch';
import { SystemSettings } from '@/models/SystemSettings';
import { Banner } from '@/models/Banner';
import { Deal } from '@/models/Deal';
import { DealCampaign } from '@/models/DealCampaign';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { MenuRepository } from '@/modules/menu/menu.repository';
import { OrderRepository } from '@/modules/order/order.repository';
import { TableRepository } from '@/modules/table/table.repository';
import { NotificationService } from '@/modules/notification/notification.service';
import { Types } from 'mongoose';
import BranchProduct from '@/models/BranchProduct';

// Store connected users
interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
  connectedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

export const initWebSocket = (app: Express) => {
  const httpServer = createServer(app);
  const dashboardService = new DashboardService();
  const menuRepository = new MenuRepository();
  const orderRepository = new OrderRepository();
  const tableRepository = new TableRepository();
  const notificationService = new NotificationService();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const authToken = (socket.handshake.auth as any)?.token;
      const headerToken = socket.handshake.headers?.authorization?.toString().replace('Bearer ', '');
      const token = authToken || headerToken;

      if (!token) {
        return next(new Error('unauthorized'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('_id role isActive assignedBranch');
      if (!user || !user.isActive) {
        return next(new Error('unauthorized'));
      }

      (socket.data as any).user = {
        userId: user._id.toString(),
        role: String(user.role || '').toUpperCase(),
        assignedBranchId: user.assignedBranch ? String((user as any).assignedBranch?._id || user.assignedBranch) : '',
      };

      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);

    const authed = (socket.data as any)?.user as { userId?: string; role?: string; assignedBranchId?: string } | undefined;
    const userId = authed?.userId;
    const role = authed?.role;
    const assignedBranchId = authed?.assignedBranchId;

    if (userId && role) {
      const user: ConnectedUser = {
        socketId: socket.id,
        userId,
        role,
        connectedAt: new Date(),
      };

      connectedUsers.set(socket.id, user);
      socket.join(`user_${userId}`);
      socket.join(`role_${role}`);
    }

    socket.on('user_join', () => {});

    socket.on('chef_dashboard:get', async () => {
      const allowedRoles = new Set(['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
      if (!role || !allowedRoles.has(role)) return;

      const branchId = role === 'ADMIN' || role === 'SUPER_ADMIN' ? '' : (assignedBranchId || '');
      if (!userId || !branchId) {
        socket.emit('chef_dashboard:data', {
          orders: [],
          cookingOrders: [],
          mostOrdered: [],
          notifications: [],
          unreadCount: 0,
        });
        return;
      }

      const normalizeOrders = (orders: any[]) => {
        return (orders || []).map((o: any) => {
          const orderObj = o?.toObject ? o.toObject() : o;
          const tableNumber = orderObj?.table?.tableNumber || orderObj?.tableNumber;
          const items = Array.isArray(orderObj?.items)
            ? orderObj.items.map((it: any) => ({
                ...it,
                image: it?.image || it?.product?.imageUrl || it?.product?.image,
              }))
            : [];
          return {
            ...orderObj,
            id: orderObj?._id?.toString?.() || orderObj?.id,
            tableNumber,
            items,
          };
        });
      };

      try {
        const branchObjectId = Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : undefined;
        const branchMatch = branchObjectId ? { $in: [branchObjectId, branchId] } : branchId;

        const [ordersList, cookingResult, mostOrderedResult, notifResult, unreadCount] = await Promise.all([
          orderRepository.findAllOrders({ branch: branchMatch }, 1, 200),
          orderRepository.findByBranchId(branchId, 1, 100, undefined),
          dashboardService.getMostOrderedItemsForChef(userId, { days: 7, limit: 5 }),
          notificationService.getChefNotifications(userId, branchId, 1, 30),
          notificationService.getChefUnreadCount(userId, branchId),
        ]);

        socket.emit('chef_dashboard:data', {
          orders: normalizeOrders(ordersList || []),
          cookingOrders: normalizeOrders(cookingResult?.orders || []),
          mostOrdered: (mostOrderedResult as any)?.items || [],
          notifications: (notifResult as any)?.notifications || [],
          unreadCount: typeof unreadCount === 'number' ? unreadCount : 0,
        });
      } catch (e) {
        socket.emit('chef_dashboard:error', { message: 'Failed to load chef dashboard' });
      }
    });

    socket.on('waiter_dashboard:get', async () => {
      const allowedRoles = new Set(['WAITER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER']);
      if (!role || !allowedRoles.has(role)) return;

      if (!userId) {
        socket.emit('waiter_dashboard:data', { stats: null, orders: [], tables: [], timestamp: new Date().toISOString() });
        return;
      }

      try {
        const stats = await dashboardService.getWaiterStats(userId);

        const branchId = assignedBranchId || '';
        const branchObjectId = branchId && Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : undefined;
        const branchMatch = branchId
          ? { $in: [...(branchObjectId ? [branchObjectId] : []), branchId] }
          : undefined;

        const [ordersList, tablesList] = await Promise.all([
          orderRepository.findAllOrders(
            {
              ...(branchMatch ? { branch: branchMatch } : {}),
              orderType: 'DINE_IN',
            },
            1,
            500
          ),
          branchId ? tableRepository.findAll({ branch: branchObjectId || branchId }) : [],
        ]);

        socket.emit('waiter_dashboard:data', {
          stats,
          orders: ordersList || [],
          tables: tablesList || [],
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        socket.emit('waiter_dashboard:error', { message: 'Failed to load waiter dashboard' });
      }
    });

    socket.on('admin_branches:get', async () => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      try {
        const query: any = { deletedAt: null };
        if (role === 'BRANCH_MANAGER') {
          if (!assignedBranchId) {
            socket.emit('admin_branches:data', { branches: [] });
            return;
          }
          query._id = assignedBranchId;
        }

        const branches = await Branch.find(query)
          .select('_id branchName currency isActive')
          .sort({ branchName: 1 });

        socket.emit('admin_branches:data', {
          branches: (branches || []).map((b: any) => ({
            _id: b._id?.toString?.() || b._id,
            branchName: b.branchName,
            currency: b.currency,
            isActive: b.isActive,
          })),
        });
      } catch (e) {
        socket.emit('admin_branches:data', { branches: [] });
      }
    });

    socket.on('admin_unread_count:get', async () => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN';
      if (!allowed) return;

      try {
        const unreadCount = await notificationService.getAdminUnreadCount();
        socket.emit('admin_unread_count:data', { unreadCount });
      } catch (e) {
        socket.emit('admin_unread_count:data', { unreadCount: 0 });
      }
    });

    socket.on('admin_categories:get', async () => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      try {
        const categories = await menuRepository.findAllCategories();
        const categoriesWithCounts = await Promise.all(
          (categories || []).map(async (category: any) => {
            const productCount = await menuRepository.countProducts({
              category: category._id,
              deletedAt: null,
            });
            return {
              ...(category?.toObject ? category.toObject() : category),
              productCount,
            };
          })
        );

        socket.emit('admin_categories:data', { categories: categoriesWithCounts });
      } catch (e) {
        socket.emit('admin_categories:data', { categories: [] });
      }
    });

    socket.on('admin_settings:get', async () => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN';
      if (!allowed) return;

      try {
        let settings: any = await SystemSettings.findOne();
        if (!settings) {
          settings = new SystemSettings({
            restaurantName: 'Restaurant App',
            restaurantDescription: 'Welcome to our restaurant',
            contactEmail: 'contact@restaurant.com',
            contactPhone: '+1-234-567-8900',
            address: {
              street: '123 Main Street',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA',
            },
          });
          await settings.save();
        }

        socket.emit('admin_settings:data', { settings });
      } catch (e) {
        socket.emit('admin_settings:data', { settings: null });
      }
    });

    socket.on('admin_riders_performance:get', async (params: { period?: string; branchId?: string } | undefined) => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      try {
        const period = params?.period;
        let effectiveBranchId = params?.branchId ? String(params.branchId) : '';
        if (role === 'BRANCH_MANAGER') {
          effectiveBranchId = assignedBranchId || '';
        }

        const data = await dashboardService.getAdminRidersPerformance({
          period,
          branchId: effectiveBranchId,
        });

        socket.emit('admin_riders_performance:data', data || { riders: [] });
      } catch (e) {
        socket.emit('admin_riders_performance:data', { riders: [] });
      }
    });

    socket.on('admin_delivery_orders:get', async (params: { branchId?: string; page?: number; limit?: number } | undefined) => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      try {
        let effectiveBranchId = params?.branchId ? String(params.branchId) : '';
        if (role === 'BRANCH_MANAGER') {
          effectiveBranchId = assignedBranchId || '';
        }

        const pageNum = typeof params?.page === 'number' && params.page > 0 ? params.page : 1;
        const limitNum = typeof params?.limit === 'number' && params.limit > 0 ? params.limit : 200;

        const filter: any = { orderType: 'DELIVERY' };

        if (effectiveBranchId && effectiveBranchId !== 'all') {
          const asObj = Types.ObjectId.isValid(effectiveBranchId) ? new Types.ObjectId(effectiveBranchId) : null;
          filter.branch = asObj ? { $in: [asObj, effectiveBranchId] } : effectiveBranchId;
        }

        const orders = await orderRepository.findAllOrders(filter, pageNum, limitNum);
        socket.emit('admin_delivery_orders:data', { orders: orders || [] });
      } catch (e) {
        socket.emit('admin_delivery_orders:data', { orders: [] });
      }
    });

    socket.on('settings_context:get', async (params: { branchId?: string } | undefined) => {
      try {
        let effectiveBranchId = params?.branchId ? String(params.branchId) : '';
        if (role === 'BRANCH_MANAGER') {
          effectiveBranchId = assignedBranchId || '';
        }

        if (effectiveBranchId && Types.ObjectId.isValid(effectiveBranchId)) {
          const branch = await Branch.findById(effectiveBranchId).select('currency taxRate deliveryFee branchName');
          if (branch) {
            socket.emit('settings_context:data', {
              defaultCurrency: branch.currency || 'USD',
              taxRate: typeof (branch as any).taxRate === 'number' ? (branch as any).taxRate : 8.5,
              deliveryFee: typeof (branch as any).deliveryFee === 'number' ? (branch as any).deliveryFee : 50,
              appName: branch.branchName || 'Restaurant App',
            });
            return;
          }
        }

        const sys = await SystemSettings.findOne().select('defaultCurrency currency taxRate deliverySettings appName restaurantName');
        const deliveryFee =
          typeof (sys as any)?.deliveryFee === 'number'
            ? (sys as any).deliveryFee
            : typeof (sys as any)?.deliverySettings?.deliveryFee === 'number'
              ? (sys as any).deliverySettings.deliveryFee
              : 50;

        socket.emit('settings_context:data', {
          defaultCurrency: (sys as any)?.defaultCurrency || (sys as any)?.currency || 'USD',
          taxRate: typeof (sys as any)?.taxRate === 'number' ? (sys as any).taxRate : 8.5,
          deliveryFee,
          appName: (sys as any)?.appName || (sys as any)?.restaurantName || 'Restaurant App',
        });
      } catch (e) {
        socket.emit('settings_context:data', {
          defaultCurrency: 'USD',
          taxRate: 8.5,
          deliveryFee: 50,
          appName: 'Restaurant App',
        });
      }
    });

    socket.on('customer_home:get', async (params: { branchId?: string } | undefined) => {
      try {
        const branchId = params?.branchId && params.branchId !== 'all' ? String(params.branchId) : '';
        const branchFilter = branchId && Types.ObjectId.isValid(branchId) ? branchId : '';

        const categoriesAll = await menuRepository.findAllCategories();
        const categories = (categoriesAll || []).filter((category: any) => {
          if (category?.isActive === false) return false;
          if (!branchFilter) return true;
          const categoryBranchIds = Array.isArray((category as any)?.branchId)
            ? (category as any).branchId.map((bid: any) => String(bid))
            : [];
          return categoryBranchIds.length === 0 || categoryBranchIds.includes(String(branchFilter));
        });

        let activatedProductIds: string[] | null = null;
        if (branchFilter) {
          const activations = await (BranchProduct as any).find({ branchId: branchFilter, isActive: true }).lean();
          activatedProductIds = (activations || []).map((a: any) => String(a.productId));
        }

        const categoriesWithProducts = await Promise.all(
          categories.map(async (category: any) => {
            const productFilter: any = {
              category: category._id,
              $and: [
                { $or: [{ isAvailable: true }, { isAvailable: { $exists: false } }] },
                { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
              ],
            };

            if (activatedProductIds !== null) {
              productFilter._id = { $in: activatedProductIds };
            }

            if (branchFilter) {
              productFilter.$and.push({
                $or: [{ branchId: { $exists: false } }, { branchId: null }, { branchId: branchFilter }],
              });
            }

            const products = await menuRepository.findAllProducts(productFilter, 1, 100);
            return {
              ...((category as any)?.toObject ? (category as any).toObject() : category),
              products,
              items: products,
            };
          })
        );

        const activeBannersResult = await (Banner as any).getActiveBanners(branchFilter || undefined, 10);
        const activeBanners = Array.isArray(activeBannersResult) ? activeBannersResult : (activeBannersResult?.banners || []);

        const now = new Date();
        const campaignFilter: any = {
          deletedAt: null,
          status: 'ACTIVE',
          $and: [{ $or: [{ startDate: null }, { startDate: { $lte: now } }] }, { $or: [{ endDate: null }, { endDate: { $gte: now } }] }],
        };
        if (branchFilter) {
          campaignFilter.branch = { $in: [new Types.ObjectId(branchFilter)] };
        } else {
          campaignFilter.branch = { $size: 0 };
        }
        const campaigns = await DealCampaign.find(campaignFilter)
          .populate('branch', 'branchName branchCode')
          .sort({ displayOrder: 1, createdAt: -1 })
          .lean();

        const customerDeals = await Deal.find({
          isActive: true,
          startDate: { $lte: new Date() },
          expiryDate: { $gte: new Date() },
        })
          .select('title description imageUrl discountType discountValue minOrderAmount')
          .sort({ discountValue: -1 })
          .lean();

        socket.emit('customer_home:data', {
          menu: { categories: categoriesWithProducts },
          activeBanners,
          dealCampaigns: { campaigns },
          customerDeals: {
            deals: (customerDeals || []).map((d: any) => ({
              id: d._id,
              title: d.title,
              description: d.description,
              image: d.imageUrl,
              discount: d.discountValue,
              minOrder: d.minOrderAmount,
            })),
          },
        });
      } catch (e) {
        socket.emit('customer_home:data', {
          menu: { categories: [] },
          activeBanners: [],
          dealCampaigns: { campaigns: [] },
          customerDeals: { deals: [] },
        });
      }
    });

    socket.on('admin_dashboard:get', async (params: { period?: string; branchId?: string; limit?: number } | undefined) => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      const requestedBranchId = params?.branchId && params.branchId !== 'all' ? String(params.branchId) : '';
      const effectiveBranchId =
        role === 'BRANCH_MANAGER' ? (assignedBranchId || '') : requestedBranchId;

      const branchObjectId =
        effectiveBranchId && Types.ObjectId.isValid(effectiveBranchId) ? new Types.ObjectId(effectiveBranchId) : undefined;
      const branchIdForMatch = effectiveBranchId ? (branchObjectId ? { $in: [branchObjectId, effectiveBranchId] } : effectiveBranchId) : undefined;

      const period = params?.period && params.period !== 'all' ? String(params.period) : undefined;
      const limit = typeof params?.limit === 'number' && params.limit > 0 ? Math.min(params.limit, 200) : 50;

      try {
        const [stats, waitersPerformance, ridersPerformance, branchesPerformance, ordersResult, unreadCount] = await Promise.all([
          dashboardService.getAdminStats({ period, branchId: effectiveBranchId || undefined }),
          dashboardService.getAdminWaitersPerformance({ period, branchId: effectiveBranchId || undefined }),
          dashboardService.getAdminRidersPerformance({ period, branchId: effectiveBranchId || undefined }),
          dashboardService.getAdminBranchesPerformance({ period }),
          (async () => {
            const filter: any = {};
            if (role === 'BRANCH_MANAGER') {
              if (!assignedBranchId) return { orders: [], total: 0 };
              filter.branch = branchIdForMatch;
            } else if (effectiveBranchId) {
              filter.branch = branchIdForMatch;
            }

            const orders = await orderRepository.findAllOrders(filter, 1, limit);
            const total = await orderRepository.countOrders(filter);
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
                finalAmount: orderObj.totalAmount,
                total: orderObj.totalAmount,
                waiterName: orderObj?.waiter?.displayName || orderObj?.waiterName || null,
                paymentStatus: orderObj.paymentStatus,
                paymentMethod: orderObj.paymentMethod,
                completedAt: orderObj.completedAt,
                invoiceNumber: orderObj.invoiceNumber,
              };
            });

            return { orders: normalizedOrders, total };
          })(),
          notificationService.getAdminUnreadCount(),
        ]);

        socket.emit('admin_dashboard:data', {
          stats,
          waitersPerformance,
          ridersPerformance,
          branchesPerformance,
          orders: ordersResult.orders,
          ordersTotal: ordersResult.total,
          unreadCount,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        socket.emit('admin_dashboard:error', { message: 'Failed to load dashboard data' });
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`[WebSocket] User disconnected: ${socket.id}. Total: ${connectedUsers.size}`);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  const sendNotification = (
    recipientId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ) => {
    io.to(`user_${recipientId}`).emit('notification', notificationData);
    console.log(`[WebSocket] Notification sent to user ${recipientId}:`, notificationData?.type);
  };

  const notifyByRole = (
    role: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ) => {
    io.to(`role_${role}`).emit('notification', notificationData);
    console.log(`[WebSocket] Notification sent to role ${role}:`, notificationData?.type);
  };

  const broadcastNotification = (notificationData: any) => {
    io.emit('notification', notificationData);
    console.log('[WebSocket] Broadcast sent to all users');
  };

  const getOnlineUsers = () => connectedUsers.size;

  const getUsersByRole = (role: string) => {
    return Array.from(connectedUsers.values()).filter((u) => u.role === role).length;
  };

  return {
    io,
    httpServer,
    sendNotification,
    notifyByRole,
    broadcastNotification,
    getOnlineUsers,
    getUsersByRole,
  };
};
