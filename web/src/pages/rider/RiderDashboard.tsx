import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Call,
  CheckCircle,
  Close,
  DeliveryDining,
  Directions,
  History,
  Inbox,
  LocalShipping,
  LocationOn,
  NotificationsNone,
  Paid,
  Person,
  PlayArrow,
  Refresh,
  Restaurant,
  Schedule,
  ShowChart,
  TrendingUp,
  TwoWheeler,
  CalendarMonth,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { emitRiderDashboardGet, getRealtimeSocket } from '../../hooks/useRealtimeRefresh';
import { fetchRiderDashboardHttp } from '../../utils/dashboardHttp';

type RiderTabKey = 'home' | 'orders' | 'earnings' | 'notifications' | 'profile';

interface RiderProfile {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  avatar?: string;
  image?: string;
  profileImage?: string;
  onDuty?: boolean;
  assignedBranch?: { _id?: string; branchName?: string; name?: string };
  branch?: { _id?: string; branchName?: string; name?: string };
}

interface RiderStats {
  assignedDeliveries: number;
  completedDeliveries: number;
  todayEarnings: number;
  thisWeekEarnings: number;
}

interface RiderEarnings {
  totalEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface RiderNotification {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  created_at?: string;
  data?: any;
}

interface RiderOrder {
  _id: string;
  orderNumber: string;
  status: string;
  orderType?: string;
  totalAmount: number;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  restaurantName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupCoords?: { latitude: number; longitude: number };
  deliveryCoords?: { latitude: number; longitude: number };
  items: string[];
  raw: any;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatDateTime = (value?: string): string => {
  const v = String(value || '').trim();
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString();
  } catch {
    return d.toISOString();
  }
};

const extractCoords = (maybe: any): { latitude?: number; longitude?: number } => {
  if (!maybe) return {};
  const lat = toNumber(maybe?.latitude ?? maybe?.lat, NaN);
  const lng = toNumber(maybe?.longitude ?? maybe?.lng, NaN);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
  if (Array.isArray(maybe?.coordinates) && maybe.coordinates.length >= 2) {
    const longitude = toNumber(maybe.coordinates[0], NaN);
    const latitude = toNumber(maybe.coordinates[1], NaN);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
  }
  return {};
};

const normalizeOrder = (raw: any): RiderOrder => {
  const id = String(raw?._id || raw?.id || '').trim();
  const orderNumber = String(raw?.orderNumber || raw?.order_number || `ORD-${id.slice(-6)}`).trim();
  const status = String(raw?.status || '').trim().toUpperCase();
  const orderType = String(raw?.orderType || raw?.order_type || '').trim().toUpperCase();
  const customerName = String(raw?.customer?.displayName || raw?.customer?.name || raw?.customerName || '').trim();
  const customerPhone = String(raw?.customer?.phoneNumber || raw?.customerPhone || raw?.phoneNumber || '').trim();
  const restaurantName = String(raw?.branch?.branchName || raw?.branch?.name || raw?.restaurantName || '').trim();
  const pickupAddress = String(raw?.branch?.addressLine || raw?.branch?.address || raw?.pickupAddress || '').trim();

  const deliveryAddress =
    String(raw?.deliveryAddress?.street || raw?.deliveryAddress?.address || raw?.addressLine || raw?.delivery_address || '').trim() ||
    String(raw?.deliveryLocationText || '').trim();

  const branchCoords = extractCoords(raw?.branch?.location);
  const pickupCoords = branchCoords.latitude && branchCoords.longitude ? { latitude: branchCoords.latitude, longitude: branchCoords.longitude } : undefined;
  const deliveryCoordsRaw = extractCoords(raw?.deliveryLocation || raw?.delivery_location);
  const deliveryCoords =
    deliveryCoordsRaw.latitude && deliveryCoordsRaw.longitude ? { latitude: deliveryCoordsRaw.latitude, longitude: deliveryCoordsRaw.longitude } : undefined;

  const itemsRaw = Array.isArray(raw?.items) ? raw.items : [];
  const items = itemsRaw
    .map((it: any) => String(it?.product?.name || it?.product_name || it?.name || '').trim())
    .filter(Boolean);

  const totalAmount = toNumber(raw?.totalAmount ?? raw?.total_amount ?? raw?.total, 0);
  const createdAt = String(raw?.createdAt || raw?.created_at || '').trim();

  return {
    _id: id,
    orderNumber,
    status,
    orderType,
    totalAmount,
    createdAt,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
    restaurantName: restaurantName || undefined,
    pickupAddress: pickupAddress || undefined,
    deliveryAddress: deliveryAddress || undefined,
    pickupCoords,
    deliveryCoords,
    items,
    raw,
  };
};

const normalizeOrders = (rawList: any): RiderOrder[] => {
  const list = Array.isArray(rawList) ? rawList : [];
  return list.map(normalizeOrder).filter((o) => !!o._id);
};

const PAGE_BG = '#f8f5ff';
const ACCENT = '#FF6B35';
const ACCENT_SOFT = '#FFF3EE';
const ACCENT_BORDER = '#FFE0D0';
const ACCENT_MID = '#FF8E53';
const ACCENT_LIGHT = '#FFB74D';
const TEXT_PRIMARY = '#1a1a2e';

const STATUS_COLORS: Record<string, string> = {
  READY: '#FF6B35',
  RIDER_ASSIGNED: '#1976d2',
  OUT_FOR_DELIVERY: '#6a1b9a',
  IN_DELIVERY: '#6a1b9a',
  PICKED_UP: '#6a1b9a',
  DELIVERED: '#2e7d32',
  COMPLETED: '#2e7d32',
  CANCELLED: '#d32f2f',
};

const formatStatusLabel = (status: string) =>
  String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

type HomeMetricTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent?: string;
};

function HomeMetricTile({ label, value, hint, icon, accent = ACCENT }: HomeMetricTileProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 2.5,
        bgcolor: '#fff',
        border: `1px solid ${ACCENT_BORDER}`,
        boxShadow: '0 6px 20px rgba(255, 107, 53, 0.07)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#888', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 900, color: TEXT_PRIMARY, lineHeight: 1.1, mt: 0.6 }}>
            {value}
          </Typography>
          {hint ? (
            <Typography sx={{ fontSize: 12, color: '#666', fontWeight: 600, mt: 0.4 }}>{hint}</Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: `${accent}12`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

type EmptyPanelProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
};

type EarningsMetricTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
  trend?: { label: string; positive: boolean };
};

