import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  Paper,
  Avatar,
  Badge,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as DiningIcon,
  TableBar as TableIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationsIcon,
  Print as PrintIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { getSocketIoOptions, getSocketIoUrl } from '../../utils/socketOptions';
import { fetchWaiterDashboardHttp } from '../../utils/dashboardHttp';
import {
  fetchUserUnreadNotificationCount,
  publishNotificationUnreadCount,
} from '../../utils/notificationCountSync';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import './WaiterDashboard.css';

// Types
interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  size_name?: string | null;
  quantity: number;
  price: number;
  unit_price: number;
  total_price: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  image?: string | null;
  special_instructions?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: 'PENDING' | 'KITCHEN_ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED' | 'DELIVERED';
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  table_id?: string | null;
  table_number?: string | null;
  items: OrderItem[];
  total_amount: number;
  special_instructions?: string | null;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  waiter_name?: string | null;
}

interface Table {
  id: string;
  table_number: string;
  seating_capacity: number;
  section?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  current_order_id?: string | null;
}

interface WaiterStats {
  active_orders: number;
  ready_to_serve: number;
  served_today: number;
  total_orders?: number;
}

interface Notification {
  id: string;
  _id?: string;
  title: string;
  message: string;
  type: 'ORDER_READY' | 'ORDER_CANCELLED' | 'NEW_ORDER' | 'TABLE_STATUS' | 'GENERAL';
  read: boolean;
  isRead?: boolean;
  createdAt: string;
  created_at?: string;
  orderId?: string;
  tableId?: string;
}

interface WaiterProfile {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  phone?: string;
  profileImage?: string;
  assigned_branch_name?: string;
  branch_name?: string;
  assignedBranch?: { branchName?: string; name?: string; _id?: string };
  branch?: { branchName?: string; name?: string; _id?: string };
}

type MenuProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  price: number;
  image?: string | null;
};

