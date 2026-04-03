import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
} from '@mui/material';
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

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
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

const AdminOrders: React.FC = () => {
  const { formatPrice } = useSettings();
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
  const itemsPerPage = 10;

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  useEffect(() => {
    // Load branches first, then orders with a small delay to ensure state updates
    const init = async () => {
      const map = await loadBranches();
      // Pass the map directly to avoid state timing issues
      await loadOrders(map);
    };
    init();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, activeTab, branchFilter, statusFilter, dateFilter, searchQuery]);

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
            
            // Customer name is already populated by backend
            const customerName = customerData?.displayName || 
              customerData?.name ||
              o?._doc?.customerName ||
              o?.customerName ||
              (customerId ? `Customer ${customerId.slice(-6)}` : 'Guest Order');
            const customerAvatar = customerData?.avatar || customerData?.image || customerData?.profileImage || customerData?.photo;
            
            // Fix order ID - ensure we have a valid ID (Mongoose doc has _id at top level)
            const orderId = o?._id || o?.id || o?._doc?._id || '';
            const orderNumber = o?._doc?.orderNumber || o?.orderNumber || o?.orderNo || (orderId ? `ORD${orderId.slice(-6).toUpperCase()}` : 'ORD000000');
            const status = o?._doc?.status || o?.status || 'unknown';
            
            return {
              _id: orderId || Math.random().toString(),
              orderNumber,
              customerName,
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
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdating(false);
      setStatusDialogOpen(false);
      setSelectedOrder(null);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
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

        <FormControl size="small" sx={{ minWidth: 150 }}>
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

        <FormControl size="small" sx={{ minWidth: 150 }}>
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
            minWidth: 200,
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
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                Order ID
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13, py: 2 }}>
                User
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
                  <TableCell colSpan={7}>
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
                    sx={{
                      '&:hover': { bgcolor: '#f8f9fa' },
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, color: '#FF6B35', fontSize: 14 }}>
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={order.customerAvatar ? api.getImageUrl(order.customerAvatar) : undefined}
                          sx={{ width: 32, height: 32, bgcolor: '#FF6B35' }}
                        >
                          {order.customerName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#333' }}>
                            {order.customerName}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#999' }}>
                            {order.items} items
                          </Typography>
                        </Box>
                      </Box>
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
                        onClick={(e) => handleMenuOpen(e, order)}
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
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark order <strong>{selectedOrder?.orderNumber}</strong> as <strong>{newStatus.toLowerCase()}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={updating}>Cancel</Button>
          <Button 
            onClick={confirmStatusUpdate} 
            variant="contained"
            disabled={updating}
            sx={{ bgcolor: newStatus === 'CANCELLED' ? '#F44336' : '#4CAF50', '&:hover': { bgcolor: newStatus === 'CANCELLED' ? '#D32F2F' : '#388E3C' } }}
          >
            {updating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
