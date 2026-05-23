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
import { DashboardSnapshotService, buildAdminOrderFilter } from '@/modules/dashboard/dashboardSnapshot.service';
import { MenuRepository } from '@/modules/menu/menu.repository';
import { OrderRepository } from '@/modules/order/order.repository';
import { TableRepository } from '@/modules/table/table.repository';
import { NotificationService } from '@/modules/notification/notification.service';
import { Types } from 'mongoose';
import BranchProduct from '@/models/BranchProduct';
import { parseCookieHeader } from '@/utils/parseCookies';
import { buildSocketCorsOrigin } from '@/config/cors';
import { normalizeOrderPayload } from '@/utils/normalizeOrderPayload';

// Store connected users
interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
  connectedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

function normalizeOrderForSocket(o: any) {
  return normalizeOrderPayload(o);
}

function joinRoleRooms(
  socket: Socket,
  role: string,
  userId: string,
  assignedBranchId?: string
) {
  socket.join(`user_${userId}`);
  socket.join(`role_${role}`);

  if (assignedBranchId) {
    socket.join(`branch_${assignedBranchId}`);
  }

  const kitchenRoles = new Set([
    'CHEF',
    'KITCHEN',
    'COOK',
    'HEAD_CHEF',
    'SOUS_CHEF',
    'KITCHEN_MANAGER',
  ]);
  if (kitchenRoles.has(role)) {
    socket.join('kitchen');
    socket.join(`chef_${userId}`);
  }

  if (role === 'WAITER') {
    socket.join(`waiter_${userId}`);
    socket.join('waiters');
  }

  if (role === 'RIDER') {
    socket.join(`rider_${userId}`);
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER') {
    socket.join('admin');
    socket.join('all-orders');
  }
}

