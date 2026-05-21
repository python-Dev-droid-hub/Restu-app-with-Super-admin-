import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { AccessTime, CheckCircle, Notifications, RestaurantMenu, Warning } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { io, type Socket } from 'socket.io-client';
import { resolveSocketUrl } from '../../utils/resolveSocketUrl';
import { enrichOrderParty } from '../../utils/orderParty';
import { OrderCardMeta } from '../../components/orders/OrderCardMeta';

type MainTab = 'home' | 'cooking' | 'notifications' | 'profile';
type HomeTab = 'Active' | 'Ready' | 'Completed' | 'Cancelled';
type CookingOrderTypeTab = 'DINE_IN' | 'DELIVERY';
type CookingFilterTab = 'ACTIVE' | 'READY' | 'COMPLETED';

type OrderItem = {
  _id?: string;
  id?: string;
  productName?: string;
  name?: string;
  quantity?: number;
  status?: string;
  product?: { name?: string; image?: string; imageUrl?: string };
  image?: string;
};

type KitchenOrder = {
  _id: string;
  id?: string;
  orderNumber?: string;
  status?: string;
  orderType?: string;
  tableNumber?: string | null;
  partyLabel?: string;
  partyName?: string;
  waiterName?: string | null;
  customerName?: string;
  createdAt?: string;
  orderTime?: string;
  expectedReadyTime?: number;
  specialInstructions?: string;
  items?: OrderItem[];
};

type MostOrderedItem = { rank?: number; name: string; time?: string };

type ChefNotification = {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
};