function EarningsMetricTile({ label, value, hint, icon, accent, trend }: EarningsMetricTileProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 3,
        bgcolor: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 24px rgba(26, 26, 46, 0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          bgcolor: accent,
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#888', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 900, color: '#111', mt: 0.75, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {hint ? (
            <Typography sx={{ fontSize: 12, color: '#666', fontWeight: 600, mt: 0.5 }}>{hint}</Typography>
          ) : null}
          {trend ? (
            <Chip
              size="small"
              icon={<TrendingUp sx={{ fontSize: 14, transform: trend.positive ? 'none' : 'rotate(180deg)' }} />}
              label={trend.label}
              sx={{
                mt: 1,
                height: 22,
                fontWeight: 700,
                fontSize: 11,
                bgcolor: ACCENT_SOFT,
                color: trend.positive ? '#c43e00' : '#8a4a00',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          ) : null}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            bgcolor: `${accent}14`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

function EmptyPanel({ title, description, icon, action }: EmptyPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: '#fff',
        border: '1px dashed rgba(255, 107, 53, 0.35)',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: ACCENT, opacity: 0.85, mb: 1.5 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 16 }}>{title}</Typography>
      <Typography sx={{ color: '#666', fontWeight: 600, fontSize: 13, mt: 0.75, maxWidth: 360, mx: 'auto' }}>
        {description}
      </Typography>
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Paper>
  );
}

