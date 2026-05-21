import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Skeleton,
  Pagination,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search,
  FilterList,
  CalendarToday,
  MoreVert,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { io, type Socket } from 'socket.io-client';
import { resolveSocketUrl } from '../../utils/resolveSocketUrl';
import {
  enrichOrderParty,
  getWaiterDisplayName,
  isDineInOrder,
  getCustomerDisplayName,
} from '../../utils/orderParty';
import { OrderCardMeta } from '../../components/orders/OrderCardMeta';

interface Order {
  _id: string;
  orderNumber: string;
  orderType?: string;
  customerName: string;
  partyLabel?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  customerAvatar?: string;
  branchId: string;
  branchName: string;
  branchLocation?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: number;
  currency?: string;
}

type OrderDetailsItem = {
  _id?: string;
  quantity?: number;
  productName?: string;
  name?: string;
  unitPrice?: number;
  price?: number;
  totalPrice?: number;
  total?: number;
  specialInstructions?: string;
  product?: { name?: string };
};

type OrderDetails = {
  _id?: string;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  orderType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  addressLine?: string;
  deliveryInstructions?: string;
  specialInstructions?: string;
  tableNumber?: string | number;
  customerName?: string;
  phoneNumber?: string;
  customer?: { displayName?: string; name?: string; email?: string; phoneNumber?: string };
  waiter?: { displayName?: string; name?: string };
  waiterName?: string;
  branch?: { branchName?: string; name?: string };
  items?: OrderDetailsItem[];
  subtotal?: number;
  deliveryFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
};