const parseStoredUser = (): any => {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getServerHost = (): string => resolveSocketUrl();

const formatMinutesAgo = (iso?: string): string => {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hour ago';
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

const normalizeOrderId = (o: KitchenOrder): string => String(o?._id || o?.id || '');
const normalizeItemId = (i: OrderItem): string => String(i?._id || i?.id || '');

const StatusChip = ({ status }: { status: string }) => {
  const value = (status || '').toUpperCase();
  const color: 'default' | 'warning' | 'success' | 'error' | 'info' =
    value === 'PENDING' || value === 'KITCHEN_ACCEPTED'
      ? 'warning'
      : value === 'PREPARING'
        ? 'info'
        : value === 'READY'
          ? 'success'
          : value === 'CANCELLED'
            ? 'error'
            : ['COMPLETED', 'SERVED', 'DELIVERED'].includes(value)
              ? 'success'
              : 'default';
  return <Chip size="small" label={value || 'UNKNOWN'} color={color} sx={{ fontWeight: 800 }} />;
};

const StatCard = ({
  icon,
  value,
  label,
  sublabel,
  loading,
  bgcolor,
  onClick,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel: string;
  loading: boolean;
  bgcolor: string;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    sx={{
      borderRadius: 4,
      backgroundColor: bgcolor,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      color: 'white',
      height: 140,
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none',
    }}
  >
    <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'white' }}>
        {loading ? <Skeleton width={90} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} /> : value}
      </Typography>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'white', opacity: 0.95 }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: 'white', opacity: 0.8 }}>{sublabel}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const ChefDashboard: React.FC<{ initialTab?: MainTab }> = ({ initialTab = 'home' }) => {
  const location = useLocation();
  const globalQuery = useMemo(() => (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase(), [location.search]);
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [homeTab, setHomeTab] = useState<HomeTab>('Active');
  const [cookingOrderTypeTab, setCookingOrderTypeTab] = useState<CookingOrderTypeTab>('DINE_IN');
  const [cookingFilterTab, setCookingFilterTab] = useState<CookingFilterTab>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [cookingOrders, setCookingOrders] = useState<KitchenOrder[]>([]);
  const [mostOrdered, setMostOrdered] = useState<MostOrderedItem[]>([]);

  const [chefNotifications, setChefNotifications] = useState<ChefNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsFilter, setNotificationsFilter] = useState<'all' | 'read' | 'unread'>('all');

  const [updatingKey, setUpdatingKey] = useState<string>('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistOrder, setChecklistOrder] = useState<KitchenOrder | null>(null);
  const [packingChecklist, setPackingChecklist] = useState({
    itemsPacked: false,
    allItemsIncluded: false,
    specialInstructions: false,
    receiptIncluded: false,
    napkinsUtensils: false,
    packagingSealed: false,
  });

  const [profileNameDialogOpen, setProfileNameDialogOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [profileImageInput, setProfileImageInput] = useState('');
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [user, setUser] = useState<any>(() => parseStoredUser());
  const displayName = String(user?.name || user?.displayName || 'Chef');
  const profileImage = String(user?.avatar || user?.image || user?.profileImage || '');

  const socketRef = useRef<Socket | null>(null);
  const dashboardRequestedRef = useRef(false);

  const requestChefDashboard = useCallback((opts?: { forNotifications?: boolean }) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (opts?.forNotifications) setNotificationsLoading(true);
    else setLoading(true);
    setError('');
    setNotificationsError('');

    const emitRequest = () => socket.emit('chef_dashboard:get');
    if (socket.connected) emitRequest();
    else socket.once('connect', emitRequest);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';
    if (!socketRef.current) {
      socketRef.current = io(getServerHost(), {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined,
      });
    }

    const socket = socketRef.current;

    const onData = (payload: any) => {
      const ordersRaw = payload?.orders || payload?.data?.orders || [];
      const cookingRaw = payload?.cookingOrders || payload?.data?.cookingOrders || [];
      const mostOrderedRaw = payload?.mostOrdered || payload?.data?.mostOrdered || payload?.items || payload?.data?.items || [];
      const notificationsRaw = payload?.notifications || payload?.data?.notifications || payload?.data?.notifications?.notifications || [];
      const unreadRaw = payload?.unreadCount ?? payload?.data?.unreadCount;

      const mapOrders = (list: unknown[]) =>
        (Array.isArray(list) ? list : []).map((o) => enrichOrderParty((o || {}) as Record<string, unknown>)) as KitchenOrder[];

      setOrders(mapOrders(ordersRaw));
      setCookingOrders(mapOrders(cookingRaw));
      setMostOrdered(Array.isArray(mostOrderedRaw) ? (mostOrderedRaw as MostOrderedItem[]) : []);
      const normalizedNotifications = Array.isArray(notificationsRaw)
        ? (notificationsRaw as any[]).map((n) => ({
            ...n,
            read: typeof n?.read === 'boolean' ? n.read : Boolean(n?.isRead),
          }))
        : [];
      setChefNotifications(normalizedNotifications as ChefNotification[]);
      setNotificationsUnread(typeof unreadRaw === 'number' ? unreadRaw : Number(unreadRaw ?? 0) || 0);

      setLoading(false);
      setNotificationsLoading(false);
    };

    const onError = (payload: any) => {
      const msg = String(payload?.message || payload?.error || 'Failed to load chef dashboard');
      setError(msg);
      setLoading(false);
      setNotificationsLoading(false);
    };

    const onConnect = () => {
      if (dashboardRequestedRef.current) return;
      dashboardRequestedRef.current = true;
      requestChefDashboard();
    };

    const onInvalidate = () => requestChefDashboard();
    const onNotification = () => requestChefDashboard();
    const onOrderEvent = () => requestChefDashboard();
    const onConnectError = () => {
      setLoading(false);
      setNotificationsLoading(false);
    };

    socket.off('chef_dashboard:data');
    socket.off('chef_dashboard:error');
    socket.on('chef_dashboard:data', onData);
    socket.on('chef_dashboard:error', onError);
    socket.on('chef_dashboard:invalidate', onInvalidate);
    socket.on('order:created', onOrderEvent);
    socket.on('order:updated', onOrderEvent);
    socket.on('order:status_updated', onOrderEvent);
    socket.on('notification', onNotification);
    socket.on('connect_error', onConnectError);
    socket.on('connect', onConnect);

    if (socket.connected && !dashboardRequestedRef.current) onConnect();

    return () => {
      socket.off('chef_dashboard:data', onData);
      socket.off('chef_dashboard:error', onError);
      socket.off('chef_dashboard:invalidate', onInvalidate);
      socket.off('order:created', onOrderEvent);
      socket.off('order:updated', onOrderEvent);
      socket.off('order:status_updated', onOrderEvent);
      socket.off('notification', onNotification);
      socket.off('connect_error', onConnectError);
      socket.off('connect', onConnect);
    };
  }, [requestChefDashboard]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    setMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setUser(parseStoredUser());
  }, []);

  useEffect(() => {
    if (mainTab !== 'notifications') return;
    requestChefDashboard({ forNotifications: true });
  }, [mainTab, requestChefDashboard]);

  const updateOrderStatus = useCallback(
    async (orderId: string, nextStatusUpper: string) => {
      const id = String(orderId || '');
      const status = String(nextStatusUpper || '').toUpperCase();
      if (!id || !status) return;
      const key = `order:${id}:${status}`;
      setUpdatingKey(key);
      try {
        const res: any = await api.patch(`/orders/${id}/status`, { status });
        if (!res?.success) {
          setError(String(res?.error || res?.message || 'Failed to update order'));
          return;
        }
        requestChefDashboard();
      } finally {
        setUpdatingKey('');
      }
    },
    [requestChefDashboard]
  );

  const updateItemStatus = useCallback(
    async (orderId: string, itemId: string, nextStatusUpper: string) => {
      const id = String(orderId || '');
      const it = String(itemId || '');
      const status = String(nextStatusUpper || '').toUpperCase();
      if (!id || !it || !status) return;
      const key = `item:${id}:${it}:${status}`;
      setUpdatingKey(key);
      try {
        const res: any = await api.patch(`/orders/${id}/items/${it}/status`, { status });
        if (!res?.success) {
          setError(String(res?.error || res?.message || 'Failed to update item'));
          return;
        }
        requestChefDashboard();
      } finally {
        setUpdatingKey('');
      }
    },
    [requestChefDashboard]
  );

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const id = String(notificationId || '');
      if (!id) return;
      const res: any = await api.put(`/notifications/${id}/read`);
      if (!res?.success) {
        setNotificationsError(String(res?.error || res?.message || 'Failed to mark as read'));
        return;
      }
      requestChefDashboard({ forNotifications: true });
    },
    [requestChefDashboard]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const id = String(notificationId || '');
      if (!id) return;
      const res: any = await api.delete(`/notifications/${id}`);
      if (!res?.success) {
        setNotificationsError(String(res?.error || res?.message || 'Failed to delete notification'));
        return;
      }
      requestChefDashboard({ forNotifications: true });
    },
    [requestChefDashboard]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    const res: any = await api.put('/notifications/mark-all-read');
    if (!res?.success) {
      setNotificationsError(String(res?.error || res?.message || 'Failed to mark all as read'));
      return;
    }
    requestChefDashboard({ forNotifications: true });
  }, [requestChefDashboard]);

  const openChecklistIfNeeded = (order: KitchenOrder, onConfirm: () => void) => {
    const orderTypeUpper = String(order?.orderType || '').toUpperCase();
    if (orderTypeUpper !== 'DELIVERY') {
      void onConfirm();
      return;
    }
    setChecklistOrder(order);
    setPackingChecklist({
      itemsPacked: false,
      allItemsIncluded: false,
      specialInstructions: false,
      receiptIncluded: false,
      napkinsUtensils: false,
      packagingSealed: false,
    });
    setChecklistOpen(true);
  };

  const allChecked = useMemo(() => Object.values(packingChecklist).every(Boolean), [packingChecklist]);

  const homeOrders = useMemo(() => {
    return (cookingOrders && cookingOrders.length > 0 ? cookingOrders : orders) as KitchenOrder[];
  }, [cookingOrders, orders]);

  const minutesSince = useCallback((iso?: string) => {
    if (!iso) return 0;
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return 0;
    return Math.max(0, (Date.now() - ts) / 60000);
  }, []);

  const homeStats = useMemo(() => {
    const activeStatuses = ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'];
    const newOrdersCount = homeOrders.filter(o => String(o?.status || '').toUpperCase() === 'PENDING').length;
    const activeOrdersCount = homeOrders.filter(o => activeStatuses.includes(String(o?.status || '').toUpperCase())).length;
    const cookingOrdersCount = homeOrders.filter(o => ['KITCHEN_ACCEPTED', 'PREPARING'].includes(String(o?.status || '').toUpperCase())).length;
    const delayedOrdersCount = homeOrders.filter(o => {
      const mins = minutesSince(o?.createdAt || o?.orderTime);
      return mins > 20 && activeStatuses.includes(String(o?.status || '').toUpperCase());
    }).length;
    const over30MinCount = homeOrders.filter(o => {
      const mins = minutesSince(o?.createdAt || o?.orderTime);
      return mins > 30 && activeStatuses.includes(String(o?.status || '').toUpperCase());
    }).length;
    return { newOrdersCount, activeOrdersCount, cookingOrdersCount, delayedOrdersCount, over30MinCount };
  }, [homeOrders, minutesSince]);

  const homeTabCounts = useMemo(() => {
    const countBy = (statuses: string[]) =>
      homeOrders.filter(o => statuses.includes(String(o?.status || '').toUpperCase())).length;
    return {
      Active: countBy(['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED']),
      Ready: countBy(['READY']),
      Completed: countBy(['COMPLETED', 'DELIVERED', 'SERVED']),
      Cancelled: countBy(['CANCELLED']),
    } satisfies Record<HomeTab, number>;
  }, [homeOrders]);

  const homeOrdersFiltered = useMemo(() => {
    return (homeOrders || [])
      .filter(o => {
        const s = String(o?.status || '').toUpperCase();
        if (homeTab === 'Active') return ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(s);
        if (homeTab === 'Ready') return s === 'READY';
        if (homeTab === 'Completed') return ['COMPLETED', 'DELIVERED', 'SERVED'].includes(s);
        if (homeTab === 'Cancelled') return s === 'CANCELLED';
        return true;
      })
      .filter((o) => {
        if (!globalQuery) return true;
        const items = Array.isArray(o?.items) ? o.items : [];
        const itemsText = items.map((it) => it?.productName || it?.name || it?.product?.name || '').join(' ');
        const hay = `${o?.orderNumber || ''} ${o?._id || o?.id || ''} ${o?.status || ''} ${o?.orderType || ''} ${o?.tableNumber || ''} ${o?.specialInstructions || ''} ${itemsText}`.toLowerCase();
        return hay.includes(globalQuery);
      });
  }, [globalQuery, homeOrders, homeTab]);

  const cookingOrdersFiltered = useMemo(() => {
    const byType = (cookingOrders || []).filter(o => String(o?.orderType || '').toUpperCase() === cookingOrderTypeTab);
    return byType
      .filter(o => {
        const s = String(o?.status || '').toUpperCase();
        if (cookingFilterTab === 'ACTIVE') return ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(s);
        if (cookingFilterTab === 'READY') return s === 'READY';
        if (cookingFilterTab === 'COMPLETED') return ['COMPLETED', 'DELIVERED', 'SERVED'].includes(s);
        return true;
      })
      .filter((o) => {
        if (!globalQuery) return true;
        const items = Array.isArray(o?.items) ? o.items : [];
        const itemsText = items.map((it) => it?.productName || it?.name || it?.product?.name || '').join(' ');
        const hay = `${o?.orderNumber || ''} ${o?._id || o?.id || ''} ${o?.status || ''} ${o?.orderType || ''} ${o?.tableNumber || ''} ${o?.specialInstructions || ''} ${itemsText}`.toLowerCase();
        return hay.includes(globalQuery);
      });
  }, [cookingOrders, cookingFilterTab, cookingOrderTypeTab, globalQuery]);

  const renderOrderCard = (o: KitchenOrder) => {
    const id = normalizeOrderId(o);
    const statusUpper = String(o?.status || '').toUpperCase();
    const orderTypeUpper = String(o?.orderType || '').toUpperCase();
    const createdAt = o?.createdAt || '';
    const timeAgo = formatMinutesAgo(createdAt);
    const items = Array.isArray(o?.items) ? o.items : [];
    const visibleItems = items.filter(it => String(it?.status || '').toUpperCase() !== 'SERVED');

    const canStartPreparing = ['PENDING', 'KITCHEN_ACCEPTED'].includes(statusUpper);
    const canMarkReady = ['PREPARING', 'KITCHEN_ACCEPTED'].includes(statusUpper);
    return (
      <Card key={id} sx={{ borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#111' }}>
                  {o?.orderNumber || `#${String(id).slice(-6).toUpperCase()}`}
                </Typography>
                <StatusChip status={statusUpper} />
                <Chip size="small" label={orderTypeUpper || 'ORDER'} sx={{ fontWeight: 800 }} />
              </Box>
              <OrderCardMeta order={o} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, color: '#666' }}>
                <AccessTime sx={{ fontSize: 16, color: '#999' }} />
                <Typography sx={{ fontSize: 12, color: '#666' }}>{timeAgo}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {canStartPreparing ? (
                <Button
                  variant="contained"
                  disabled={updatingKey === `order:${id}:PREPARING` || loading}
                  onClick={() => void updateOrderStatus(id, 'PREPARING')}
                  sx={{ bgcolor: '#FFB020', '&:hover': { bgcolor: '#E59A1B' }, textTransform: 'none', fontWeight: 900 }}
                >
                  {updatingKey === `order:${id}:PREPARING` ? 'Updating...' : 'Start Preparing'}
                </Button>
              ) : null}
              {canMarkReady ? (
                <Button
                  variant="contained"
                  disabled={updatingKey === `order:${id}:READY` || loading}
                  onClick={() =>
                    openChecklistIfNeeded(o, () => {
                      void updateOrderStatus(id, 'READY');
                    })
                  }
                  sx={{ bgcolor: '#2BC48A', '&:hover': { bgcolor: '#25AB77' }, textTransform: 'none', fontWeight: 900 }}
                >
                  {updatingKey === `order:${id}:READY` ? 'Updating...' : 'Mark Ready'}
                </Button>
              ) : null}
            </Box>
          </Box>

          {o?.specialInstructions ? (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid rgba(255,107,53,0.25)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ fontSize: 18, color: '#FF6B35' }} />
                <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 13 }}>Instructions</Typography>
              </Box>
              <Typography sx={{ color: '#444', fontSize: 13, mt: 0.5 }}>{o.specialInstructions}</Typography>
            </Box>
          ) : null}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {visibleItems.length === 0 ? (
              <Typography sx={{ color: '#777', fontSize: 13 }}>No items</Typography>
            ) : (
              visibleItems.map(it => {
                const itemId = normalizeItemId(it);
                const itemStatusUpper = String(it?.status || 'PENDING').toUpperCase();
                const itemName = String(it?.productName || it?.name || it?.product?.name || 'Item');
                const qty = Number(it?.quantity || 1);
                const itemKey = (next: string) => `item:${id}:${itemId}:${next}`;
                return (
                  <Box key={`${id}:${itemId}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, color: '#111', fontWeight: 700 }}>
                        {qty}x {itemName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#666', mt: 0.25 }}>
                        {itemStatusUpper}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {itemStatusUpper === 'PENDING' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={updatingKey === itemKey('PREPARING') || loading}
                          onClick={() => void updateItemStatus(id, itemId, 'PREPARING')}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          {updatingKey === itemKey('PREPARING') ? 'Updating...' : 'Preparing'}
                        </Button>
                      ) : null}
                      {itemStatusUpper === 'PREPARING' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={updatingKey === itemKey('READY') || loading}
                          onClick={() => void updateItemStatus(id, itemId, 'READY')}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          {updatingKey === itemKey('READY') ? 'Updating...' : 'Ready'}
                        </Button>
                      ) : null}
                      {itemStatusUpper === 'READY' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={updatingKey === itemKey('SERVED') || loading}
                          onClick={() => void updateItemStatus(id, itemId, 'SERVED')}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          {updatingKey === itemKey('SERVED') ? 'Updating...' : 'Served'}
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const selectMainTab = useCallback(
    (tab: MainTab) => {
      setMainTab(tab);
    },
    []
  );

  const filteredNotifications = useMemo(() => {
    const list = chefNotifications || [];
    const byRead =
      notificationsFilter === 'unread'
        ? list.filter(n => !n?.read)
        : notificationsFilter === 'read'
        ? list.filter(n => Boolean(n?.read))
        : list;
    if (!globalQuery) return byRead;
    return byRead.filter((n) => {
      const hay = `${n?.title || ''} ${n?.message || ''} ${n?.body || ''} ${n?.type || ''}`.toLowerCase();
      return hay.includes(globalQuery);
    });
  }, [chefNotifications, globalQuery, notificationsFilter]);

  const patchStoredUser = useCallback((patch: Record<string, any>) => {
    const current = parseStoredUser() || {};
    const next = { ...current, ...patch };
    localStorage.setItem('userData', JSON.stringify(next));
    window.dispatchEvent(new Event('profileUpdated'));
    window.dispatchEvent(new Event('userDataUpdated'));
    setUser(next);
  }, []);

  const saveProfileName = useCallback(async () => {
    const nextName = profileNameInput.trim();
    if (!nextName) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res: any = await api.patch('/users/profile', { name: nextName });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to update name'));
        return;
      }
      setProfileNameDialogOpen(false);
      setProfileNameInput('');
      patchStoredUser({ name: nextName, displayName: nextName });
    } finally {
      setProfileSaving(false);
    }
  }, [patchStoredUser, profileNameInput]);

  const saveProfileImage = useCallback(async () => {
    const rawNextUrl = profileImageInput.trim();
    const nextUrl = rawNextUrl ? api.getImageUrl(rawNextUrl) : '';
    if (!nextUrl) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res: any = await api.patch('/users/profile', { avatar: nextUrl, image: nextUrl, profileImage: nextUrl });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to update image'));
        return;
      }
      setProfileImageDialogOpen(false);
      setProfileImageInput('');
      patchStoredUser({ avatar: nextUrl, image: nextUrl, profileImage: nextUrl });
    } finally {
      setProfileSaving(false);
    }
  }, [patchStoredUser, profileImageInput]);

  const uploadProfileImageFile = useCallback(async (file: File) => {
    setProfileSaving(true);
    setProfileError('');
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res: any = await api.uploadImage(base64Data, file.name);
      const url = String(res?.data?.url || '');
      if (!res?.success || !url) {
        setProfileError(String(res?.error || res?.message || 'Failed to upload image'));
        return;
      }
      setProfileImageInput(url);
    } catch (e: any) {
      setProfileError(String(e?.message || 'Failed to upload image'));
    } finally {
      setProfileSaving(false);
    }
  }, []);

  const savePassword = useCallback(async () => {
    const cur = currentPassword;
    const next = newPassword;
    if (!cur || !next) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res: any = await api.put('/users/change-password', { currentPassword: cur, newPassword: next });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to change password'));
        return;
      }
      setChangePasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setProfileSaving(false);
    }
  }, [currentPassword, newPassword]);

  return (
    <Box sx={{ width: '100%', bgcolor: '#f8f5ff', minHeight: '100%', px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#111' }}>
            Chef Dashboard
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13 }}>{displayName}</Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => requestChefDashboard()}
          disabled={loading}
          sx={{ textTransform: 'none', fontWeight: 800 }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<RestaurantMenu sx={{ color: 'white' }} />}
              value={String(homeStats.newOrdersCount)}
              label="New Orders"
              sublabel="Pending"
              loading={loading && homeOrders.length === 0}
              bgcolor="#FF9F43"
              onClick={() => {
                selectMainTab('home');
                setHomeTab('Active');
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<AccessTime sx={{ color: 'white' }} />}
              value={String(homeStats.activeOrdersCount)}
              label="Active"
              sublabel="In progress"
              loading={loading && homeOrders.length === 0}
              bgcolor="#6C63FF"
              onClick={() => {
                selectMainTab('home');
                setHomeTab('Active');
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<CheckCircle sx={{ color: 'white' }} />}
              value={String(homeStats.cookingOrdersCount)}
              label="Cooking"
              sublabel="Preparing"
              loading={loading && homeOrders.length === 0}
              bgcolor="#2BC48A"
              onClick={() => {
                selectMainTab('cooking');
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<Warning sx={{ color: 'white' }} />}
              value={String(homeStats.delayedOrdersCount)}
              label="Delayed"
              sublabel="Over 20 min"
              loading={loading && homeOrders.length === 0}
              bgcolor="#FF6B35"
              onClick={() => {
                selectMainTab('home');
                setHomeTab('Active');
              }}
            />
          </Grid>
        </Grid>

        <Paper sx={{ borderRadius: 4, p: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {mainTab === 'home' ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['Active', 'Ready', 'Completed', 'Cancelled'] as HomeTab[]).map(t => (
                <Button
                  key={t}
                  onClick={() => setHomeTab(t)}
                  sx={{
                    bgcolor: homeTab === t ? '#FF6B35' : 'white',
                    color: homeTab === t ? 'white' : '#666',
                    borderRadius: 2,
                    px: 2,
                    py: 0.8,
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    boxShadow: homeTab === t ? '0 2px 8px rgba(255,107,53,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': { bgcolor: homeTab === t ? '#E55A24' : '#f5f5f5' },
                  }}
                >
                  {t}
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.3,
                      bgcolor: homeTab === t ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                      borderRadius: 1,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {homeTabCounts[t]}
                  </Box>
                </Button>
              ))}
            </Box>
            {loading && orders.length === 0 ? (
              <>
                <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={140} />
              </>
            ) : homeOrdersFiltered.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: '#777' }}>
                <Typography sx={{ fontWeight: 900, color: '#111' }}>No {homeTab.toLowerCase()} orders</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13 }}>Try another tab</Typography>
              </Box>
            ) : (
              homeOrdersFiltered.map(renderOrderCard)
            )}
          </>
        ) : null}

        {mainTab === 'cooking' ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['DINE_IN', 'DELIVERY'] as CookingOrderTypeTab[]).map(t => (
                <Button
                  key={t}
                  onClick={() => setCookingOrderTypeTab(t)}
                  sx={{
                    bgcolor: cookingOrderTypeTab === t ? (t === 'DINE_IN' ? '#3498DB' : '#FF6B35') : 'white',
                    color: cookingOrderTypeTab === t ? 'white' : '#666',
                    borderRadius: 2,
                    px: 2,
                    py: 0.8,
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 900,
                    boxShadow: cookingOrderTypeTab === t ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': { bgcolor: cookingOrderTypeTab === t ? (t === 'DINE_IN' ? '#2E86C1' : '#E55A24') : '#f5f5f5' },
                  }}
                >
                  {t === 'DINE_IN' ? 'DINE-IN' : 'DELIVERY'}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['ACTIVE', 'READY', 'COMPLETED'] as CookingFilterTab[]).map(t => (
                <Button
                  key={t}
                  onClick={() => setCookingFilterTab(t)}
                  sx={{
                    bgcolor: cookingFilterTab === t ? '#111' : 'white',
                    color: cookingFilterTab === t ? 'white' : '#666',
                    borderRadius: 2,
                    px: 2,
                    py: 0.6,
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: cookingFilterTab === t ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': { bgcolor: cookingFilterTab === t ? '#000' : '#f5f5f5' },
                  }}
                >
                  {t}
                </Button>
              ))}
            </Box>

            {loading && cookingOrders.length === 0 ? (
              <>
                <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={140} />
              </>
            ) : cookingOrdersFiltered.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: '#777' }}>
                <Typography sx={{ fontWeight: 900, color: '#111' }}>No {cookingFilterTab.toLowerCase()} orders</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13 }}>Try another tab</Typography>
              </Box>
            ) : (
              cookingOrdersFiltered.map(renderOrderCard)
            )}

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 900, color: '#111', mb: 1 }}>Most Ordered</Typography>
            {loading && mostOrdered.length === 0 ? (
              <Skeleton variant="rounded" height={90} />
            ) : mostOrdered.length === 0 ? (
              <Typography sx={{ color: '#777', fontSize: 13 }}>No data</Typography>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
                {mostOrdered.slice(0, 5).map((it, idx) => (
                  <Box key={`${it.name}:${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                    <Typography sx={{ fontWeight: 800, color: '#111' }}>
                      {it.rank ? `${it.rank}. ` : ''}{it.name}
                    </Typography>
                    <Typography sx={{ color: '#666', fontSize: 12 }}>{it.time || ''}</Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </>
        ) : null}

        {mainTab === 'notifications' ? (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications sx={{ color: '#FF6B35' }} />
                <Typography sx={{ fontWeight: 900, color: '#111' }}>Notifications</Typography>
                <Chip size="small" label={`${notificationsUnread} unread`} sx={{ fontWeight: 900, bgcolor: '#fff1ea', color: '#FF6B35' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={() => requestChefDashboard({ forNotifications: true })}
                  disabled={notificationsLoading}
                  sx={{ textTransform: 'none', fontWeight: 900 }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void markAllNotificationsAsRead()}
                  disabled={notificationsLoading || chefNotifications.length === 0}
                  sx={{ textTransform: 'none', fontWeight: 900, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
                >
                  Mark all read
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['all', 'unread', 'read'] as const).map(f => (
                <Button
                  key={f}
                  onClick={() => setNotificationsFilter(f)}
                  sx={{
                    bgcolor: notificationsFilter === f ? '#111' : 'white',
                    color: notificationsFilter === f ? 'white' : '#666',
                    borderRadius: 2,
                    px: 2,
                    py: 0.6,
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow: notificationsFilter === f ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': { bgcolor: notificationsFilter === f ? '#000' : '#f5f5f5' },
                  }}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
                </Button>
              ))}
            </Box>

            {notificationsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {notificationsError}
              </Alert>
            ) : null}

            {notificationsLoading && filteredNotifications.length === 0 ? (
              <>
                <Skeleton variant="rounded" height={92} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" height={92} sx={{ mb: 1.5 }} />
              </>
            ) : filteredNotifications.length === 0 ? (
              <Typography sx={{ color: '#777', fontSize: 13 }}>No notifications</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {filteredNotifications.map((n, idx) => {
                  const id = String(n?._id || n?.id || '');
                  const read = Boolean(n?.read);
                  const title = String(n?.title || n?.type || 'Notification');
                  const message = String(n?.message || n?.body || '');
                  const time = formatMinutesAgo(n?.createdAt);
                  return (
                    <Card
                      key={id || `${idx}`}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        borderColor: read ? '#eee' : '#FF6B35',
                        bgcolor: read ? 'white' : '#fff8f5',
                      }}
                    >
                      <CardContent sx={{ pb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box sx={{ minWidth: 220, flex: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Typography sx={{ fontWeight: 900, color: '#111' }}>{title}</Typography>
                              {!read ? <Chip size="small" label="UNREAD" sx={{ fontWeight: 900, bgcolor: '#FF6B35', color: 'white' }} /> : null}
                              {time ? <Typography sx={{ color: '#888', fontSize: 12 }}>{time}</Typography> : null}
                            </Box>
                            {message ? <Typography sx={{ color: '#555', fontSize: 13, mt: 0.5 }}>{message}</Typography> : null}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!read ? (
                              <Button
                                onClick={() => void markNotificationAsRead(id)}
                                disabled={!id || notificationsLoading}
                                sx={{ textTransform: 'none', fontWeight: 900 }}
                              >
                                Mark read
                              </Button>
                            ) : null}
                            <Button
                              color="error"
                              onClick={() => void deleteNotification(id)}
                              disabled={!id || notificationsLoading}
                              sx={{ textTransform: 'none', fontWeight: 900 }}
                            >
                              Delete
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        ) : null}

        {mainTab === 'profile' ? (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar
                src={profileImage ? api.getImageUrl(profileImage) : undefined}
                imgProps={{ loading: 'lazy', decoding: 'async' }}
                sx={{ width: 56, height: 56, bgcolor: '#FF6B35', fontWeight: 900 }}
              >
                {String(displayName || 'C').slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography sx={{ fontWeight: 900, color: '#111' }}>{displayName}</Typography>
                <Typography sx={{ color: '#666', fontSize: 13 }}>{String(user?.email || '')}</Typography>
                <Typography sx={{ color: '#666', fontSize: 13 }}>{String(user?.role || 'CHEF')}</Typography>
              </Box>
            </Box>

            {profileError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {profileError}
              </Alert>
            ) : null}

            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setProfileError('');
                  setProfileNameInput(displayName);
                  setProfileNameDialogOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Edit Name
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setProfileError('');
                  setProfileImageInput(profileImage);
                  setProfileImageDialogOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Change Image
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setProfileError('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setChangePasswordDialogOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Change Password
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('userRole');
                  localStorage.removeItem('userData');
                  window.location.replace('/login');
                }}
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        ) : null}
        </Paper>

      <Dialog open={checklistOpen} onClose={() => setChecklistOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Packaging Checklist</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontWeight: 800, color: '#111', mb: 1 }}>
            {checklistOrder?.orderNumber || ''}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.itemsPacked} onChange={e => setPackingChecklist(s => ({ ...s, itemsPacked: e.target.checked }))} />}
              label="Items packed"
            />
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.allItemsIncluded} onChange={e => setPackingChecklist(s => ({ ...s, allItemsIncluded: e.target.checked }))} />}
              label="All items included"
            />
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.specialInstructions} onChange={e => setPackingChecklist(s => ({ ...s, specialInstructions: e.target.checked }))} />}
              label="Special instructions checked"
            />
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.receiptIncluded} onChange={e => setPackingChecklist(s => ({ ...s, receiptIncluded: e.target.checked }))} />}
              label="Receipt included"
            />
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.napkinsUtensils} onChange={e => setPackingChecklist(s => ({ ...s, napkinsUtensils: e.target.checked }))} />}
              label="Napkins & utensils"
            />
            <FormControlLabel
              control={<Checkbox checked={packingChecklist.packagingSealed} onChange={e => setPackingChecklist(s => ({ ...s, packagingSealed: e.target.checked }))} />}
              label="Packaging sealed"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChecklistOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!allChecked || !checklistOrder}
            onClick={() => {
              const id = checklistOrder ? normalizeOrderId(checklistOrder) : '';
              setChecklistOpen(false);
              setChecklistOrder(null);
              if (id) void updateOrderStatus(id, 'READY');
            }}
            sx={{ bgcolor: '#2BC48A', '&:hover': { bgcolor: '#25AB77' }, textTransform: 'none', fontWeight: 900 }}
          >
            Confirm & Mark Ready
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={profileNameDialogOpen} onClose={() => setProfileNameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Name</DialogTitle>
        <DialogContent dividers>
          <TextField value={profileNameInput} onChange={e => setProfileNameInput(e.target.value)} fullWidth label="Name" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileNameDialogOpen(false)} disabled={profileSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveProfileName()}
            disabled={profileSaving || !profileNameInput.trim()}
            sx={{ textTransform: 'none', fontWeight: 900, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={profileImageDialogOpen} onClose={() => setProfileImageDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Change Image</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
            <Avatar
              src={
                profileImageInput.trim()
                  ? api.getImageUrl(profileImageInput.trim())
                  : profileImage
                  ? api.getImageUrl(profileImage)
                  : undefined
              }
              imgProps={{ loading: 'lazy', decoding: 'async' }}
              sx={{ width: 56, height: 56, bgcolor: '#FF6B35', fontWeight: 900 }}
            >
              {String(displayName || 'C').slice(0, 1).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              disabled={profileSaving}
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Upload Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadProfileImageFile(file);
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <TextField
            value={profileImageInput}
            onChange={e => setProfileImageInput(e.target.value)}
            fullWidth
            label="Image URL (optional)"
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileImageDialogOpen(false)} disabled={profileSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveProfileImage()}
            disabled={profileSaving || !profileImageInput.trim()}
            sx={{ textTransform: 'none', fontWeight: 900, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={changePasswordDialogOpen} onClose={() => setChangePasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Change Password</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              fullWidth
              label="Current Password"
              type="password"
            />
            <TextField value={newPassword} onChange={e => setNewPassword(e.target.value)} fullWidth label="New Password" type="password" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordDialogOpen(false)} disabled={profileSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void savePassword()}
            disabled={profileSaving || !currentPassword || !newPassword}
            sx={{ textTransform: 'none', fontWeight: 900, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChefDashboard;