export default function RiderDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formatPrice } = useSettings();

  const [activeTab, setActiveTab] = useState<RiderTabKey>('home');
  const [ordersView, setOrdersView] = useState<'available' | 'active' | 'history'>('available');
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'unavailable' | 'denied' | 'error'>('idle');
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const [stats, setStats] = useState<RiderStats>({
    assignedDeliveries: 0,
    completedDeliveries: 0,
    todayEarnings: 0,
    thisWeekEarnings: 0,
  });
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earnings, setEarnings] = useState<RiderEarnings>({
    totalEarnings: 0,
    thisWeekEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
  });

  const [availableOrders, setAvailableOrders] = useState<RiderOrder[]>([]);
  const [myOrders, setMyOrders] = useState<RiderOrder[]>([]);

  const [notifications, setNotifications] = useState<RiderNotification[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<RiderOrder | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const rejectingOrderIdRef = useRef<string | null>(null);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const tabKeyFromPath = useMemo<RiderTabKey>(() => {
    const path = String(location.pathname || '');
    if (path.startsWith('/rider/orders')) return 'orders';
    if (path.startsWith('/rider/earnings')) return 'earnings';
    if (path.startsWith('/rider/notifications')) return 'notifications';
    if (path.startsWith('/rider/profile')) return 'profile';
    return 'home';
  }, [location.pathname]);

  useEffect(() => {
    setActiveTab(tabKeyFromPath);
  }, [tabKeyFromPath]);

  useEffect(() => {
    const path = String(location.pathname || '');
    if (path === '/rider' || path === '/rider/') {
      navigate('/rider/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = (next: RiderTabKey) => {
    const path =
      next === 'home'
        ? '/rider/home'
        : next === 'orders'
        ? '/rider/orders'
        : next === 'earnings'
        ? '/rider/earnings'
        : next === 'notifications'
        ? '/rider/notifications'
        : '/rider/profile';
    if (location.pathname !== path) navigate(path);
  };

  const patchStoredUser = useCallback((patch: Record<string, unknown>) => {
    const raw = localStorage.getItem('userData');
    let current: any = {};
    if (raw) {
      try {
        current = JSON.parse(raw) || {};
      } catch {
        current = {};
      }
    }
    const next = { ...current, ...patch };
    localStorage.setItem('userData', JSON.stringify(next));
    window.dispatchEvent(new Event('profileUpdated'));
    window.dispatchEvent(new Event('userDataUpdated'));
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await api.get<any>('/users/profile');
    if (!res?.success) return;
    const data = res.data || {};
    setProfile(data);
    const name = String(data?.displayName || data?.name || '').trim();
    const phone = String(data?.phoneNumber || data?.phone || '').trim();
    setEditName(name);
    setEditPhone(phone);

    const rawImage = String(data?.profileImage || data?.avatar || data?.image || '').trim();
    patchStoredUser({
      name: data?.displayName || data?.name,
      displayName: data?.displayName || data?.name,
      email: data?.email,
      phoneNumber: data?.phoneNumber || data?.phone,
      phone: data?.phone || data?.phoneNumber,
      avatar: rawImage,
      image: rawImage,
      profileImage: rawImage,
    });
  }, [patchStoredUser]);

  const loadRiderStatus = useCallback(async () => {
    const res = await api.get<any>('/users/rider/status');
    if (!res?.success) return;
    setOnDuty(Boolean(res?.data?.onDuty));
  }, []);

  const loadNotifications = useCallback(async () => {
    const listRes = await api.get<any>('/notifications/rider');

    if (listRes?.success) {
      const list = listRes?.data?.notifications || listRes?.data || [];
      const normalized = (Array.isArray(list) ? list : []).map((n: any) => {
        const id = String(n?._id || n?.id || '').trim();
        const read = Boolean(n?.read ?? n?.isRead ?? n?.is_read ?? false);
        return { ...n, id, read };
      });
      setNotifications(normalized);
    }
  }, []);

  const toggleDuty = async (nextOnDuty: boolean) => {
    setLoading(true);
    try {
      const res = await api.put<any>('/users/rider/duty', { onDuty: nextOnDuty });
      if (res?.success) {
        setOnDuty(nextOnDuty);
      } else {
        setToast({ open: true, message: String(res?.error || res?.message || 'Failed to update duty status') });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = useCallback(async () => {
    if (!onDuty) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    const result = await new Promise<
      | { ok: true; coords: { latitude: number; longitude: number } }
      | { ok: false; reason: 'denied' | 'error' }
    >((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ ok: true, coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
        },
        (err) => {
          const denied = (err as any)?.code === 1;
          resolve({ ok: false, reason: denied ? 'denied' : 'error' });
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    });

    if (!result.ok) {
      setGeoStatus(result.reason === 'denied' ? 'denied' : 'error');
      return;
    }

    const coords = result.coords;
    const res = await api.put<any>('/users/rider/location', { longitude: coords.longitude, latitude: coords.latitude });
    if (res?.success) {
      setGeoStatus('ok');
      return;
    }

    setGeoStatus('error');
  }, [onDuty]);

  const applyRiderPayload = useCallback(
    (payload: any) => {
      const statsData = payload?.stats || {};
      setStats({
        assignedDeliveries: toNumber(statsData.assignedDeliveries, 0),
        completedDeliveries: toNumber(statsData.completedDeliveries, 0),
        todayEarnings: toNumber(statsData.todayEarnings, 0),
        thisWeekEarnings: toNumber(statsData.thisWeekEarnings, 0),
      });

      const earningsData = payload?.earnings || {};
      setEarnings({
        totalEarnings: toNumber(earningsData.totalEarnings, 0),
        thisWeekEarnings: toNumber(earningsData.thisWeekEarnings, 0),
        thisMonthEarnings: toNumber(earningsData.thisMonthEarnings, 0),
        lastMonthEarnings: toNumber(earningsData.lastMonthEarnings, 0),
      });

      if (Array.isArray(payload?.orders)) {
        const normalized = normalizeOrders(payload.orders);
        setMyOrders(normalized);
        const activeStatuses = new Set(['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_DELIVERY', 'ASSIGNED', 'IN_DELIVERY']);
        const active = normalized.filter((o) => activeStatuses.has(String(o.status || '').toUpperCase()));
        if (active.length > 0) {
          // keep myOrders as full list
        }
      }

      if (Array.isArray(payload?.availableOrders)) {
        setAvailableOrders(normalizeOrders(payload.availableOrders));
      }

      if (Array.isArray(payload?.notifications)) {
        const normalized = payload.notifications.map((n: any) => {
          const id = String(n?._id || n?.id || '').trim();
          const read = Boolean(n?.read ?? n?.isRead ?? n?.is_read ?? false);
          return { ...n, id, read };
        });
        setNotifications(normalized);
      }

      if (typeof payload?.onDuty === 'boolean') {
        setOnDuty(payload.onDuty);
      }

      setLoading(false);
      setEarningsLoading(false);
    },
    []
  );

  const loadRiderDashboardHttp = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchRiderDashboardHttp();
      if (payload) applyRiderPayload(payload);
    } catch {
      setToast({ open: true, message: 'Failed to load dashboard data' });
      setLoading(false);
      setEarningsLoading(false);
    }
  }, [applyRiderPayload]);

  const requestRiderDashboard = useCallback(() => {
    const socket = getRealtimeSocket();
    setLoading(true);
    if (socket.connected) emitRiderDashboardGet();
    else void loadRiderDashboardHttp();
  }, [loadRiderDashboardHttp]);

  const refreshEarnings = useCallback(() => {
    setEarningsLoading(true);
    requestRiderDashboard();
  }, [requestRiderDashboard]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([loadProfile(), loadRiderStatus()]);
        if (!cancelled) requestRiderDashboard();
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, loadRiderStatus, requestRiderDashboard]);

  useEffect(() => {
    const socket = getRealtimeSocket();

    const refresh = () => {
      if (socket.connected) {
        setLoading(true);
        emitRiderDashboardGet();
      } else {
        void loadRiderDashboardHttp();
      }
    };

    socket.on('connect', refresh);
    socket.on('rider_dashboard:data', applyRiderPayload);
    socket.on('rider_dashboard:error', () => void loadRiderDashboardHttp());
    socket.on('connect_error', () => void loadRiderDashboardHttp());
    socket.on('rider_dashboard:invalidate', refresh);
    socket.on('order:created', refresh);
    socket.on('order:updated', refresh);
    socket.on('order:status_updated', refresh);
    socket.on('order:assigned', refresh);
    socket.on('notification', refresh);

    return () => {
      socket.off('connect', refresh);
      socket.off('rider_dashboard:data', applyRiderPayload);
      socket.off('rider_dashboard:error');
      socket.off('connect_error');
      socket.off('rider_dashboard:invalidate', refresh);
      socket.off('order:created', refresh);
      socket.off('order:updated', refresh);
      socket.off('order:status_updated', refresh);
      socket.off('order:assigned', refresh);
      socket.off('notification', refresh);
    };
  }, [applyRiderPayload, loadRiderDashboardHttp]);

  useEffect(() => {
    if (onDuty) {
      void updateLocation();
    }
  }, [onDuty, updateLocation]);

  useEffect(() => {
    if (activeTab !== 'earnings') return;
    void refreshEarnings();
  }, [activeTab, refreshEarnings]);

  const activeDeliveries = useMemo(() => {
    const activeStatuses = new Set(['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_DELIVERY']);
    return myOrders.filter((o) => activeStatuses.has(String(o.status || '').toUpperCase()));
  }, [myOrders]);

  const historyOrders = useMemo(() => {
    const done = new Set(['DELIVERED', 'COMPLETED', 'CANCELLED']);
    return myOrders.filter((o) => done.has(String(o.status || '').toUpperCase()));
  }, [myOrders]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !(n as any).read && !(n as any).isRead).length,
    [notifications]
  );

  const openMaps = (opts?: { coords?: { latitude: number; longitude: number }; address?: string }) => {
    const latitude = opts?.coords?.latitude;
    const longitude = opts?.coords?.longitude;
    const address = String(opts?.address || '').trim();
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude);
    const destination = hasCoords ? `${latitude},${longitude}` : address;
    if (!destination) {
      setToast({ open: true, message: 'Location is not available for this order' });
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const callCustomer = (phone?: string) => {
    const p = String(phone || '').trim();
    if (!p) return;
    window.open(`tel:${encodeURIComponent(p)}`, '_self');
  };

  const handleAccept = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await api.put<any>(`/orders/${orderId}/accept`);
      if (res?.success) {
        requestRiderDashboard();
        navigateToTab('home');
      } else {
        setToast({ open: true, message: String(res?.error || res?.message || 'Failed to accept order') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await api.put<any>(`/orders/${orderId}/deliver`, { status: 'OUT_FOR_DELIVERY' });
      if (res?.success) {
        requestRiderDashboard();
      } else {
        setToast({ open: true, message: String(res?.error || res?.message || 'Failed to start ride') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelivered = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await api.put<any>(`/orders/${orderId}/deliver`, { status: 'DELIVERED' });
      if (res?.success) {
        requestRiderDashboard();
      } else {
        setToast({ open: true, message: String(res?.error || res?.message || 'Failed to mark as delivered') });
      }
    } finally {
      setLoading(false);
    }
  };

  const promptReject = (orderId: string) => {
    rejectingOrderIdRef.current = orderId;
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    const orderId = rejectingOrderIdRef.current;
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await api.put<any>(`/orders/${orderId}/reject`, { reason: rejectReason || 'Rider rejected the order' });
      if (res?.success) {
        setRejectDialogOpen(false);
        rejectingOrderIdRef.current = null;
        requestRiderDashboard();
      } else {
        setToast({ open: true, message: String(res?.error || res?.message || 'Failed to reject order') });
      }
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetails = (order: RiderOrder) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const markNotificationRead = async (notif: RiderNotification) => {
    const id = String((notif as any)?._id || (notif as any)?.id || '').trim();
    if (!id) return;
    setNotifications((prev) => prev.map((n: any) => (String(n?._id || n?.id || '').trim() === id ? { ...n, read: true, isRead: true } : n)));
    try {
      const resPatch: any = await api.patch(`/notifications/${id}/read`).catch(() => null);
      if (!resPatch?.success) {
        const resPut: any = await api.put(`/notifications/${id}/read`).catch(() => null);
        if (!resPut?.success) {
          throw new Error(String(resPut?.message || resPut?.error || 'Failed to mark as read'));
        }
      }
      await loadNotifications();
    } catch (e: any) {
      setToast({ open: true, message: String(e?.message || 'Failed to mark as read') });
      await loadNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n: any) => ({ ...n, read: true, isRead: true })));
    try {
      const resPut: any = await api.put('/notifications/mark-all-read').catch(() => null);
      if (!resPut?.success) {
        const resPatch: any = await api.patch('/notifications/mark-all-read').catch(() => null);
        if (!resPatch?.success) {
          throw new Error(String(resPatch?.message || resPatch?.error || 'Failed to mark all as read'));
        }
      }
      await loadNotifications();
    } catch (e: any) {
      setToast({ open: true, message: String(e?.message || 'Failed to mark all as read') });
      await loadNotifications();
    }
  };

  const clearAllNotifications = async () => {
    const prev = notifications;
    setNotifications([]);
    try {
      const res: any = await api.delete('/notifications').catch(() => null);
      if (!res?.success) {
        throw new Error(String(res?.message || res?.error || 'Failed to clear notifications'));
      }
      setToast({ open: true, message: 'All notifications cleared' });
      await loadNotifications();
    } catch (e: any) {
      setToast({ open: true, message: String(e?.message || 'Failed to clear notifications') });
      setNotifications(prev);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await api.patch<any>('/users/profile', { name: editName, phone: editPhone });
      if (res?.success) {
        await loadProfile();
        setEditProfileOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    setLoading(true);
    try {
      const res = await api.put<any>('/users/change-password', { currentPassword, newPassword });
      if (res?.success) {
        setChangePasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    const toBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(f);
      });

    setLoading(true);
    try {
      const base64 = await toBase64(file);
      const uploadRes: any = await api.uploadImage(base64, file.name);
      const url = uploadRes?.data?.imageUrl || uploadRes?.data?.url || uploadRes?.data?.path || '';
      const nextUrl = String(url || '').trim();
      if (uploadRes?.success && nextUrl) {
        const res = await api.patch<any>('/users/profile', { avatar: nextUrl, image: nextUrl, profileImage: nextUrl });
        if (res?.success) {
          await loadProfile();
        }
      }
    } finally {
      setLoading(false);
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

  const riderName = String(profile?.displayName || profile?.name || 'Rider').trim();
  const greetingName = riderName.split(/\s+/)[0] || 'Rider';
  const riderEmail = String(profile?.email || '').trim();
  const riderPhone = String(profile?.phoneNumber || profile?.phone || '').trim();
  const avatarSrc = String(profile?.profileImage || profile?.avatar || profile?.image || '').trim();

  const renderStatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HomeMetricTile
          label="In progress"
          value={String(stats.assignedDeliveries)}
          hint={`${stats.completedDeliveries} completed`}
          icon={<DeliveryDining sx={{ fontSize: 22 }} />}
          accent={ACCENT}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HomeMetricTile
          label="Today"
          value={formatPrice(toNumber(stats.todayEarnings, 0))}
          hint="Delivery fees earned"
          icon={<Paid sx={{ fontSize: 22 }} />}
          accent={ACCENT_MID}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HomeMetricTile
          label="This week"
          value={formatPrice(toNumber(stats.thisWeekEarnings, 0))}
          hint="7-day total"
          icon={<Schedule sx={{ fontSize: 22 }} />}
          accent={ACCENT_LIGHT}
        />
      </Grid>
    </Grid>
  );

  const renderPageHeader = (
    title: string,
    opts?: { subtitle?: string; onRefresh?: () => void; actions?: React.ReactNode }
  ) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
      <Box>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 900, color: '#111', letterSpacing: -0.3 }}>
          {title}
        </Typography>
        {opts?.subtitle ? (
          <Typography sx={{ color: '#666', fontWeight: 600, fontSize: 13, mt: 0.35 }}>{opts.subtitle}</Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {opts?.onRefresh ? (
          <Tooltip title="Refresh">
            <IconButton
              onClick={opts.onRefresh}
              disabled={loading}
              sx={{ bgcolor: '#fff', border: '1px solid #eee', '&:hover': { bgcolor: '#FFF3EE' } }}
            >
              {loading ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        ) : null}
        {opts?.actions}
      </Box>
    </Box>
  );

  const renderOrderCard = (order: RiderOrder, mode: 'active' | 'available' | 'history') => {
    const color = STATUS_COLORS[order.status] || '#666';
    const isAssigned = order.status === 'RIDER_ASSIGNED';
    const isOut = order.status === 'OUT_FOR_DELIVERY' || order.status === 'IN_DELIVERY' || order.status === 'PICKED_UP';
    const btnSx = { textTransform: 'none', fontWeight: 800, borderRadius: 2 };
    return (
      <Paper
        key={order._id}
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: '#fff',
          cursor: 'pointer',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 16px rgba(20, 20, 40, 0.06)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(20, 20, 40, 0.1)' },
        }}
        onClick={() => openOrderDetails(order)}
      >
        <Box sx={{ display: 'flex', minHeight: '100%' }}>
          <Box sx={{ width: 5, bgcolor: color, flexShrink: 0 }} />
          <Box sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 17 }}>#{order.orderNumber}</Typography>
                {order.createdAt ? (
                  <Typography sx={{ color: '#999', fontSize: 11, fontWeight: 600, mt: 0.25 }}>
                    {formatDateTime(order.createdAt)}
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Chip
                  label={formatStatusLabel(order.status)}
                  size="small"
                  sx={{ bgcolor: `${color}18`, color, fontWeight: 800, fontSize: 11, height: 24 }}
                />
                <Typography sx={{ fontWeight: 900, color: ACCENT, fontSize: 16, mt: 0.75 }}>
                  {formatPrice(toNumber(order.totalAmount, 0))}
                </Typography>
              </Box>
            </Box>

            <Stack spacing={0.75} sx={{ mt: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Restaurant sx={{ fontSize: 16, color: ACCENT, mt: 0.15 }} />
                <Typography sx={{ color: '#444', fontSize: 13, fontWeight: 600 }}>
                  {order.restaurantName || 'Pickup location'}
                  {order.pickupAddress ? ` — ${order.pickupAddress}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOn sx={{ fontSize: 16, color: ACCENT_MID, mt: 0.15 }} />
                <Typography sx={{ color: '#444', fontSize: 13, fontWeight: 600 }}>
                  {order.deliveryAddress || 'Delivery address pending'}
                </Typography>
              </Box>
              {(order.customerName || order.customerPhone) ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ fontSize: 16, color: '#666' }} />
                  <Typography sx={{ color: '#666', fontSize: 13, fontWeight: 600 }}>
                    {order.customerName || 'Customer'}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                  </Typography>
                </Box>
              ) : null}
            </Stack>

            {order.items.length ? (
              <Typography sx={{ mt: 1, color: '#888', fontSize: 12, fontWeight: 600 }}>
                {order.items.slice(0, 3).join(' · ')}
                {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
              </Typography>
            ) : null}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.75 }} onClick={(e) => e.stopPropagation()}>
          {mode === 'available' ? (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckCircle />}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAccept(order._id);
                }}
                sx={{ ...btnSx, bgcolor: ACCENT, '&:hover': { bgcolor: '#e55a2b' } }}
                disabled={loading}
              >
                Accept
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Close />}
                onClick={(e) => {
                  e.stopPropagation();
                  promptReject(order._id);
                }}
                sx={btnSx}
                disabled={loading}
              >
                Reject
              </Button>
            </>
          ) : null}

          {mode === 'active' ? (
            <>
              {isAssigned ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrow />}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStartRide(order._id);
                  }}
                  sx={{ ...btnSx, bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                  disabled={loading}
                >
                  Start Ride
                </Button>
              ) : null}
              {isOut ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircle />}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelivered(order._id);
                  }}
                  sx={{ ...btnSx, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                  disabled={loading}
                >
                  Delivered
                </Button>
              ) : null}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Call />}
                onClick={(e) => {
                  e.stopPropagation();
                  callCustomer(order.customerPhone);
                }}
                sx={btnSx}
              >
                Call
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Directions />}
                onClick={(e) => {
                  e.stopPropagation();
                  openMaps({ coords: order.pickupCoords, address: order.pickupAddress || order.restaurantName });
                }}
                sx={btnSx}
              >
                Pickup
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Directions />}
                onClick={(e) => {
                  e.stopPropagation();
                  openMaps({ coords: order.deliveryCoords, address: order.deliveryAddress });
                }}
                sx={btnSx}
              >
                Deliver
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Close />}
                onClick={(e) => {
                  e.stopPropagation();
                  promptReject(order._id);
                }}
                sx={btnSx}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          ) : null}
              {mode === 'history' ? (
                <Button
                  size="small"
                  variant="outlined"
                  sx={btnSx}
                  onClick={(e) => {
                    e.stopPropagation();
                    openOrderDetails(order);
                  }}
                >
                  View details
                </Button>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderHome = () => (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 2.5,
          bgcolor: '#fff',
          border: `1px solid ${ACCENT_BORDER}`,
          boxShadow: '0 8px 28px rgba(255, 107, 53, 0.1)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_MID} 50%, ${ACCENT_LIGHT} 100%)`,
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            pt: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Avatar
              src={avatarSrc ? api.getImageUrl(avatarSrc) : undefined}
              sx={{
                width: 56,
                height: 56,
                bgcolor: ACCENT,
                border: `2px solid ${ACCENT_BORDER}`,
                fontWeight: 900,
                color: '#fff',
              }}
            >
              {greetingName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 900, letterSpacing: -0.3, color: TEXT_PRIMARY }}>
                Hello, {greetingName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <TwoWheeler sx={{ fontSize: 18, color: ACCENT }} />
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#666' }}>Delivery rider</Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1.15,
              borderRadius: 2.5,
              bgcolor: onDuty ? '#E8F5E9' : ACCENT_SOFT,
              border: `1px solid ${onDuty ? '#c8e6c9' : ACCENT_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: onDuty ? '#2e7d32' : ACCENT,
              }}
            />
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: onDuty ? '#1b5e20' : '#c43e00' }}>
              {onDuty ? 'On duty' : 'Off duty'}
            </Typography>
            <Switch
              checked={onDuty}
              onChange={(_, checked) => void toggleDuty(checked)}
              disabled={loading}
              color="success"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#2e7d32' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#81c784' },
              }}
            />
          </Box>
        </Box>
      </Paper>

      {onDuty && geoStatus !== 'ok' ? (
        <Alert severity={geoStatus === 'denied' ? 'warning' : 'info'} sx={{ mb: 2, borderRadius: 2 }}>
          {geoStatus === 'denied'
            ? 'Location permission is denied. Enable location to update your live rider position.'
            : geoStatus === 'unavailable'
            ? 'Geolocation is not available in this browser.'
            : 'Unable to update location right now.'}
        </Alert>
      ) : null}

      {renderStatsCards()}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 900, color: TEXT_PRIMARY, fontSize: 17 }}>Active deliveries</Typography>
        <Chip label={String(activeDeliveries.length)} size="small" sx={{ fontWeight: 800, bgcolor: ACCENT_SOFT, color: ACCENT }} />
      </Box>
      {activeDeliveries.length === 0 ? (
        <EmptyPanel
          title="No active deliveries"
          description={onDuty ? 'Check available orders when a new delivery is ready.' : 'Turn on duty to receive delivery requests.'}
          icon={<LocalShipping sx={{ fontSize: 48 }} />}
          action={
            <Button
              variant="contained"
              onClick={() => navigateToTab('orders')}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#e55a2b' }, fontWeight: 800, textTransform: 'none' }}
            >
              Browse orders
            </Button>
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {activeDeliveries.map((o) => renderOrderCard(o, 'active'))}
        </Stack>
      )}
    </Box>
  );

  const renderOrders = () => {
    const list =
      ordersView === 'available'
        ? availableOrders
        : ordersView === 'active'
        ? activeDeliveries
        : historyOrders;

    return (
      <Box>
        {renderPageHeader('Orders', {
          subtitle: onDuty ? 'Accept new deliveries and manage your runs' : 'Go on duty to see available orders',
          onRefresh: () => requestRiderDashboard(),
        })}

        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: '#fff', mb: 2, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
          <Tabs
            value={ordersView}
            onChange={(_, v) => setOrdersView(v)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', fontSize: 13 },
              '& .Mui-selected': { color: ACCENT },
              '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 3 },
            }}
          >
            <Tab label={`Available (${availableOrders.length})`} value="available" />
            <Tab label={`Active (${activeDeliveries.length})`} value="active" />
            <Tab label={`History (${historyOrders.length})`} value="history" />
          </Tabs>
        </Paper>

        {list.length === 0 ? (
          <EmptyPanel
            title={
              ordersView === 'available'
                ? 'No available orders'
                : ordersView === 'active'
                ? 'No active orders'
                : 'No order history'
            }
            description={
              ordersView === 'available'
                ? 'New delivery requests will appear here when restaurants mark orders ready.'
                : ordersView === 'active'
                ? 'Accepted orders in progress show up here.'
                : 'Completed deliveries will appear in your history.'
            }
            icon={<Inbox sx={{ fontSize: 48 }} />}
          />
        ) : (
          <Stack spacing={1.5}>
            {list.map((o) =>
              renderOrderCard(o, ordersView === 'available' ? 'available' : ordersView === 'active' ? 'active' : 'history')
            )}
          </Stack>
        )}
      </Box>
    );
  };

  const renderEarnings = () => {
    const total = toNumber(earnings.totalEarnings, 0);
    const today = toNumber(stats.todayEarnings, 0);
    const week = toNumber(earnings.thisWeekEarnings, toNumber(stats.thisWeekEarnings, 0));
    const month = toNumber(earnings.thisMonthEarnings, 0);
    const lastMonth = toNumber(earnings.lastMonthEarnings, 0);
    const completed = stats.completedDeliveries;
    const avgPerDelivery = completed > 0 ? total / completed : 0;
    const monthDelta = lastMonth > 0 ? ((month - lastMonth) / lastMonth) * 100 : month > 0 ? 100 : 0;
    const monthTrendPositive = month >= lastMonth;
    const maxPeriod = Math.max(week, month, lastMonth, 1);

    const periodBars = [
      { label: 'This week', amount: week, color: ACCENT },
      { label: 'This month', amount: month, color: ACCENT_MID },
      { label: 'Last month', amount: lastMonth, color: ACCENT_LIGHT },
    ];

    return (
      <Box sx={{ position: 'relative' }}>
        {renderPageHeader('Earnings', {
          subtitle: 'Payouts from completed deliveries',
          onRefresh: () => void refreshEarnings(),
        })}

        {earningsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
          </Box>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            borderRadius: 2.5,
            overflow: 'hidden',
            position: 'relative',
            bgcolor: '#fff',
            border: `1px solid ${ACCENT_BORDER}`,
            boxShadow: '0 10px 32px rgba(26, 26, 46, 0.06)',
            backgroundImage: `linear-gradient(165deg, #ffffff 0%, ${ACCENT_SOFT} 120%)`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${ACCENT}18 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_MID} 55%, ${ACCENT_LIGHT} 100%)`,
            }}
          />
          <Box sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: ACCENT_SOFT,
                  border: `1px solid ${ACCENT_BORDER}`,
                  color: ACCENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AccountBalanceWallet sx={{ fontSize: 22 }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 11, letterSpacing: 0.8, color: '#888', textTransform: 'uppercase' }}>
                Total earnings
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: { xs: 34, sm: 42 },
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -0.5,
                color: TEXT_PRIMARY,
              }}
            >
              {formatPrice(total)}
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 13, fontWeight: 600, color: '#666' }}>
              Lifetime delivery fees earned
            </Typography>

            <Grid container spacing={1.5} sx={{ mt: 2.5 }}>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.85)',
                    border: `1px solid ${ACCENT_BORDER}`,
                  }}
                >
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#888', letterSpacing: 0.5 }}>TODAY</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: TEXT_PRIMARY, mt: 0.35 }}>
                    {formatPrice(today)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: ACCENT_SOFT,
                    border: `1px solid ${ACCENT}`,
                  }}
                >
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#9a5a40', letterSpacing: 0.5 }}>THIS WEEK</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: ACCENT, mt: 0.35 }}>
                    {formatPrice(week)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <EarningsMetricTile
              label="This week"
              value={formatPrice(week)}
              hint="Since Sunday"
              icon={<Schedule sx={{ fontSize: 22 }} />}
              accent={ACCENT}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EarningsMetricTile
              label="This month"
              value={formatPrice(month)}
              hint="Current calendar month"
              icon={<CalendarMonth sx={{ fontSize: 22 }} />}
              accent={ACCENT_MID}
              trend={
                lastMonth > 0 || month > 0
                  ? {
                      label: `${monthTrendPositive ? '+' : ''}${Math.abs(monthDelta).toFixed(0)}% vs last month`,
                      positive: monthTrendPositive,
                    }
                  : undefined
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <EarningsMetricTile
              label="Last month"
              value={formatPrice(lastMonth)}
              hint="Previous calendar month"
              icon={<History sx={{ fontSize: 22 }} />}
              accent={ACCENT_LIGHT}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#fff',
                height: '100%',
                border: `1px solid ${ACCENT_BORDER}`,
                boxShadow: '0 8px 24px rgba(255, 107, 53, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShowChart sx={{ color: ACCENT }} />
                  <Typography sx={{ fontWeight: 900, color: TEXT_PRIMARY, fontSize: 16 }}>Earnings overview</Typography>
                </Box>
                <Chip label="Delivery fees" size="small" sx={{ fontWeight: 700, bgcolor: ACCENT_SOFT, color: ACCENT }} />
              </Box>

              <Stack spacing={2.25}>
                {periodBars.map((bar) => {
                  const pct = Math.round((bar.amount / maxPeriod) * 100);
                  return (
                    <Box key={bar.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#555' }}>{bar.label}</Typography>
                        <Typography sx={{ fontWeight: 900, fontSize: 13, color: TEXT_PRIMARY }}>{formatPrice(bar.amount)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: ACCENT_SOFT,
                          '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: bar.color },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>

              {total === 0 && completed === 0 ? (
                <Alert
                  severity="warning"
                  sx={{ mt: 2, borderRadius: 2, bgcolor: ACCENT_SOFT, color: TEXT_PRIMARY, '& .MuiAlert-icon': { color: ACCENT } }}
                >
                  Complete deliveries to start building your earnings history.
                </Alert>
              ) : null}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: '#fff',
                  border: `1px solid ${ACCENT_BORDER}`,
                  boxShadow: '0 8px 24px rgba(255, 107, 53, 0.08)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2.5,
                      bgcolor: ACCENT,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LocalShipping sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#888', letterSpacing: 0.5 }}>
                      COMPLETED
                    </Typography>
                    <Typography sx={{ fontSize: 36, fontWeight: 900, color: TEXT_PRIMARY, lineHeight: 1 }}>
                      {completed}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Successful deliveries</Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{ p: 2.25, borderRadius: 3, bgcolor: '#fff', border: `1px solid ${ACCENT_BORDER}` }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#888', letterSpacing: 0.5 }}>
                  AVG. PER DELIVERY
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: completed > 0 ? ACCENT : '#999', mt: 0.5 }}>
                  {completed > 0 ? formatPrice(avgPerDelivery) : formatPrice(0)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#666', mt: 0.5 }}>
                  {completed > 0
                    ? 'Lifetime total ÷ completed deliveries'
                    : 'Shows PKR 0.00 until you complete a delivery'}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: ACCENT_SOFT,
                  border: `1px solid ${ACCENT_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Paid sx={{ color: ACCENT }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.45 }}>
                  Payouts use each order&apos;s delivery fee when marked delivered. Stay on duty for new requests.
                </Typography>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderNotifications = () => (
    <Box>
      {renderPageHeader('Notifications', {
        subtitle: unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All caught up',
        onRefresh: () => void loadNotifications(),
        actions: (
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void clearAllNotifications()}
              disabled={loading || notifications.length === 0}
              color="error"
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Clear all
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => void markAllRead()}
              disabled={loading || unreadNotifications === 0}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#e55a2b' }, fontWeight: 800, textTransform: 'none' }}
            >
              Mark all read
            </Button>
          </>
        ),
      })}

      {notifications.length === 0 ? (
        <EmptyPanel
          title="No notifications"
          description="Updates about deliveries and payouts will show here."
          icon={<NotificationsNone sx={{ fontSize: 48 }} />}
        />
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: '#fff', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
          <List disablePadding>
            {notifications.map((n) => {
              const id = String(n?._id || n?.id || '').trim();
              const title = String(n?.title || 'Notification').trim();
              const message = String(n?.message || '').trim();
              const createdAt = formatDateTime(String(n?.createdAt || n?.created_at || '').trim());
              const isRead = Boolean((n as any)?.read ?? (n as any)?.isRead ?? false);
              return (
                <React.Fragment key={id || `${title}-${createdAt}`}>
                  <ListItemButton
                    onClick={() => void markNotificationRead(n)}
                    sx={{
                      alignItems: 'flex-start',
                      py: 1.75,
                      px: 2,
                      bgcolor: isRead ? '#fff' : '#FFF8F5',
                      borderLeft: isRead ? '4px solid transparent' : `4px solid ${ACCENT}`,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                          <Typography sx={{ fontWeight: 900, color: '#111' }}>{title}</Typography>
                          {!isRead ? <Chip label="New" size="small" sx={{ bgcolor: '#FF6B35', color: '#fff', fontWeight: 900 }} /> : null}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {message ? <Typography sx={{ color: '#666', fontSize: 13 }}>{message}</Typography> : null}
                          {createdAt ? <Typography sx={{ color: '#999', fontSize: 12, mt: 0.5 }}>{createdAt}</Typography> : null}
                        </Box>
                      }
                    />
                  </ListItemButton>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );

  const renderProfile = () => (
    <Box>
      {renderPageHeader('Profile', {
        subtitle: 'Manage your account',
        actions: (
          <Button variant="outlined" onClick={handleLogout} color="error" sx={{ fontWeight: 800, textTransform: 'none' }}>
            Logout
          </Button>
        ),
      })}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 24px rgba(20, 20, 40, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' }, gap: 2.5 }}>
          <Avatar
            src={avatarSrc ? api.getImageUrl(avatarSrc) : undefined}
            sx={{ width: 88, height: 88, bgcolor: ACCENT, fontWeight: 900, fontSize: 32 }}
          >
            {riderName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 22 }}>{riderName}</Typography>
            {riderEmail ? <Typography sx={{ color: '#666', fontWeight: 600, mt: 0.5 }}>{riderEmail}</Typography> : null}
            {riderPhone ? <Typography sx={{ color: '#666', fontWeight: 600 }}>{riderPhone}</Typography> : null}
            <Chip
              label={onDuty ? 'On duty' : 'Off duty'}
              size="small"
              sx={{
                mt: 1.25,
                bgcolor: onDuty ? '#E8F5E9' : '#FFEBEE',
                color: onDuty ? '#2e7d32' : '#c62828',
                fontWeight: 800,
              }}
            />
          </Box>
        </Box>
        <Divider sx={{ my: 2.5 }} />
        <Stack direction={isMobile ? 'column' : 'row'} spacing={1.25} flexWrap="wrap">
          <Button
            variant="contained"
            fullWidth={isMobile}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#e55a2b' }, fontWeight: 800, textTransform: 'none' }}
            onClick={() => setEditProfileOpen(true)}
            disabled={loading}
          >
            Edit profile
          </Button>
          <Button
            variant="outlined"
            fullWidth={isMobile}
            sx={{ fontWeight: 800, textTransform: 'none' }}
            onClick={() => setChangePasswordOpen(true)}
            disabled={loading}
          >
            Change password
          </Button>
          <Button variant="outlined" component="label" fullWidth={isMobile} sx={{ fontWeight: 800, textTransform: 'none' }} disabled={loading}>
            Change photo
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProfileImage(file);
                e.currentTarget.value = '';
              }}
            />
          </Button>
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ px: isMobile ? 2 : 3, py: 2, pb: 4, bgcolor: PAGE_BG, minHeight: '100%' }}>
      {activeTab === 'home' ? renderHome() : null}
      {activeTab === 'orders' ? renderOrders() : null}
      {activeTab === 'earnings' ? renderEarnings() : null}
      {activeTab === 'notifications' ? renderNotifications() : null}
      {activeTab === 'profile' ? renderProfile() : null}

      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid #eee', pb: 1.5 }}>
          Order #{selectedOrder?.orderNumber || ''}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#fafafa' }}>
          {selectedOrder ? (
            <Box sx={{ pt: 1 }}>
              <Chip
                label={formatStatusLabel(selectedOrder.status)}
                size="small"
                sx={{
                  mb: 1.5,
                  fontWeight: 800,
                  bgcolor: `${STATUS_COLORS[selectedOrder.status] || '#666'}20`,
                  color: STATUS_COLORS[selectedOrder.status] || '#666',
                }}
              />
              <Typography sx={{ fontWeight: 900, color: ACCENT, fontSize: 22 }}>
                {formatPrice(toNumber(selectedOrder.totalAmount, 0))}
              </Typography>
              {selectedOrder.createdAt ? <Typography sx={{ color: '#999', mt: 0.5 }}>{formatDateTime(selectedOrder.createdAt)}</Typography> : null}
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 900, color: '#111' }}>Pickup</Typography>
              <Typography sx={{ color: '#666', mt: 0.5 }}>{selectedOrder.restaurantName || 'Restaurant'}</Typography>
              {selectedOrder.pickupAddress ? <Typography sx={{ color: '#666', mt: 0.25 }}>{selectedOrder.pickupAddress}</Typography> : null}
              <Button sx={{ mt: 1, fontWeight: 900 }} startIcon={<Directions />} variant="outlined" onClick={() => openMaps({ coords: selectedOrder.pickupCoords, address: selectedOrder.pickupAddress || selectedOrder.restaurantName })}>
                Open Pickup
              </Button>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 900, color: '#111' }}>Delivery</Typography>
              {selectedOrder.deliveryAddress ? <Typography sx={{ color: '#666', mt: 0.5 }}>{selectedOrder.deliveryAddress}</Typography> : null}
              <Button sx={{ mt: 1, fontWeight: 900 }} startIcon={<Directions />} variant="outlined" onClick={() => openMaps({ coords: selectedOrder.deliveryCoords, address: selectedOrder.deliveryAddress })}>
                Open Delivery
              </Button>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 900, color: '#111' }}>Customer</Typography>
              <Typography sx={{ color: '#666', mt: 0.5 }}>{selectedOrder.customerName || 'Customer'}</Typography>
              {selectedOrder.customerPhone ? (
                <Button sx={{ mt: 1, fontWeight: 900 }} startIcon={<Call />} variant="outlined" onClick={() => callCustomer(selectedOrder.customerPhone)}>
                  Call {selectedOrder.customerPhone}
                </Button>
              ) : null}
              {selectedOrder.items.length ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography sx={{ fontWeight: 900, color: '#111' }}>Items</Typography>
                  <List dense>
                    {selectedOrder.items.map((it, idx) => (
                      <ListItemText key={`${it}-${idx}`} primary={it} primaryTypographyProps={{ sx: { fontWeight: 700, color: '#333' } }} />
                    ))}
                  </List>
                </>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOrderDialogOpen(false)} sx={{ fontWeight: 900 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Reject Order</DialogTitle>
        <DialogContent>
          <TextField
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            fullWidth
            placeholder="Reason (optional)"
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ fontWeight: 900 }}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleReject()} sx={{ fontWeight: 900 }} disabled={loading}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth />
            <TextField label="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setEditProfileOpen(false)} sx={{ fontWeight: 900 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveProfile()} sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF6B35dd' }, fontWeight: 900 }} disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth />
            <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setChangePasswordOpen(false)} sx={{ fontWeight: 900 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void savePassword()} sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF6B35dd' }, fontWeight: 900 }} disabled={loading || !currentPassword || !newPassword}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast({ open: false, message: '' })} severity="error" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