const AdminOrders: React.FC = () => {
  const { formatPrice } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [branchCurrencyMap, setBranchCurrencyMap] = useState<Record<string, string>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [detailsUpdatingStatus, setDetailsUpdatingStatus] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const itemsPerPage = 10;
  const socketRef = useRef<Socket | null>(null);
  const branchMapsRef = useRef<{ nameMap: Record<string, string>; currencyMap: Record<string, string> }>({
    nameMap: {},
    currencyMap: {},
  });
  const statusOptions = [
    'PENDING',
    'KITCHEN_ACCEPTED',
    'PREPARING',
    'READY',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'SERVED',
    'COMPLETED',
    'CANCELLED',
  ];

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  useEffect(() => {
    const init = async () => {
      const map = await loadBranches();
      if (map?.nameMap) {
        branchMapsRef.current = {
          nameMap: map.nameMap,
          currencyMap: map.currencyMap || {},
        };
      }
      await loadOrders(map);
    };
    void init();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, activeTab, branchFilter, statusFilter, dateFilter, searchQuery]);

  const loadOrdersRef = useRef<
    (branchData?: { nameMap?: Record<string, string>; currencyMap?: Record<string, string> }) => Promise<void>
  >(async () => {});

  const loadOrders = async (branchData?: { nameMap?: Record<string, string>; currencyMap?: Record<string, string> }) => {
    try {
      setLoading(true);
      console.log('[Orders] Loading orders from API...');
      const response: any = await api.getAdminOrders({ limit: 100 });
      console.log('[Orders] API Response:', response);
      
      if (response?.success) {
        // Try multiple possible data structures
        let rawOrders = response.data;
        
        if (response.data?.orders) {
          rawOrders = response.data.orders;
        } else if (response.data?.data?.orders) {
          rawOrders = response.data.data.orders;
        } else if (Array.isArray(response.data)) {
          rawOrders = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          rawOrders = response.data.data;
        }
        
        console.log('[Orders] Raw orders:', rawOrders);
        
        // Use passed maps or current state
        const nameMap = branchData?.nameMap || branchMap;
        const currencyMap = branchData?.currencyMap || branchCurrencyMap;
        console.log('[Orders] Using branch map:', nameMap, 'Currency map:', currencyMap);
        
        if (Array.isArray(rawOrders) && rawOrders.length > 0) {
          const normalized = rawOrders.map((o: any, index: number) => {
            // Debug first order
            if (index === 0) {
              console.log('[Orders] First raw order branch:', o?.branch, typeof o?.branch);
              console.log('[Orders] Branch map keys:', Object.keys(nameMap));
            }
            
            // Handle branch - API returns Mongoose doc with data under _doc
            // The branch is populated by backend, access via _doc or direct
            const branchData = o?._doc?.branch || o?.branch;
            const branchId = 
              (typeof branchData === 'string' ? branchData : null) ||
              branchData?._id || 
              branchData?.id ||
              o?._doc?.branchId ||
              o?.branchId || 
              '';
            
            // Branch name is already populated by backend
            const branchName = branchData?.branchName || 
              branchData?.name ||
              nameMap[branchId] ||
              (branchId ? `Branch ${branchId.slice(-6)}` : 'Unknown Branch');
            
            // Get currency from branch settings
            const branchCurrency = currencyMap[branchId] || branchData?.currency || 'PKR';
            
            if (index === 0) {
              console.log('[Orders] Extracted branchId:', branchId);
              console.log('[Orders] Looked up branchName:', branchName);
              console.log('[Orders] Map has key?', nameMap[branchId]);
            }
            
            // Handle customer - API returns Mongoose doc with data under _doc
            // The customer is populated by backend, access via _doc or direct
            const customerData = o?._doc?.customer || o?.customer;
            const customerId = 
              (typeof customerData === 'string' ? customerData : null) ||
              customerData?._id || 
              customerData?.id ||
              o?._doc?.customerId ||
              o?.customerId || 
              '';
            
            const enriched = enrichOrderParty((o?._doc || o) as Record<string, unknown>);
            const orderType = enriched.orderType;
            const partyName = enriched.partyName;
            const partyLabel = enriched.partyLabel;
            const customerName =
              partyName || (customerId ? `Customer ${customerId.slice(-6)}` : 'Guest Order');
            const customerAvatar = customerData?.avatar || customerData?.image || customerData?.profileImage || customerData?.photo;
            
            // Fix order ID - ensure we have a valid ID (Mongoose doc has _id at top level)
            const orderId = o?._id || o?.id || o?._doc?._id || '';
            const orderNumber = o?._doc?.orderNumber || o?.orderNumber || o?.orderNo || (orderId ? `ORD${orderId.slice(-6).toUpperCase()}` : 'ORD000000');
            const status = o?._doc?.status || o?.status || 'unknown';
            
            return {
              _id: orderId || Math.random().toString(),
              orderNumber,
              orderType,
              customerName,
              partyLabel,
              tableNumber: enriched.tableNumber,
              waiterName: enriched.waiterName,
              customerAvatar,
              branchId,
              branchName,
              branchLocation: branchData?.addressLine || branchData?.city || '',
              status: status.toLowerCase(),
              totalAmount: Number(o?._doc?.totalAmount || o?.totalAmount || o?.total || 0),
              createdAt: o?._doc?.createdAt || o?.createdAt || new Date().toISOString(),
              items: o?._doc?.items?.length || o?.items?.length || 1,
              currency: o?._doc?.currency || o?.currency || branchCurrency,
            };
          });
          console.log('[Orders] Normalized orders:', normalized);
          setOrders(normalized);
        } else {
          console.warn('[Orders] No orders found in API response');
          setOrders([]);
        }
      } else {
        console.error('[Orders] API returned success:false', response);
        setOrders([]);
      }
    } catch (error) {
      console.error('[Orders] Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  loadOrdersRef.current = loadOrders;

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';
    if (!socketRef.current) {
      socketRef.current = io(resolveSocketUrl(), {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true,
        auth: token ? { token } : undefined,
      });
    }
    const socket = socketRef.current;
    const onRefresh = () => void loadOrdersRef.current(branchMapsRef.current);
    socket.on('admin_orders:invalidate', onRefresh);
    socket.on('admin_dashboard:invalidate', onRefresh);
    socket.on('order:created', onRefresh);
    socket.on('order:updated', onRefresh);
    socket.on('order:status_updated', onRefresh);
    socket.on('notification', onRefresh);
    return () => {
      socket.off('admin_orders:invalidate', onRefresh);
      socket.off('admin_dashboard:invalidate', onRefresh);
      socket.off('order:created', onRefresh);
      socket.off('order:updated', onRefresh);
      socket.off('order:status_updated', onRefresh);
      socket.off('notification', onRefresh);
    };
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (response?.success) {
        const rawList = response?.data?.branches || response?.data?.data?.branches || response?.data || [];
        const branchArray = Array.isArray(rawList) ? rawList : [];
        setBranches(branchArray);
        
        // Create branch lookup maps: branchId -> branchName, branchId -> currency
        const nameMap: Record<string, string> = {};
        const currencyMap: Record<string, string> = {};
        branchArray.forEach((b: any) => {
          const id = b._id || b.id;
          const name = b.branchName || b.name || 'Unknown Branch';
          const currency = b.currency || b.settings?.currency || 'PKR';
          if (id) {
            nameMap[id] = name;
            currencyMap[id] = currency;
          }
        });
        setBranchMap(nameMap);
        setBranchCurrencyMap(currencyMap);
        console.log('[Orders] Branch map created:', nameMap, 'Currency map:', currencyMap);
        return { nameMap, currencyMap };
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
    return {};
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (activeTab !== 'all') {
      filtered = filtered.filter(o => {
        const status = o.status.toLowerCase();
        switch (activeTab) {
          case 'pending':
            return status === 'pending' || status === 'confirmed';
          case 'in_progress':
            return status === 'preparing' || status === 'cooking' || status === 'on_the_way' || status === 'ready';
          case 'delivered':
            return status === 'delivered' || status === 'completed';
          case 'cancelled':
            return status === 'cancelled';
          default:
            return true;
        }
      });
    }

    // Branch filter - use branchId for filtering
    if (branchFilter !== 'all') {
      filtered = filtered.filter(o => o.branchId === branchFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter.toLowerCase());
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.createdAt);
        switch (dateFilter) {
          case 'today':
            return orderDate.toDateString() === now.toDateString();
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          }
          case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return orderDate >= monthAgo;
          }
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.branchName.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
    setPage(1);
  };

  const getStatusColor = (status: string): any => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: '#FFF3E0', color: '#FF9800', label: 'Pending' };
      case 'confirmed':
        return { bg: '#E3F2FD', color: '#2196F3', label: 'Confirmed' };
      case 'preparing':
      case 'cooking':
        return { bg: '#E8F5E9', color: '#4CAF50', label: 'Preparing' };
      case 'ready':
        return { bg: '#F3E5F5', color: '#9C27B0', label: 'Ready' };
      case 'on_the_way':
        return { bg: '#E1F5FE', color: '#03A9F4', label: 'On the way' };
      case 'delivered':
      case 'completed':
        return { bg: '#E8F5E9', color: '#4CAF50', label: 'Delivered' };
      case 'cancelled':
        return { bg: '#FFEBEE', color: '#F44336', label: 'Cancelled' };
      default:
        return { bg: '#F5F5F5', color: '#666', label: status };
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const paginatedOrders = filteredOrders.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const getTabCount = (tabValue: string) => {
    return orders.filter(o => {
      const status = o.status.toLowerCase();
      switch (tabValue) {
        case 'pending':
          return status === 'pending' || status === 'confirmed';
        case 'in_progress':
          return status === 'preparing' || status === 'cooking' || status === 'on_the_way' || status === 'ready';
        case 'delivered':
          return status === 'delivered' || status === 'completed';
        case 'cancelled':
          return status === 'cancelled';
        default:
          return true;
      }
    }).length;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const openOrderDetails = async (order: Order) => {
    if (!order?._id) return;
    setSelectedOrder(order);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError('');
    setOrderDetails(null);

    const res: any = await api.get(`/orders/${order._id}`);
    if (res?.success) {
      setOrderDetails((res?.data || null) as OrderDetails | null);
    } else {
      setDetailsError(String(res?.error || res?.message || 'Failed to load order details'));
    }
    setDetailsLoading(false);
  };

  const closeOrderDetails = () => {
    setDetailsOpen(false);
    setDetailsError('');
    setOrderDetails(null);
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    setStatusDialogOpen(true);
    handleMenuClose();
  };

  const confirmStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    try {
      setUpdating(true);
      const response: any = await api.updateOrderStatus(selectedOrder._id, newStatus.toUpperCase());
      if (response?.success) {
        // Update local state
        setOrders(prev => prev.map(o => 
          o._id === selectedOrder._id ? { ...o, status: newStatus.toLowerCase() } : o
        ));
        setFilteredOrders(prev => prev.map(o => 
          o._id === selectedOrder._id ? { ...o, status: newStatus.toLowerCase() } : o
        ));
        setOrderDetails(prev => prev ? { ...prev, status: newStatus.toUpperCase() } : prev);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdating(false);
      setStatusDialogOpen(false);
      if (!detailsOpen) setSelectedOrder(null);
    }
  };

  const getMobileLikeActions = (statusUpper: string, orderTypeUpper: string) => {
    const isFinal = ['CANCELLED', 'DELIVERED', 'SERVED', 'COMPLETED'].includes(statusUpper);
    const isDelivery = orderTypeUpper === 'DELIVERY' || statusUpper === 'OUT_FOR_DELIVERY' || statusUpper === 'RIDER_ASSIGNED';
    const actions: Array<{ key: string; label: string; nextStatus: string; color: string }> = [];

    if (statusUpper === 'PENDING') {
      actions.push({ key: 'kitchen_accepted', label: 'Kitchen Accepted', nextStatus: 'KITCHEN_ACCEPTED', color: '#2BC48A' });
    } else if (statusUpper === 'KITCHEN_ACCEPTED') {
      actions.push({ key: 'preparing', label: 'Start Preparing', nextStatus: 'PREPARING', color: '#FFB020' });
    } else if (statusUpper === 'PREPARING') {
      actions.push({ key: 'ready', label: 'Mark Ready', nextStatus: 'READY', color: '#2BC48A' });
    } else if (statusUpper === 'READY') {
      if (isDelivery) {
        actions.push({ key: 'out_for_delivery', label: 'Out for Delivery', nextStatus: 'OUT_FOR_DELIVERY', color: '#2BC48A' });
        actions.push({ key: 'delivered', label: 'Mark Delivered', nextStatus: 'DELIVERED', color: '#2BC48A' });
      } else {
        actions.push({ key: 'picked_up', label: 'Pick Up', nextStatus: 'PICKED_UP', color: '#2BC48A' });
        actions.push({ key: 'completed', label: 'Mark Complete', nextStatus: 'COMPLETED', color: '#2BC48A' });
      }
    } else if (statusUpper === 'RIDER_ASSIGNED') {
      actions.push({ key: 'out_for_delivery', label: 'Out for Delivery', nextStatus: 'OUT_FOR_DELIVERY', color: '#2BC48A' });
      actions.push({ key: 'delivered', label: 'Mark Delivered', nextStatus: 'DELIVERED', color: '#2BC48A' });
    } else if (statusUpper === 'OUT_FOR_DELIVERY') {
      actions.push({ key: 'delivered', label: 'Mark Delivered', nextStatus: 'DELIVERED', color: '#2BC48A' });
    } else if (statusUpper === 'PICKED_UP') {
      actions.push({ key: 'served', label: 'Mark Served', nextStatus: 'SERVED', color: '#2BC48A' });
      actions.push({ key: 'completed', label: 'Mark Complete', nextStatus: 'COMPLETED', color: '#2BC48A' });
    } else if (statusUpper === 'SERVED') {
      actions.push({ key: 'completed', label: 'Mark Complete', nextStatus: 'COMPLETED', color: '#2BC48A' });
    } else if (statusUpper === 'DELIVERED') {
      actions.push({ key: 'completed', label: 'Mark Complete', nextStatus: 'COMPLETED', color: '#2BC48A' });
    }

    if (!isFinal) {
      actions.push({ key: 'cancel', label: 'Cancel', nextStatus: 'CANCELLED', color: '#FF4D4D' });
    }

    return actions;
  };

  const updateStatusFromDetails = async (nextStatus: string) => {
    const orderId = String(orderDetails?._id || selectedOrder?._id || '');
    if (!orderId) return;

    const upper = String(nextStatus || '').toUpperCase();
    if (!upper) return;

    try {
      setDetailsUpdatingStatus(upper);
      const response: any = await api.updateOrderStatus(orderId, upper);
      if (response?.success) {
        setOrders(prev => prev.map(o => (o._id === orderId ? { ...o, status: upper.toLowerCase() } : o)));
        setFilteredOrders(prev => prev.map(o => (o._id === orderId ? { ...o, status: upper.toLowerCase() } : o)));
        setOrderDetails(prev => (prev ? { ...prev, status: upper } : prev));
        setSelectedOrder(prev => (prev ? { ...prev, status: upper.toLowerCase() } : prev));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setDetailsUpdatingStatus('');
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Orders
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            sx={{
              bgcolor: activeTab === tab.value ? '#FF6B35' : 'white',
              color: activeTab === tab.value ? 'white' : '#666',
              borderRadius: 2,
              px: 2,
              py: 0.8,
              textTransform: 'none',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: activeTab === tab.value ? '0 2px 8px rgba(255,107,53,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              '&:hover': {
                bgcolor: activeTab === tab.value ? '#E55A24' : '#f5f5f5',
              },
            }}
          >
            {tab.label}
            <Box
              component="span"
              sx={{
                ml: 1,
                px: 1,
                py: 0.3,
                bgcolor: activeTab === tab.value ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                borderRadius: 1,
                fontSize: 12,
              }}
            >
              {getTabCount(tab.value)}
            </Box>
          </Button>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            displayEmpty
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList sx={{ fontSize: 16, color: '#999' }} />
                Branch
              </Box>
            </MenuItem>
            <MenuItem value="all">All Branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b._id || b.id} value={b._id || b.id}>
                {b.branchName || b.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList sx={{ fontSize: 16, color: '#999' }} />
                Status
              </Box>
            </MenuItem>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="preparing">Preparing</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            displayEmpty
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 16, color: '#999' }} />
                All Dates
              </Box>
            </MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            minWidth: { xs: '100%', sm: 200 },
            bgcolor: 'white',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search sx={{ color: '#999', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer
        sx={{
          bgcolor: 'white',
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflowY: 'hidden',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Order ID
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Table
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Waiter / Customer
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Branch
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Time
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton height={50} />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => {
                const statusStyle = getStatusColor(order.status);
                return (
                  <TableRow
                    key={order._id}
                    onClick={() => void openOrderDetails(order)}
                    sx={{
                      '&:hover': { bgcolor: '#f8f9fa' },
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, color: '#FF6B35', fontSize: 14 }}>
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 700, color: '#1565C0', fontSize: 14 }}>
                        {order.tableNumber
                          ? `Table ${order.tableNumber}`
                          : order.orderType === 'DINE_IN'
                          ? '—'
                          : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <OrderCardMeta order={order} />
                      <Typography sx={{ fontSize: 11, color: '#999', mt: 0.5 }}>
                        {order.items} items
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontSize: 14, color: '#333' }}>
                        {order.branchName}
                      </Typography>
                      {order.branchLocation && (
                        <Typography sx={{ fontSize: 11, color: '#999' }}>
                          {order.branchLocation}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={statusStyle.label}
                        size="small"
                        sx={{
                          bgcolor: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 500,
                          fontSize: 12,
                          borderRadius: 1,
                          px: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                        {formatPrice(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontSize: 13, color: '#999' }}>
                        {formatTimeAgo(order.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#999' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, order);
                        }}
                      >
                        <MoreVert sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="#999">No orders found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && filteredOrders.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: '#666',
                '&.Mui-selected': {
                  bgcolor: '#FF6B35',
                  color: 'white',
                },
              },
            }}
          />
        </Box>
      )}
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            const order = selectedOrder;
            handleMenuClose();
            if (order) void openOrderDetails(order);
          }}
        >
          View Details
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleStatusChange('DELIVERED')} sx={{ color: '#4CAF50' }}>
          <CheckCircle sx={{ mr: 1, fontSize: 18 }} />
          Mark as Delivered
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('CANCELLED')} sx={{ color: '#F44336' }}>
          <Cancel sx={{ mr: 1, fontSize: 18 }} />
          Cancel Order
        </MenuItem>
      </Menu>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: { xs: '100%', sm: 320 } }}>
            <Typography sx={{ mb: 1 }}>
              Order <strong>{selectedOrder?.orderNumber}</strong>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(String(e.target.value))}
                displayEmpty
              >
                <MenuItem value="" disabled>Select status</MenuItem>
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={updating}>Cancel</Button>
          <Button 
            onClick={confirmStatusUpdate} 
            variant="contained"
            disabled={updating || !newStatus}
            sx={{ bgcolor: newStatus === 'CANCELLED' ? '#F44336' : '#4CAF50', '&:hover': { bgcolor: newStatus === 'CANCELLED' ? '#D32F2F' : '#388E3C' } }}
          >
            {updating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={closeOrderDetails} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Order Details
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.9) transparent',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 999,
            },
          }}
        >
          {detailsLoading ? (
            <Box sx={{ py: 1 }}>
              <Skeleton height={28} />
              <Skeleton height={28} />
              <Skeleton height={28} />
              <Skeleton height={180} />
            </Box>
          ) : detailsError ? (
            <Typography sx={{ color: '#d32f2f' }}>{detailsError}</Typography>
          ) : (
            (() => {
              const d = orderDetails || {};
              const orderNumber = String(d.orderNumber || selectedOrder?.orderNumber || '');
              const createdAt = d.createdAt || selectedOrder?.createdAt || '';
              const status = String(d.status || selectedOrder?.status || '');
              const orderType = String(d.orderType || selectedOrder?.orderType || '').toUpperCase();
              const isDineIn = isDineInOrder(d as Record<string, unknown>);
              const isOnline = orderType && !isDineIn;
              const waiterName =
                getWaiterDisplayName(d as Record<string, unknown>) ||
                getWaiterDisplayName(selectedOrder as unknown as Record<string, unknown>);
              const customerName =
                getCustomerDisplayName(d as Record<string, unknown>) ||
                selectedOrder?.customerName ||
                '';
              const customerEmail = d.customer?.email || '';
              const customerPhone = d.phoneNumber || d.customer?.phoneNumber || '';
              const items = Array.isArray(d.items) ? d.items : [];

              const subtotal = Number(d.subtotal ?? 0);
              const deliveryFee = Number(d.deliveryFee ?? 0);
              const taxAmount = Number(d.taxAmount ?? 0);
              const discountAmount = Number(d.discountAmount ?? 0);
              const totalAmount = Number(d.totalAmount ?? selectedOrder?.totalAmount ?? 0);

              const showSubtotalRow = subtotal > 0;
              const showDeliveryRow = deliveryFee > 0;
              const showTaxRow = taxAmount > 0;
              const showDiscountRow = discountAmount > 0;

              const orderInstructions = String(d.specialInstructions || d.deliveryInstructions || '').trim();
              const addressLine = String(d.addressLine || '').trim();
              const paymentMethod = String(d.paymentMethod || '').toUpperCase();
              const paymentStatus = String(d.paymentStatus || '').toUpperCase();
              const tableNumber = d.tableNumber;

              return (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 16 }}>
                        {orderNumber ? `#${orderNumber}` : 'Order'}
                      </Typography>
                      <Typography sx={{ color: '#666', fontSize: 12 }}>
                        {createdAt ? new Date(createdAt).toLocaleString() : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={status ? status.toUpperCase() : 'UNKNOWN'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Order Type</Typography>
                      <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
                        {orderType || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Branch</Typography>
                      <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
                        {d.branch?.branchName || d.branch?.name || selectedOrder?.branchName || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Payment</Typography>
                      <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
                        {paymentMethod || '-'}{paymentStatus ? ` • ${paymentStatus}` : ''}
                      </Typography>
                    </Box>
                    {orderType === 'DINE_IN' && tableNumber !== undefined && tableNumber !== null ? (
                      <Box>
                        <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Table</Typography>
                        <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
                          {String(tableNumber)}
                        </Typography>
                      </Box>
                    ) : (
                      <Box />
                    )}
                  </Box>

                  {isDineIn && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 14, mb: 1 }}>
                        Waiter
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{waiterName || '—'}</Typography>
                    </>
                  )}

                  {isOnline && (customerName || customerEmail || customerPhone || addressLine) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 14, mb: 1 }}>
                        Customer Details
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Name</Typography>
                          <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{customerName || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Phone</Typography>
                          <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{customerPhone || '-'}</Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Email</Typography>
                          <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{customerEmail || '-'}</Typography>
                        </Box>
                        {addressLine && (
                          <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography sx={{ fontSize: 12, color: '#777', fontWeight: 700 }}>Address</Typography>
                            <Typography sx={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{addressLine}</Typography>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 14, mb: 1 }}>
                    Items
                  </Typography>

                  {items.length ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {items.map((it, idx) => {
                        const qty = Number(it.quantity ?? 0);
                        const name = String(it.product?.name || it.productName || it.name || 'Item');
                        const unit = Number(it.unitPrice ?? it.price ?? 0);
                        const line = Number(it.totalPrice ?? it.total ?? (qty && unit ? qty * unit : 0));
                        const itemNote = String(it.specialInstructions || '').trim();
                        return (
                          <Box key={String(it._id || idx)} sx={{ border: '1px solid #eee', borderRadius: 2, p: 1.25 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, color: '#111', fontSize: 13 }}>
                                  {name}
                                </Typography>
                                <Typography sx={{ color: '#777', fontSize: 12 }}>
                                  {qty} × {formatPrice(unit)}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 13 }}>
                                {formatPrice(line)}
                              </Typography>
                            </Box>
                            {itemNote ? (
                              <Typography sx={{ mt: 0.75, color: '#555', fontSize: 12 }}>
                                Instruction: {itemNote}
                              </Typography>
                            ) : null}
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#777', fontSize: 13 }}>No items found.</Typography>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 14, mb: 1 }}>
                    Bill
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {showSubtotalRow ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#666' }}>Subtotal</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#111' }}>{formatPrice(subtotal)}</Typography>
                      </Box>
                    ) : null}
                    {showDeliveryRow ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#666' }}>Delivery Fee</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#111' }}>{formatPrice(deliveryFee)}</Typography>
                      </Box>
                    ) : null}
                    {showTaxRow ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#666' }}>Tax</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#111' }}>{formatPrice(taxAmount)}</Typography>
                      </Box>
                    ) : null}
                    {showDiscountRow ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#666' }}>Discount</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#111' }}>- {formatPrice(discountAmount)}</Typography>
                      </Box>
                    ) : null}
                    <Divider sx={{ my: 0.75 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 900, color: '#111' }}>Total</Typography>
                      <Typography sx={{ fontWeight: 900, color: '#111' }}>{formatPrice(totalAmount)}</Typography>
                    </Box>
                  </Box>

                  {orderInstructions ? (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography sx={{ fontWeight: 900, color: '#111', fontSize: 14, mb: 1 }}>
                        Instructions
                      </Typography>
                      <Typography sx={{ color: '#444', fontSize: 13 }}>
                        {orderInstructions}
                      </Typography>
                    </>
                  ) : null}
                </Box>
              );
            })()
          )}
        </DialogContent>
        <DialogActions>
          {(() => {
            const statusUpper = String(orderDetails?.status || selectedOrder?.status || '').toUpperCase();
            const orderTypeUpper = String(orderDetails?.orderType || '').toUpperCase();
            const actions = getMobileLikeActions(statusUpper, orderTypeUpper);
            const busy = !!detailsUpdatingStatus || updating;
            return (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mr: 'auto' }}>
                {actions.map((a) => (
                  <Button
                    key={a.key}
                    variant="contained"
                    onClick={() => void updateStatusFromDetails(a.nextStatus)}
                    disabled={busy || detailsLoading || !!detailsError}
                    sx={{
                      bgcolor: a.color,
                      '&:hover': { bgcolor: a.color },
                      textTransform: 'none',
                      fontWeight: 800,
                    }}
                  >
                    {detailsUpdatingStatus === a.nextStatus ? 'Updating...' : a.label}
                  </Button>
                ))}
              </Box>
            );
          })()}
          <Button onClick={closeOrderDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