type MenuCategory = {
  id: string;
  name: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

const COLORS = {
  primary: '#f57c00',
  primaryLight: '#ff9800',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  textPrimary: '#1a1a2e',
  textSecondary: '#666',
  bgLight: '#f8f9fa',
  border: '#e0e0e0',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#ff9800',
  KITCHEN_ACCEPTED: '#2196f3',
  PREPARING: '#ff9800',
  READY: '#4caf50',
  SERVED: '#9c27b0',
  COMPLETED: '#4caf50',
  DELIVERED: '#4caf50',
  CANCELLED: '#f44336',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  KITCHEN_ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#4caf50',
  OCCUPIED: '#f44336',
  RESERVED: '#ff9800',
  CLEANING: '#9e9e9e',
};

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formatPrice } = useSettings();

  const toNumber = (value: unknown, fallback = 0): number => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const money = (value: unknown): string => {
    return toNumber(value, 0).toFixed(2);
  };

  const price = (value: unknown): string => {
    return formatPrice(toNumber(value, 0));
  };

  const getBranchDisplayName = (): string => {
    try {
      const raw = localStorage.getItem('userData');
      const parsed = raw ? JSON.parse(raw) : null;
      const branch = parsed?.assignedBranch || parsed?.branch || parsed?.restaurant || null;
      const name = String(branch?.branchName || branch?.name || '').trim();
      if (name) return name;
    } catch {
      // ignore
    }

    const name = String(
      profile?.assigned_branch_name ||
        profile?.branch_name ||
        profile?.assignedBranch?.branchName ||
        profile?.assignedBranch?.name ||
        profile?.branch?.branchName ||
        profile?.branch?.name ||
        ''
    ).trim();
    return name || 'Branch';
  };

  const normalizeOrder = (raw: any): Order => {
    const itemsRaw = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.orderItems) ? raw.orderItems : [];
    const items: OrderItem[] = itemsRaw.map((it: any, idx: number) => {
      const quantity = Math.max(1, Math.trunc(toNumber(it?.quantity, 1)));
      const unitPrice = toNumber(it?.unit_price ?? it?.unitPrice ?? it?.price, 0);
      const totalPrice =
        toNumber(it?.total_price ?? it?.totalPrice, Number.isFinite(unitPrice) ? unitPrice * quantity : 0);
      return {
        id: String(it?.id || it?._id || `${raw?.id || raw?._id || 'order'}-item-${idx}`),
        product_id: String(it?.product_id || it?.productId || it?.product || it?.menuItemId || ''),
        product_name: String(it?.product_name || it?.productName || it?.name || it?.product?.name || 'Item'),
        size_name: (it?.size_name ?? it?.sizeName ?? it?.size?.size_name ?? it?.size?.name ?? null) as any,
        quantity,
        price: unitPrice,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: (String(it?.status || 'PENDING').toUpperCase() as any) || 'PENDING',
        image: it?.image ?? it?.imageUrl ?? it?.product?.imageUrl ?? null,
        special_instructions: it?.special_instructions ?? it?.specialInstructions,
      };
    });

    const totalAmount =
      toNumber(raw?.total_amount ?? raw?.totalAmount ?? raw?.finalAmount ?? raw?.total ?? raw?.total_price, 0) ||
      items.reduce((sum, it) => sum + toNumber(it.total_price, 0), 0);

    return {
      id: String(raw?.id || raw?._id || ''),
      order_number: String(raw?.order_number || raw?.orderNumber || raw?.orderNo || raw?._id || ''),
      status: (String(raw?.status || 'PENDING').toUpperCase() as any) || 'PENDING',
      order_type: (String(raw?.order_type || raw?.orderType || 'DINE_IN').toUpperCase() as any) || 'DINE_IN',
      table_id: raw?.table_id ?? raw?.tableId ?? raw?.table?._id ?? raw?.table ?? null,
      table_number: raw?.table_number ?? raw?.tableNumber ?? raw?.table?.tableNumber ?? null,
      items,
      total_amount: totalAmount,
      special_instructions: raw?.special_instructions ?? raw?.specialInstructions ?? null,
      created_at: String(raw?.created_at || raw?.createdAt || new Date().toISOString()),
      customer_name: raw?.customer_name ?? raw?.customerName ?? raw?.customer?.name,
      customer_phone: raw?.customer_phone ?? raw?.customerPhone ?? raw?.customer?.phoneNumber,
      waiter_name:
        raw?.waiter_name ??
        raw?.waiterName ??
        raw?.waiter?.displayName ??
        raw?.waiter?.name ??
        null,
    };
  };

  const normalizeOrders = (raw: any): Order[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map(normalizeOrder).filter((o) => Boolean(o.id));
  };

  const normalizeTable = (raw: any): Table => {
    const id = String(raw?.id || raw?._id || '').trim();
    const tableNumber = String(
      raw?.table_number ??
        raw?.tableNumber ??
        raw?.tableNo ??
        raw?.number ??
        raw?.table?.table_number ??
        raw?.table?.tableNumber ??
        raw?.table?.number ??
        ''
    ).trim();
    const seatingCapacity = Math.max(0, Math.trunc(toNumber(raw?.seating_capacity ?? raw?.seatingCapacity ?? raw?.capacity, 0)));
    const status = (String(raw?.status || 'AVAILABLE').toUpperCase() as any) || 'AVAILABLE';
    return {
      id,
      table_number: tableNumber,
      seating_capacity: seatingCapacity,
      section: raw?.section,
      status,
      current_order_id: raw?.current_order_id ?? raw?.currentOrderId ?? raw?.current_order ?? raw?.currentOrder ?? null,
    };
  };

  const normalizeTables = (raw: any): Table[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map(normalizeTable).filter((t) => Boolean(t.id));
  };

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WaiterStats>({
    active_orders: 0,
    ready_to_serve: 0,
    served_today: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<WaiterProfile | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Dialogs
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [orderDetailsDialogOpen, setOrderDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = useState<string>('all');
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [createCustomerName, setCreateCustomerName] = useState('');
  const [createPhoneNumber, setCreatePhoneNumber] = useState('');
  const [createTableId, setCreateTableId] = useState('');
  const [createSpecialInstructions, setCreateSpecialInstructions] = useState('');
  
  // Profile edit form
  const [editForm, setEditForm] = useState({
    displayName: '',
    phone: '',
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  const tabKey = useMemo(() => {
    const path = String(location.pathname || '');
    if (path.startsWith('/waiter/tables')) return 'tables';
    if (path.startsWith('/waiter/notifications')) return 'notifications';
    if (path.startsWith('/waiter/profile')) return 'profile';
    if (path.startsWith('/waiter/orders')) return 'orders';
    if (path === '/waiter' || path === '/waiter/') return 'orders';
    return 'orders';
  }, [location.pathname]);

  useEffect(() => {
    const path = String(location.pathname || '');
    if (path === '/waiter' || path === '/waiter/') {
      navigate('/waiter/orders', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const next = tabKey === 'orders' ? 0 : tabKey === 'tables' ? 1 : tabKey === 'notifications' ? 2 : 3;
    setActiveTab((prev) => (prev === next ? prev : next));
  }, [tabKey]);

  useEffect(() => {
    if (!createOrderOpen) return;
    if (!tables.length) return;
    const hasSelected = tables.some((t) => String(t.id) === String(createTableId));
    if (!createTableId || !hasSelected) {
      setCreateTableId(String(tables[0].id));
    }
  }, [createOrderOpen, createTableId, tables]);

  const navigateToTab = (nextTabIndex: number) => {
    const path =
      nextTabIndex === 0
        ? '/waiter/orders'
        : nextTabIndex === 1
        ? '/waiter/tables'
        : nextTabIndex === 2
        ? '/waiter/notifications'
        : '/waiter/profile';
    if (location.pathname !== path) navigate(path);
  };

  useEffect(() => {
    void syncWaiterBranchFromProfile();
  }, []);

  const applyWaiterPayload = (payload: any) => {
    setStats(payload?.stats || { active_orders: 0, ready_to_serve: 0, served_today: 0 });
    setOrders(normalizeOrders(payload?.orders));
    setTables(normalizeTables(payload?.tables));
    setLoading(false);
  };

  const loadWaiterDashboardHttp = async () => {
    try {
      const payload = await fetchWaiterDashboardHttp();
      if (payload) applyWaiterPayload(payload);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to load dashboard data',
        severity: 'error',
      });
      setLoading(false);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    const socket = io(getSocketIoUrl(), getSocketIoOptions());
    socketRef.current = socket;

    const refreshWaiterSocket = () => {
      if (socket.connected) socket.emit('waiter_dashboard:get');
      else void loadWaiterDashboardHttp();
    };

    socket.on('connect', refreshWaiterSocket);

    socket.on('waiter_dashboard:data', applyWaiterPayload);

    socket.on('waiter_dashboard:error', (error: any) => {
      console.error('[WAITER] Dashboard error:', error);
      void loadWaiterDashboardHttp();
    });

    socket.on('connect_error', () => {
      void loadWaiterDashboardHttp();
    });

    socket.on('waiter_dashboard:invalidate', refreshWaiterSocket);
    socket.on('order:created', refreshWaiterSocket);
    socket.on('order:updated', refreshWaiterSocket);
    socket.on('order:status_updated', refreshWaiterSocket);
    socket.on('admin_dashboard:invalidate', refreshWaiterSocket);

    socket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => {
        const next = prev + 1;
        publishNotificationUnreadCount(next);
        return next;
      });
      
      // Show snackbar for important notifications
      if (notification.type === 'ORDER_READY') {
        setSnackbar({
          open: true,
          message: `Order #${notification.orderId} is ready to serve!`,
          severity: 'success',
        });
      }
    });

    socket.on('order_updated', (updatedOrder: any) => {
      const next = normalizeOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((order) => (order.id === next.id ? next : order))
      );
    });

    socket.on('table_updated', (updatedTable: any) => {
      const next = normalizeTable(updatedTable);
      setTables((prev) =>
        prev.map((table) => (table.id === next.id ? next : table))
      );
    });

    socket.on('disconnect', () => {
      console.log('[WAITER] WebSocket disconnected');
    });

    loadProfile();
    loadNotifications();

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.data) {
        const data = response.data as WaiterProfile;
        setProfile(data);
        setEditForm({
          displayName: data.displayName || data.name || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const applyUnreadCount = (count: number) => {
    const n = Math.max(0, count);
    setUnreadCount(n);
    publishNotificationUnreadCount(n);
  };

  const loadNotifications = async () => {
    try {
      const [response, apiUnread] = await Promise.all([
        api.get<any>('/notifications?limit=20'),
        fetchUserUnreadNotificationCount((path) => api.get(path)),
      ]);
      if (!response?.success) return;

      const root: any = response?.data ?? response ?? {};
      const rawList =
        root?.notifications ||
        root?.data?.notifications ||
        (Array.isArray(root) ? root : []) ||
        [];
      const rawUnread =
        root?.unreadCount ??
        root?.unread ??
        root?.data?.unreadCount ??
        root?.data?.unread ??
        undefined;

      const normalized: Notification[] = (Array.isArray(rawList) ? rawList : [])
        .map((n: any) => {
          const id = String(n?._id || n?.id || '').trim();
          if (!id) return null;
          return {
            id,
            _id: n?._id,
            title: String(n?.title || 'Notification'),
            message: String(n?.message || n?.body || ''),
            type: (String(n?.type || 'GENERAL') as any) || 'GENERAL',
            read: Boolean(n?.read ?? n?.isRead ?? false),
            isRead: n?.isRead,
            createdAt: String(n?.createdAt || n?.created_at || new Date().toISOString()),
            created_at: n?.created_at,
            orderId: n?.orderId || n?.data?.orderId,
            tableId: n?.tableId || n?.data?.tableId,
          } as Notification;
        })
        .filter(Boolean) as Notification[];

      setNotifications(normalized);
      const unreadFromList = typeof rawUnread === 'number' ? rawUnread : Number(rawUnread);
      const computedUnread = normalized.reduce((sum, n) => sum + (n.read ? 0 : 1), 0);
      const unread =
        Number.isFinite(unreadFromList) && unreadFromList >= 0 ? unreadFromList : apiUnread ?? computedUnread;
      applyUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    socketRef.current?.emit('waiter_dashboard:get');
  };

  const getRestaurantId = (): string => {
    const fromSelected = String(localStorage.getItem('selectedBranchId') || '').trim();
    let fromUserData = '';
    try {
      const raw = localStorage.getItem('userData');
      const parsed = raw ? JSON.parse(raw) : null;
      const branch =
        parsed?.assignedBranch ||
        parsed?.branch ||
        parsed?.restaurant ||
        parsed?.assigned_branch ||
        null;
      if (typeof branch === 'string') {
        fromUserData = branch.trim();
      } else if (branch && typeof branch === 'object') {
        fromUserData = String(branch._id || branch.id || '').trim();
      }
      if (!fromUserData) {
        fromUserData = String(
          parsed?.assigned_branch_id || parsed?.branchId || parsed?.restaurantId || ''
        ).trim();
      }
    } catch {
      fromUserData = '';
    }
    return fromUserData || fromSelected;
  };

  const syncWaiterBranchFromProfile = async () => {
    try {
      const meRes: any = await api.get('/auth/me');
      const user = meRes?.data?.user ?? meRes?.data;
      if (!user || typeof user !== 'object') return;
      localStorage.setItem('userData', JSON.stringify(user));
      const branchId = getRestaurantId();
      if (branchId) localStorage.setItem('selectedBranchId', branchId);
    } catch {
      /* non-fatal */
    }
  };

  const loadMenuProducts = async () => {
    try {
      setMenuLoading(true);
      const restaurantId = getRestaurantId();
      const menuUrl = restaurantId ? `/menu?branchId=${encodeURIComponent(restaurantId)}` : '/menu';
      const res = await api.get<any>(menuUrl);
      const categories = Array.isArray(res?.data?.categories || res?.data) ? (res.data.categories || res.data) : [];
      const nextCategories: MenuCategory[] = [];
      const products: MenuProduct[] = [];
      for (const c of categories) {
        const categoryId = String(c?._id || c?.id || '').trim();
        const categoryName = String(c?.name || c?.categoryName || 'Category');
        if (categoryId) {
          nextCategories.push({ id: categoryId, name: categoryName });
        }
        const list = Array.isArray(c?.products) ? c.products : Array.isArray(c?.items) ? c.items : [];
        for (const p of list) {
          const id = String(p?._id || p?.id || '').trim();
          if (!id) continue;
          const name = String(p?.name || p?.productName || 'Item');
          const price = Number(p?.price ?? p?.unitPrice ?? p?.amount ?? 0);
          products.push({
            id,
            categoryId,
            categoryName,
            name,
            price: Number.isFinite(price) ? price : 0,
            image: (p?.imageUrl || p?.image || p?.thumbnail || null) as any,
          });
        }
      }
      const uniqueCategories = new Map<string, MenuCategory>();
      for (const c of nextCategories) {
        if (!uniqueCategories.has(c.id)) uniqueCategories.set(c.id, c);
      }
      const sortedCategories = Array.from(uniqueCategories.values()).sort((a, b) => a.name.localeCompare(b.name));
      setMenuCategories(sortedCategories);
      const unique = new Map<string, MenuProduct>();
      for (const p of products) {
        if (!unique.has(p.id)) unique.set(p.id, p);
      }
      setMenuProducts(Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setMenuCategories([]);
      setMenuProducts([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const openCreateOrder = () => {
    setCreateOrderOpen(true);
    setSelectedMenuCategoryId('all');
    setMenuSearch('');
    setCartItems([]);
    setCreateCustomerName('');
    setCreatePhoneNumber('');
    setCreateSpecialInstructions('');
    setCreateTableId((prev) => prev || (tables[0]?.id ? String(tables[0].id) : ''));
    if (!menuProducts.length) void loadMenuProducts();
  };

  const addToCart = (product: MenuProduct) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCartItems((prev) => {
      const next = prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0);
      return next;
    });
  };

  const createOrder = async () => {
    if (!createTableId || cartItems.length === 0) return;
    const restaurantId = getRestaurantId();
    if (!restaurantId) {
      setSnackbar({ open: true, message: 'Branch is missing. Please select branch first.', severity: 'error' });
      return;
    }
    const selectedTable = tables.find((t) => String(t.id) === String(createTableId));
    const tableLabel = String(selectedTable?.table_number || '').trim() || '1';
    const customerLabel = createCustomerName.trim() || 'Walk-in Customer';
    setCreatingOrder(true);
    try {
      const payload = {
        restaurantId,
        orderType: 'DINE_IN',
        paymentMethod: 'cash',
        customerName: customerLabel,
        phoneNumber: createPhoneNumber.trim() || undefined,
        // Legacy API requires non-empty address fields; omit tableNumber (unknown on old servers)
        deliveryAddress: {
          street: `Table ${tableLabel}`,
          city: 'Restaurant',
          state: 'Local',
          zipCode: '00000',
        },
        tableId: String(selectedTable?.id || createTableId),
        items: cartItems.map((i) => ({
          menuItemId: String(i.productId),
          quantity: Math.max(1, Math.trunc(Number(i.quantity || 1))),
          customizations: [],
        })),
        deliveryInstructions: createSpecialInstructions.trim() || `Table order - Table #${tableLabel}`,
        ...(createSpecialInstructions.trim() ? { specialInstructions: createSpecialInstructions.trim() } : {}),
      };

      const res: any = await api.post('/orders', payload);
      if (!res?.success) {
        throw new Error(res?.error || res?.message || 'Failed to create order');
      }
      setCreateOrderOpen(false);
      setSnackbar({ open: true, message: 'Order created successfully', severity: 'success' });
      socketRef.current?.emit('waiter_dashboard:get');
      navigateToTab(0);
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
        e?.message ||
        'Failed to create order';
      setSnackbar({
        open: true,
        message: data?.statusCode ? `${msg} (${data.statusCode})` : String(msg),
        severity: 'error',
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await api.patch('/users/profile', editForm);
      if (response.success) {
        setProfile((prev) => prev ? { ...prev, ...editForm } : null);
        try {
          const raw = localStorage.getItem('userData');
          const current = raw ? JSON.parse(raw) : {};
          const next = {
            ...current,
            name: editForm.displayName || current?.name,
            displayName: editForm.displayName || current?.displayName,
            phone: editForm.phone || current?.phone,
            phoneNumber: editForm.phone || current?.phoneNumber,
          };
          localStorage.setItem('userData', JSON.stringify(next));
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
        } catch {}
        setEditProfileDialogOpen(false);
        setSnackbar({
          open: true,
          message: 'Profile updated successfully',
          severity: 'success',
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error',
      });
    }
  };

  const handleServeOrder = async (orderId: string) => {
    try {
      const response = await api.post(`/orders/${orderId}/serve`, {});
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Order served successfully',
          severity: 'success',
        });
        socketRef.current?.emit('waiter_dashboard:get');
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to serve order',
        severity: 'error',
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    
    try {
      const response = await api.post(`/orders/${selectedOrder.id}/cancel`, {
        reason: cancelReason,
      });
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Order cancelled successfully',
          severity: 'success',
        });
        setCancelDialogOpen(false);
        setCancelReason('');
        socketRef.current?.emit('waiter_dashboard:get');
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to cancel order',
        severity: 'error',
      });
    }
  };

  const handlePrintBill = (order: Order) => {
    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const safeItems = Array.isArray(order.items) ? order.items : [];
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill - Order #${order.order_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .bill-title { font-size: 24px; font-weight: bold; }
              .order-info { margin-bottom: 20px; }
              .items { width: 100%; border-collapse: collapse; }
              .items th, .items td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              .total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="bill-title">eatzilla</div>
              <div>Order #${order.order_number}</div>
              <div>${new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div class="order-info">
              <div>Table: ${order.table_number || 'N/A'}</div>
              <div>Type: ${order.order_type}</div>
            </div>
            <table class="items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${safeItems.map(item => `
                  <tr>
                    <td>${item.product_name}${item.size_name ? ` (${item.size_name})` : ''}</td>
                    <td>${item.quantity}</td>
                    <td>${price(item.unit_price)}</td>
                    <td>${price(item.total_price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">Total: ${price(order.total_amount)}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    const id = String(notificationId || '').trim();
    if (!id) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const resPatch: any = await api.patch(`/notifications/${id}/read`).catch(() => null);
      const okPatch = Boolean(resPatch?.success);
      if (!okPatch) {
        const resPut: any = await api.put(`/notifications/${id}/read`).catch(() => null);
        if (!resPut?.success) {
          throw new Error(String(resPut?.message || resPut?.error || 'Failed to mark as read'));
        }
      }
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        publishNotificationUnreadCount(next);
        return next;
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setSnackbar({ open: true, message: 'Failed to mark notification as read', severity: 'error' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (unreadCount === 0) return;
    const prevList = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    applyUnreadCount(0);
    try {
      const resPut: any = await api.put('/notifications/mark-all-read').catch(() => null);
      if (!resPut?.success) {
        const resPatch: any = await api.patch('/notifications/mark-all-read').catch(() => null);
        if (!resPatch?.success) {
          const resWaiter: any = await api.put('/notifications/waiter/read-all').catch(() => null);
          if (!resWaiter?.success) {
            throw new Error(String(resWaiter?.message || resWaiter?.error || 'Failed to mark all as read'));
          }
        }
      }
      setSnackbar({ open: true, message: 'All notifications marked as read', severity: 'success' });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setSnackbar({ open: true, message: 'Failed to mark all as read', severity: 'error' });
      setNotifications(prevList);
      setUnreadCount(prevList.reduce((sum, n) => sum + (n.read ? 0 : 1), 0));
    }
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0) return;
    const prevList = notifications;
    const prevUnread = unreadCount;
    setNotifications([]);
    applyUnreadCount(0);
    try {
      const res: any = await api.clearAllUserNotifications();
      if (!res?.success) {
        throw new Error(String(res?.error || res?.message || 'Failed to clear notifications'));
      }
      setSnackbar({ open: true, message: 'All notifications cleared', severity: 'success' });
      void loadNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to clear notifications',
        severity: 'error',
      });
      setNotifications(prevList);
      setUnreadCount(prevUnread);
      await loadNotifications();
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getActiveOrders = () => orders.filter(o => 
    ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
  );

  const getTableOrders = (tableId: string) => orders.filter(o => o.table_id === tableId);

  const renderStats = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card sx={{ bgcolor: COLORS.bgLight, borderLeft: `4px solid ${COLORS.primary}` }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Active Orders
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
              {stats.active_orders}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card sx={{ bgcolor: COLORS.bgLight, borderLeft: `4px solid ${COLORS.success}` }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Ready to Serve
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
              {stats.ready_to_serve}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card sx={{ bgcolor: COLORS.bgLight, borderLeft: `4px solid ${COLORS.info}` }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Served Today
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
              {stats.served_today}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderOrders = () => {
    const activeOrders = getActiveOrders();
    
    if (activeOrders.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <DiningIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No active orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            New orders will appear here when customers place them
          </Typography>
        </Box>
      );
    }

    if (isMobile) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {activeOrders.map((order) => (
            <Paper
              key={order.id}
              variant="outlined"
              sx={{ p: 1.75, borderRadius: 3, bgcolor: '#fff' }}
              onClick={() => {
                setSelectedOrder(order);
                setOrderDetailsDialogOpen(true);
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, color: '#111' }} noWrap>
                    #{order.order_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.order_type}
                    {order.table_number ? ` • Table ${order.table_number}` : ''}
                    {order.waiter_name ? ` • Waiter ${order.waiter_name}` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={STATUS_LABELS[order.status]}
                  size="small"
                  sx={{
                    bgcolor: STATUS_COLORS[order.status] + '20',
                    color: STATUS_COLORS[order.status],
                    fontWeight: 900,
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 1 }}>
                <Typography sx={{ fontWeight: 900, color: COLORS.primary }}>
                  {price(order.total_amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(order.created_at).toLocaleTimeString()}
                </Typography>
              </Box>

              <Typography sx={{ mt: 1, color: '#666', fontSize: 13 }}>
                {order.items.slice(0, 2).map((i) => i.product_name).join(', ')}
                {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
              </Typography>
            </Paper>
          ))}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: COLORS.bgLight }}>
              <TableCell>Order #</TableCell>
              <TableCell>Table</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeOrders.map((order) => (
              <Fragment key={order.id}>
                <TableRow
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      #{order.order_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.order_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.table_number ? (
                      <Chip
                        icon={<TableIcon />}
                        label={`Table ${order.table_number}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.items.length} items
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.items.slice(0, 2).map(i => i.product_name).join(', ')}
                      {order.items.length > 2 && '...'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[order.status]}
                      size="small"
                      sx={{
                        bgcolor: STATUS_COLORS[order.status] + '20',
                        color: STATUS_COLORS[order.status],
                        fontWeight: 'bold',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {price(order.total_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {order.status === 'READY' && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServeOrder(order.id);
                          }}
                          sx={{
                            bgcolor: COLORS.success,
                            '&:hover': { bgcolor: COLORS.success + 'dd' },
                          }}
                        >
                          Serve
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setOrderDetailsDialogOpen(true);
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                    <Collapse in={expandedOrder === order.id}>
                      <Box sx={{ p: 2, bgcolor: COLORS.bgLight }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Order Items:
                        </Typography>
                        {order.items.map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1,
                              borderBottom: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {item.quantity}x {item.product_name}
                                {item.size_name && ` (${item.size_name})`}
                              </Typography>
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  bgcolor: STATUS_COLORS[item.status] + '20',
                                  color: STATUS_COLORS[item.status],
                                  fontSize: '10px',
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="medium">
                              {price(item.total_price)}
                            </Typography>
                          </Box>
                        ))}
                        {order.special_instructions && (
                          <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Special Instructions:
                            </Typography>
                            <Typography variant="body2">
                              {order.special_instructions}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          {order.status === 'READY' && (
                            <Button
                              variant="contained"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleServeOrder(order.id)}
                              sx={{
                                bgcolor: COLORS.success,
                                '&:hover': { bgcolor: COLORS.success + 'dd' },
                              }}
                            >
                              Mark as Served
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={() => handlePrintBill(order)}
                          >
                            Print Bill
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                              setSelectedOrder(order);
                              setCancelDialogOpen(true);
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderTables = () => {
    if (tables.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <TableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tables assigned
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {tables.map((table) => {
          const tableOrders = getTableOrders(table.id);
          const hasActiveOrder = tableOrders.length > 0;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={table.id}>
              <Card
                variant="outlined"
                sx={{
                  borderLeft: `4px solid ${TABLE_STATUS_COLORS[table.status]}`,
                  cursor: hasActiveOrder ? 'pointer' : 'default',
                  '&:hover': hasActiveOrder ? { boxShadow: 2 } : {},
                }}
                onClick={() => {
                  if (hasActiveOrder) {
                    setExpandedOrder(tableOrders[0].id);
                    navigateToTab(0);
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Table {table.table_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {table.section || 'Main Hall'} • {table.seating_capacity} seats
                      </Typography>
                    </Box>
                    <Chip
                      label={table.status}
                      size="small"
                      sx={{
                        bgcolor: TABLE_STATUS_COLORS[table.status] + '20',
                        color: TABLE_STATUS_COLORS[table.status],
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                  {hasActiveOrder && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Active Orders: {tableOrders.length}
                      </Typography>
                      {tableOrders.map((order) => (
                        <Box key={order.id} sx={{ mt: 1 }}>
                          <Chip
                            label={`#${order.order_number} - ${STATUS_LABELS[order.status]}`}
                            size="small"
                            sx={{
                              bgcolor: STATUS_COLORS[order.status] + '20',
                              color: STATUS_COLORS[order.status],
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderNotifications = () => {
    if (!notifications.length) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You will see updates here when orders are ready or tables change.
          </Typography>
        </Box>
      );
    }

    return (
      <Paper variant="outlined" sx={{ bgcolor: '#fff' }}>
        <List sx={{ py: 0 }}>
          {notifications.map((n) => (
            <Fragment key={n.id}>
              <ListItemButton
                onClick={() => {
                  if (!n.read) void handleMarkNotificationRead(n.id);
                }}
                sx={{
                  alignItems: 'flex-start',
                  bgcolor: n.read ? 'transparent' : 'rgba(255, 107, 53, 0.06)',
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={{ fontWeight: n.read ? 600 : 800, color: '#111' }}>
                        {n.title}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                  secondary={<Typography sx={{ color: '#666', mt: 0.5 }}>{n.message}</Typography>}
                />
              </ListItemButton>
              <Divider />
            </Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  const renderProfile = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar
              src={profile?.profileImage}
              sx={{ width: 80, height: 80, bgcolor: COLORS.primary }}
            >
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {profile?.displayName || profile?.name || 'Waiter'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.email}
              </Typography>
              <Chip
                label={getBranchDisplayName()}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1">
                {profile?.phone || 'Not set'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Role
              </Typography>
              <Typography variant="body1">Waiter</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditProfileDialogOpen(true)}
          >
            Edit Profile
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCreateOrder = () => {
    return (
      <Box>
        {tables.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No tables assigned. Please ask admin/manager to assign tables.
          </Alert>
        ) : null}

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Details</Typography>

              <FormControl
                fullWidth
                size="small"
                sx={{
                  mb: 2,
                  '& .MuiInputLabel-root': { color: COLORS.primary, fontWeight: 800 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primaryLight },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primaryLight },
                }}
                disabled={tables.length === 0 || creatingOrder}
              >
                <InputLabel>Table</InputLabel>
                <Select label="Table" value={createTableId} onChange={(e) => setCreateTableId(String(e.target.value))}>
                  {tables.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      Table {t.table_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Customer Name (optional)"
                value={createCustomerName}
                onChange={(e) => setCreateCustomerName(e.target.value)}
                sx={{ mb: 2 }}
                disabled={creatingOrder}
              />
              <TextField
                fullWidth
                size="small"
                label="Phone (optional)"
                value={createPhoneNumber}
                onChange={(e) => setCreatePhoneNumber(e.target.value)}
                sx={{ mb: 2 }}
                disabled={creatingOrder}
              />

              <Typography sx={{ fontWeight: 900, mb: 1, mt: 1 }}>Cart</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fff' }}>
                {cartItems.length === 0 ? (
                  <Typography color="text.secondary">No items added yet.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {cartItems.map((item) => (
                      <Box
                        key={item.productId}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 800, color: '#111' }} noWrap>
                            {item.name}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#666' }}>
                            {money(item.price)} x {item.quantity} = {money(item.price * item.quantity)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateCartQty(item.productId, -1)}
                            disabled={creatingOrder}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ width: 22, textAlign: 'center', fontWeight: 900 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateCartQty(item.productId, 1)}
                            disabled={creatingOrder}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 900 }}>Total</Typography>
                      <Typography sx={{ fontWeight: 900, color: COLORS.primary }}>
                        {money(cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0))}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>Menu Items</Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 1,
                  mb: 1.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
                }}
              >
                <Chip
                  clickable
                  label="All"
                  onClick={() => setSelectedMenuCategoryId('all')}
                  variant={selectedMenuCategoryId === 'all' ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: COLORS.primary,
                    bgcolor: selectedMenuCategoryId === 'all' ? 'rgba(245, 124, 0, 0.14)' : 'transparent',
                    color: COLORS.primary,
                    fontWeight: 800,
                  }}
                />
                {menuCategories.map((c) => (
                  <Chip
                    key={c.id}
                    clickable
                    label={c.name}
                    onClick={() => setSelectedMenuCategoryId(c.id)}
                    variant={selectedMenuCategoryId === c.id ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: COLORS.primary,
                      bgcolor: selectedMenuCategoryId === c.id ? 'rgba(245, 124, 0, 0.14)' : 'transparent',
                      color: COLORS.primary,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  />
                ))}
              </Box>

              <TextField
                fullWidth
                size="small"
                placeholder="Search items..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                disabled={menuLoading || creatingOrder}
                sx={{ mb: 2 }}
              />

              <Paper variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff', p: 1.5, minHeight: 240 }}>
                {menuLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(menuProducts
                      .filter((p) => {
                        if (selectedMenuCategoryId !== 'all' && String(p.categoryId) !== String(selectedMenuCategoryId)) return false;
                        const q = menuSearch.trim().toLowerCase();
                        if (!q) return true;
                        return p.name.toLowerCase().includes(q);
                      })
                      .slice(0, 40)
                    ).map((p) => (
                      <Box
                        key={p.id}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900, color: '#111' }} noWrap>
                            {p.name}
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: '#666' }}>{money(p.price)}</Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => addToCart(p)}
                          disabled={creatingOrder}
                          sx={{ borderColor: COLORS.primary, color: COLORS.primary, '&:hover': { borderColor: COLORS.primaryLight } }}
                        >
                          Add
                        </Button>
                      </Box>
                    ))}
                    {menuProducts.length === 0 && !menuLoading ? (
                      <Typography color="text.secondary">No menu items found.</Typography>
                    ) : null}
                  </Box>
                )}
              </Paper>

              <TextField
                fullWidth
                size="small"
                label="Special instructions (optional)"
                value={createSpecialInstructions}
                onChange={(e) => setCreateSpecialInstructions(e.target.value)}
                disabled={creatingOrder}
                multiline
                minRows={2}
                sx={{ mt: 2 }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  return (
    <Box className="waiter-dashboard" sx={{ width: '100%', boxSizing: 'border-box', px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: COLORS.primary }}>
            <DiningIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {activeTab === 0 && createOrderOpen
                ? 'Add Order'
                : activeTab === 0
                ? 'Orders'
                : activeTab === 1
                ? 'Tables'
                : activeTab === 2
                ? 'Notifications'
                : 'Profile'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getBranchDisplayName()}
            </Typography>
          </Box>
        </Box>
        {activeTab === 0 && createOrderOpen ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setCreateOrderOpen(false)} disabled={creatingOrder}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => void createOrder()}
              disabled={creatingOrder || cartItems.length === 0 || !createTableId}
              sx={{ bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.primaryLight } }}
            >
              {creatingOrder ? 'Creating...' : 'Create Order'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeTab === 0 ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateOrder}
                sx={{ bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.primaryLight } }}
              >
                Add Order
              </Button>
            ) : null}
            {activeTab === 2 ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => void handleClearAllNotifications()}
                  disabled={notifications.length === 0}
                  color="error"
                >
                  Clear All
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void handleMarkAllNotificationsRead()}
                  disabled={unreadCount === 0}
                  sx={{ bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.primaryLight } }}
                >
                  Mark All Read
                </Button>
              </>
            ) : (
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                Refresh
              </Button>
            )}
          </Box>
        )}
      </Box>

      {renderStats()}

      <Tabs value={activeTab} onChange={(_, newValue) => navigateToTab(newValue)} sx={{ mb: 3, bgcolor: '#fff', borderRadius: 1 }} variant="fullWidth">
        <Tab icon={<DiningIcon />} label={`Orders (${getActiveOrders().length})`} iconPosition="start" />
        <Tab icon={<TableIcon />} label={`Tables (${tables.length})`} iconPosition="start" />
        <Tab
          icon={
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          }
          label="Notifications"
          iconPosition="start"
        />
        <Tab icon={<PersonIcon />} label="Profile" iconPosition="start" />
      </Tabs>

      {activeTab === 0 && (createOrderOpen ? renderCreateOrder() : renderOrders())}
      {activeTab === 1 && renderTables()}
      {activeTab === 2 && renderNotifications()}
      {activeTab === 3 && renderProfile()}

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar src={profile?.profileImage} sx={{ width: 80, height: 80, bgcolor: COLORS.primary }}>
                <PersonIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {profile?.displayName || profile?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile?.email}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{profile?.phone || 'Not set'}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">Branch</Typography>
                <Typography variant="body1">{getBranchDisplayName()}</Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setProfileDialogOpen(false); setEditProfileDialogOpen(true); }}>
            Edit Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onClose={() => setEditProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <TextField
              fullWidth
              label="Display Name"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateProfile}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsDialogOpen} onClose={() => setOrderDetailsDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Order Details #{selectedOrder?.order_number}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ py: 2 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Table</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.table_number || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={STATUS_LABELS[selectedOrder.status]}
                    size="small"
                    sx={{
                      bgcolor: STATUS_COLORS[selectedOrder.status] + '20',
                      color: STATUS_COLORS[selectedOrder.status],
                      fontWeight: 'bold',
                    }}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Items:</Typography>
              {selectedOrder.items.map((item) => (
                <Box key={item.id} sx={{ py: 1, borderBottom: `1px solid ${COLORS.border}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {item.quantity}x {item.product_name}
                      {item.size_name && ` (${item.size_name})`}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {price(item.total_price)}
                    </Typography>
                  </Box>
                  <Chip
                    label={item.status}
                    size="small"
                    sx={{
                      mt: 0.5,
                      bgcolor: STATUS_COLORS[item.status] + '20',
                      color: STATUS_COLORS[item.status],
                      fontSize: '10px',
                    }}
                  />
                </Box>
              ))}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.primary }}>
                  {price(selectedOrder.total_amount)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsDialogOpen(false)}>Close</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => selectedOrder && handlePrintBill(selectedOrder)}>
            Print Bill
          </Button>
          {selectedOrder?.status === 'READY' && (
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={() => {
                handleServeOrder(selectedOrder.id);
                setOrderDetailsDialogOpen(false);
              }}
              sx={{ bgcolor: COLORS.success }}
            >
              Mark Served
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to cancel order #{selectedOrder?.order_number}?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Cancellation Reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCancelDialogOpen(false); setCancelReason(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={!cancelReason.trim()}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