export const initWebSocket = (app: Express) => {
  const httpServer = createServer(app);
  const dashboardService = new DashboardService();
  const dashboardSnapshot = new DashboardSnapshotService();
  const menuRepository = new MenuRepository();
  const orderRepository = new OrderRepository();
  const tableRepository = new TableRepository();
  const notificationService = new NotificationService();

  const isProduction = process.env.NODE_ENV === 'production';

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: buildSocketCorsOrigin(isProduction),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const authToken = (socket.handshake.auth as any)?.token;
      const headerToken = socket.handshake.headers?.authorization
        ?.toString()
        .replace(/^Bearer\s+/i, '');
      const cookies = parseCookieHeader(socket.handshake.headers?.cookie);
      const cookieToken = cookies.accessToken;
      const token = authToken || headerToken || cookieToken;

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
      joinRoleRooms(socket, role, userId, assignedBranchId || undefined);
    }

    socket.on('user_join', (payload?: { tableIds?: string[] }) => {
      const tableIds = payload?.tableIds || [];
      for (const tableId of tableIds) {
        if (tableId) socket.join(`table_${tableId}`);
      }
    });

    socket.on('chef_dashboard:get', async () => {
      const allowedRoles = new Set(['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
      if (!role || !allowedRoles.has(role) || !userId) return;

      try {
        let branchForChef = assignedBranchId || '';
        if (!branchForChef) {
          const chefUser = await User.findById(userId).select('assignedBranch').lean();
          const ab = (chefUser as any)?.assignedBranch;
          branchForChef = ab?._id?.toString?.() || (ab ? String(ab) : '');
        }
        const data = await dashboardSnapshot.getChefDashboard(userId, role, branchForChef);
        socket.emit('chef_dashboard:data', data);
      } catch (e) {
        socket.emit('chef_dashboard:error', { message: 'Failed to load chef dashboard' });
      }
    });

    socket.on('waiter_dashboard:get', async () => {
      const allowedRoles = new Set(['WAITER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER']);
      if (!role || !allowedRoles.has(role)) return;

      try {
        const data = await dashboardSnapshot.getWaiterDashboard(userId || '', assignedBranchId || '');
        socket.emit('waiter_dashboard:data', data);
      } catch (e) {
        socket.emit('waiter_dashboard:error', { message: 'Failed to load waiter dashboard' });
      }
    });

    socket.on('admin_branches:get', async () => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      try {
        const data = await dashboardSnapshot.getAdminBranches(role, assignedBranchId || '');
        socket.emit('admin_branches:data', data);
      } catch (e) {
        socket.emit('admin_branches:data', { branches: [] });
      }
    });

    socket.on('admin_unread_count:get', async () => {
      const allowed =
        role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed || !userId) return;

      try {
        const unreadCount = await notificationService.getAdminUnreadCount(
          assignedBranchId || '',
          userId
        );
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

            // Only restrict by activated IDs if there are actually some.
            // Empty array would match nothing — fall back to showing all products.
            if (activatedProductIds !== null && activatedProductIds.length > 0) {
              productFilter._id = { $in: activatedProductIds };
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
          // Show campaigns for this specific branch OR campaigns with no branch restriction
          campaignFilter.$or = [
            { branch: { $in: [new Types.ObjectId(branchFilter)] } },
            { branch: { $size: 0 } },
            { branch: { $exists: false } },
          ];
        }
        // When no branch selected, show ALL active campaigns (no branch filter applied)
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

      try {
        const data = await dashboardSnapshot.getAdminDashboard(role, assignedBranchId || '', params);
        socket.emit('admin_dashboard:data', data);
      } catch (e) {
        socket.emit('admin_dashboard:error', { message: 'Failed to load dashboard data' });
      }
    });

    socket.on('admin_orders:get', async (params: { branchId?: string; limit?: number } | undefined) => {
      const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
      if (!allowed) return;

      const requestedBranchId = params?.branchId && params.branchId !== 'all' ? String(params.branchId) : '';
      const effectiveBranchId =
        role === 'BRANCH_MANAGER' ? (assignedBranchId || '') : requestedBranchId;
      const limit =
        typeof params?.limit === 'number' && params.limit > 0 ? Math.min(params.limit, 500) : 200;

      try {
        const orderFilterResult = buildAdminOrderFilter(role, assignedBranchId || '', effectiveBranchId);
        if (orderFilterResult.filter === null) {
          socket.emit('admin_orders:data', { orders: [], total: 0 });
          return;
        }
        const orders = await orderRepository.findAllOrders(orderFilterResult.filter, 1, limit);
        const total = await orderRepository.countOrders(orderFilterResult.filter);
        socket.emit('admin_orders:data', {
          orders: (orders || []).map(normalizeOrderForSocket),
          total,
        });
      } catch {
        socket.emit('admin_orders:error', { message: 'Failed to load orders' });
      }
    });

    socket.on('rider_dashboard:get', async () => {
      if (role !== 'RIDER' || !userId) return;

      try {
        const data = await dashboardSnapshot.getRiderDashboard(userId);
        socket.emit('rider_dashboard:data', data);
      } catch {
        socket.emit('rider_dashboard:error', { message: 'Failed to load rider dashboard' });
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`[WebSocket] User disconnected: ${socket.id}. Total: ${connectedUsers.size}`);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('notification:read', async (payload: { notificationId?: string } | undefined) => {
      const notifId = payload?.notificationId;
      if (!notifId || !userId) return;
      try {
        await notificationService.markAsReadForUser(notifId, userId);
        socket.emit('notification:read', { notificationId: notifId, success: true });
      } catch {
        socket.emit('notification:read', { notificationId: notifId, success: false });
      }
    });
  });

  const pushAdminUnreadBadgeForUser = async (
    recipientId: string,
    branchId?: string
  ) => {
    const adminRoles = new Set(['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER']);
    try {
      const user = await User.findById(recipientId).select('role assignedBranch').lean();
      const userRole = String(user?.role || '').toUpperCase();
      if (!user || !adminRoles.has(userRole)) return;

      const ab = user.assignedBranch;
      const resolvedBranch =
        branchId ||
        (ab && typeof ab === 'object' && '_id' in ab
          ? String((ab as { _id: unknown })._id)
          : ab
            ? String(ab)
            : '');
      const unreadCount = await notificationService.getAdminUnreadCount(
        resolvedBranch,
        recipientId
      );
      io.to(`user_${recipientId}`).emit('admin_unread_count:data', { unreadCount });
    } catch {
      /* non-fatal */
    }
  };

  const sendNotification = (recipientId: string, notificationData: Record<string, unknown>) => {
    const payload = {
      ...notificationData,
      message:
        (notificationData.message as string) ||
        (notificationData.body as string) ||
        '',
    };
    io.to(`user_${recipientId}`).emit('notification', payload);
    io.to(`user_${recipientId}`).emit('notification:new', payload);
    const dataBranch = (notificationData.data as Record<string, unknown> | undefined)?.branchId;
    void pushAdminUnreadBadgeForUser(
      recipientId,
      typeof dataBranch === 'string' ? dataBranch : undefined
    );
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
    io.to(`role_${role}`).emit('notification:new', notificationData);
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
