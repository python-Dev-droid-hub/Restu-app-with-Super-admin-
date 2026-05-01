import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Call,
  CheckCircle,
  Close,
  DeliveryDining,
  Directions,
  Paid,
  PlayArrow,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

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

export default function RiderDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formatPrice } = useSettings();

  const [activeTab, setActiveTab] = useState<RiderTabKey>('home');
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

  const loadStats = useCallback(async () => {
    const res = await api.get<any>('/dashboard/rider/stats');
    if (!res?.success) return;
    const d = res.data || {};
    setStats({
      assignedDeliveries: toNumber(d.assignedDeliveries, 0),
      completedDeliveries: toNumber(d.completedDeliveries, 0),
      todayEarnings: toNumber(d.todayEarnings, 0),
      thisWeekEarnings: toNumber(d.thisWeekEarnings, 0),
    });
  }, []);

  const loadEarnings = useCallback(async () => {
    const res = await api.get<any>('/dashboard/rider/earnings');
    if (!res?.success) return;
    const d = res.data || {};
    setEarnings({
      totalEarnings: toNumber(d.totalEarnings, 0),
      thisWeekEarnings: toNumber(d.thisWeekEarnings, 0),
      thisMonthEarnings: toNumber(d.thisMonthEarnings, 0),
      lastMonthEarnings: toNumber(d.lastMonthEarnings, 0),
    });
  }, []);

  const loadOrders = useCallback(async () => {
    const [availableRes, myRes] = await Promise.all([
      api.get<any>('/orders/driver/available'),
      api.get<any>('/orders/driver/my-orders?limit=50&page=1'),
    ]);

    if (availableRes?.success) {
      const list = availableRes?.data?.orders || availableRes?.data?.data?.orders || availableRes?.data || [];
      setAvailableOrders(normalizeOrders(list));
    }

    if (myRes?.success) {
      const list = myRes?.data?.orders || myRes?.data?.data?.orders || myRes?.data || [];
      setMyOrders(normalizeOrders(list));
    }
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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([loadProfile(), loadRiderStatus(), loadStats(), loadEarnings(), loadOrders(), loadNotifications()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadEarnings, loadNotifications, loadOrders, loadProfile, loadRiderStatus, loadStats]);

  useEffect(() => {
    if (!onDuty) return;
    void updateLocation();
    const id = window.setInterval(() => {
      void updateLocation();
    }, 60000);
    return () => window.clearInterval(id);
  }, [onDuty, updateLocation]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadStats();
      void loadEarnings();
      void loadOrders();
      void loadNotifications();
    }, 30000);
    return () => window.clearInterval(id);
  }, [loadEarnings, loadNotifications, loadOrders, loadStats]);

  const activeDeliveries = useMemo(() => {
    const activeStatuses = new Set(['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_DELIVERY']);
    return myOrders.filter((o) => activeStatuses.has(String(o.status || '').toUpperCase()));
  }, [myOrders]);

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
        await Promise.all([loadStats(), loadOrders()]);
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
        await Promise.all([loadStats(), loadOrders()]);
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
        await Promise.all([loadStats(), loadEarnings(), loadOrders()]);
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
        await Promise.all([loadStats(), loadOrders()]);
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
  const riderEmail = String(profile?.email || '').trim();
  const riderPhone = String(profile?.phoneNumber || profile?.phone || '').trim();
  const avatarSrc = String(profile?.profileImage || profile?.avatar || profile?.image || '').trim();

  const renderStatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ color: '#666', fontWeight: 700 }}>In Progress</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111' }}>{stats.assignedDeliveries}</Typography>
            </Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#FF6B3520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDining sx={{ color: '#FF6B35' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ color: '#666', fontWeight: 700 }}>Today Earnings</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#FF6B35' }}>{formatPrice(toNumber(stats.todayEarnings, 0))}</Typography>
            </Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#2e7d3220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paid sx={{ color: '#2e7d32' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ color: '#666', fontWeight: 700 }}>Last 7 Days</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111' }}>{formatPrice(toNumber(stats.thisWeekEarnings, 0))}</Typography>
            </Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: '#1976d220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paid sx={{ color: '#1976d2' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderOrderCard = (order: RiderOrder, mode: 'active' | 'available' | 'history') => {
    const color = STATUS_COLORS[order.status] || '#666';
    const isAssigned = order.status === 'RIDER_ASSIGNED';
    const isOut = order.status === 'OUT_FOR_DELIVERY' || order.status === 'IN_DELIVERY' || order.status === 'PICKED_UP';
    return (
      <Paper
        key={order._id}
        variant="outlined"
        sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', cursor: 'pointer' }}
        onClick={() => openOrderDetails(order)}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: '#111' }} noWrap>
              #{order.orderNumber}
            </Typography>
            <Typography sx={{ color: '#666', fontSize: 13 }} noWrap>
              {order.restaurantName || 'Restaurant'} {order.deliveryAddress ? `• ${order.deliveryAddress}` : ''}
            </Typography>
            <Typography sx={{ color: '#666', fontSize: 13 }} noWrap>
              {order.customerName || 'Customer'} {order.customerPhone ? `• ${order.customerPhone}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              label={order.status}
              size="small"
              sx={{
                bgcolor: `${color}20`,
                color,
                fontWeight: 900,
              }}
            />
            <Typography sx={{ fontWeight: 900, color: '#FF6B35' }}>{formatPrice(toNumber(order.totalAmount, 0))}</Typography>
          </Box>
        </Box>

        {order.items.length ? (
          <Typography sx={{ mt: 1, color: '#666', fontSize: 13 }}>
            {order.items.slice(0, 2).join(', ')}
            {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
          </Typography>
        ) : null}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
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
                sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF6B35dd' }, fontWeight: 900 }}
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
                sx={{ fontWeight: 900 }}
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
                  sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1976d2dd' }, fontWeight: 900 }}
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
                  sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#2e7d32dd' }, fontWeight: 900 }}
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
                sx={{ fontWeight: 900 }}
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
                sx={{ fontWeight: 900 }}
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
                sx={{ fontWeight: 900 }}
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
                sx={{ fontWeight: 900 }}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          ) : null}
        </Box>
      </Paper>
    );
  };

  const renderHome = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#111' }}>Rider Dashboard</Typography>
          <Typography sx={{ color: '#666', fontWeight: 700 }}>{riderName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 900, color: onDuty ? '#2e7d32' : '#d32f2f' }}>{onDuty ? 'On Duty' : 'Off Duty'}</Typography>
          <Switch checked={onDuty} onChange={(_, checked) => void toggleDuty(checked)} disabled={loading} />
        </Box>
      </Box>

      {onDuty && geoStatus !== 'ok' ? (
        <Alert severity={geoStatus === 'denied' ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {geoStatus === 'denied'
            ? 'Location permission is denied. Enable location to update your live rider location.'
            : geoStatus === 'unavailable'
            ? 'Geolocation is not available in this browser/device.'
            : 'Unable to update location right now.'}
        </Alert>
      ) : null}

      {renderStatsCards()}

      <Typography sx={{ fontWeight: 900, color: '#111', mb: 1.5 }}>Active Deliveries</Typography>
      {activeDeliveries.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff' }}>
          <Typography sx={{ color: '#666', fontWeight: 700 }}>No active deliveries right now.</Typography>
          <Button sx={{ mt: 1.5, fontWeight: 900 }} variant="contained" onClick={() => navigateToTab('orders')}>
            Go to Orders
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {activeDeliveries.map((o) => renderOrderCard(o, 'active'))}
        </Stack>
      )}
    </Box>
  );

  const renderOrders = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#111' }}>Orders</Typography>
        <Button variant="outlined" onClick={() => void loadOrders()} disabled={loading} sx={{ fontWeight: 900 }}>
          Refresh
        </Button>
      </Box>

      <Typography sx={{ fontWeight: 900, color: '#111', mb: 1.5 }}>Available</Typography>
      {availableOrders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff', mb: 2 }}>
          <Typography sx={{ color: '#666', fontWeight: 700 }}>No available delivery orders.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {availableOrders.map((o) => renderOrderCard(o, 'available'))}
        </Stack>
      )}

      <Typography sx={{ fontWeight: 900, color: '#111', mb: 1.5 }}>My Orders</Typography>
      {myOrders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff' }}>
          <Typography sx={{ color: '#666', fontWeight: 700 }}>No orders found.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {myOrders.slice(0, 20).map((o) => renderOrderCard(o, 'history'))}
        </Stack>
      )}
    </Box>
  );

  const renderEarnings = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#111' }}>Earnings</Typography>
        <Button variant="outlined" onClick={() => void loadEarnings()} disabled={loading} sx={{ fontWeight: 900 }}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: '#666', fontWeight: 800 }}>Total Earnings</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#FF6B35' }}>{formatPrice(toNumber(earnings.totalEarnings, 0))}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: '#666', fontWeight: 800 }}>This Week</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111' }}>{formatPrice(toNumber(earnings.thisWeekEarnings, 0))}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: '#666', fontWeight: 800 }}>This Month</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111' }}>{formatPrice(toNumber(earnings.thisMonthEarnings, 0))}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: '#666', fontWeight: 800 }}>Last Month</Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111' }}>{formatPrice(toNumber(earnings.lastMonthEarnings, 0))}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderNotifications = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#111' }}>Notifications</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => void clearAllNotifications()} disabled={loading || notifications.length === 0} color="error" sx={{ fontWeight: 900 }}>
            Clear all
          </Button>
          <Button variant="contained" onClick={() => void markAllRead()} disabled={loading} sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF6B35dd' }, fontWeight: 900 }}>
            Mark all read
          </Button>
        </Box>
      </Box>

      {notifications.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff' }}>
          <Typography sx={{ color: '#666', fontWeight: 700 }}>No notifications.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff', overflow: 'hidden' }}>
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
                    sx={{ alignItems: 'flex-start', py: 1.5, px: 2, bgcolor: isRead ? '#fff' : '#FFF3EE' }}
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#111' }}>Profile</Typography>
        <Button variant="outlined" onClick={handleLogout} sx={{ fontWeight: 900 }} color="error">
          Logout
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar src={avatarSrc || undefined} sx={{ width: 64, height: 64, bgcolor: '#FF6B35', fontWeight: 900 }}>
            {riderName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 18 }} noWrap>
              {riderName}
            </Typography>
            {riderEmail ? <Typography sx={{ color: '#666', fontWeight: 700 }}>{riderEmail}</Typography> : null}
            {riderPhone ? <Typography sx={{ color: '#666', fontWeight: 700 }}>{riderPhone}</Typography> : null}
            <Chip
              label={onDuty ? 'On Duty' : 'Off Duty'}
              size="small"
              sx={{ mt: 1, bgcolor: onDuty ? '#2e7d3220' : '#d32f2f20', color: onDuty ? '#2e7d32' : '#d32f2f', fontWeight: 900 }}
            />
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
            <Button variant="contained" sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF6B35dd' }, fontWeight: 900 }} onClick={() => setEditProfileOpen(true)} disabled={loading}>
              Edit Profile
            </Button>
            <Button variant="outlined" sx={{ fontWeight: 900 }} onClick={() => setChangePasswordOpen(true)} disabled={loading}>
              Change Password
            </Button>
            <Button
              variant="outlined"
              component="label"
              sx={{ fontWeight: 900 }}
              disabled={loading}
            >
              Change Image
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
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ px: isMobile ? 2 : 3, py: 2 }}>
      {activeTab === 'home' ? renderHome() : null}
      {activeTab === 'orders' ? renderOrders() : null}
      {activeTab === 'earnings' ? renderEarnings() : null}
      {activeTab === 'notifications' ? renderNotifications() : null}
      {activeTab === 'profile' ? renderProfile() : null}

      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 900 }}>Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder ? (
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ fontWeight: 900, color: '#111' }}>#{selectedOrder.orderNumber}</Typography>
              <Typography sx={{ color: '#666', fontWeight: 700, mt: 0.5 }}>Status: {selectedOrder.status}</Typography>
              <Typography sx={{ color: '#666', fontWeight: 700, mt: 0.5 }}>{formatPrice(toNumber(selectedOrder.totalAmount, 0))}</Typography>
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
