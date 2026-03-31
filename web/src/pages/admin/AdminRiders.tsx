import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Radio,
  Skeleton,
  Alert,
  AlertTitle,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ArrowBack,
  TwoWheeler,
  LocalShipping,
  Warning,
  PersonAdd,
  Close,
  CheckCircle,
  AccessTime,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

// ==================== TYPES ====================
interface Branch {
  _id: string;
  name: string;
  branchName?: string;
}

interface Rider {
  riderId: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  deliveredOrders: number;
  totalDeliveries?: number;
  revenue: number;
  rating?: number;
  onDuty?: boolean;
  assignedBranch?: Branch | string;
  avatar?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customer?: { name?: string; displayName?: string };
  deliveryAddress?: { street?: string; address?: string };
  delivery_address?: string;
  totalAmount?: number;
  total?: number;
  createdAt: string;
  created_at?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellation_reason?: string;
  rider?: { _id?: string; name?: string; displayName?: string; onDuty?: boolean };
  branch?: { _id?: string; name?: string; branchName?: string };
}

// ==================== COMPONENT ====================
const AdminRiders: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'riders' | 'orders'>('riders');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      loadData();
    }
  }, [selectedBranch, branches]);

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (!response?.success) return;

      const rawList = response?.data?.branches || response?.data?.data?.branches || response?.data || [];
      const normalized = (Array.isArray(rawList) ? rawList : []).map((b: any) => ({
        _id: b?._id || b?.id,
        name: b?.name || b?.branchName || b?.restaurantName,
      }));
      setBranches(normalized);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRiders(), loadOrders()]);
    setLoading(false);
  };

  const loadRiders = async () => {
    try {
      const response: any = await api.getAdminRidersPerformance({ 
        branchId: selectedBranch 
      });
      
      if (response?.success && response?.data) {
        const ridersList = response.data.riders || [];
        setRiders(ridersList.map((r: any) => ({
          riderId: r.riderId || r._id || r.id,
          name: r.name || 'Unknown Rider',
          email: r.email,
          phone: r.phone,
          deliveredOrders: r.deliveredOrders || 0,
          revenue: r.revenue || 0,
          rating: r.rating || 5.0,
          onDuty: r.onDuty || false,
          assignedBranch: r.assignedBranch,
          avatar: r.avatar,
        })));
      }
    } catch (error) {
      console.error('Error loading riders:', error);
      // Fallback to users endpoint
      try {
        const params = new URLSearchParams();
        if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
        params.append('role', 'RIDER');
        
        const response: any = await api.get(`/users?${params.toString()}`);
        if (response?.success && response?.data) {
          const users = response.data.users || response.data.data || [];
          const ridersList = users.filter((u: any) => u.role === 'RIDER' || u.role === 'rider');
          setRiders(ridersList.map((r: any) => ({
            riderId: r._id || r.id,
            name: r.displayName || r.name || r.email || 'Unknown Rider',
            email: r.email,
            phone: r.phoneNumber || r.phone,
            deliveredOrders: r.totalDeliveries || 0,
            revenue: 0,
            rating: r.rating || 5.0,
            onDuty: r.onDuty || false,
            assignedBranch: r.assignedBranch || r.branch,
            avatar: r.avatar || r.image,
          })));
        }
      } catch (fallbackError) {
        console.error('Fallback error loading riders:', fallbackError);
      }
    }
  };

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.append('orderType', 'DELIVERY');
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      
      const response: any = await api.get(`/orders?${params.toString()}`);
      
      if (response?.success && response?.data) {
        const ordersList = response.data.orders || [];
        
        // Filter and sort orders
        const processedOrders = ordersList
          .filter((o: any) => {
            const needsRider = ['READY', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(o.status);
            const hasRider = o.rider && (o.rider._id || o.rider.id);
            const wasCancelled = o.status === 'CANCELLED' && hasRider;
            return needsRider || hasRider || wasCancelled;
          })
          .map((o: any) => ({
            _id: o._id || o.id,
            orderNumber: o.orderNumber || o.order_number || `ORD-${(o._id || '').slice(-6)}`,
            status: o.status,
            customerName: o.customer?.displayName || o.customer?.name || o.customerName,
            deliveryAddress: o.deliveryAddress || o.delivery_address,
            totalAmount: o.totalAmount || o.total_amount || o.total || 0,
            createdAt: o.createdAt || o.created_at,
            cancelledAt: o.cancelledAt || o.cancelled_at,
            cancellationReason: o.cancellationReason || o.cancellation_reason,
            rider: o.rider ? {
              _id: o.rider._id || o.rider.id,
              name: o.rider.displayName || o.rider.name,
              onDuty: o.rider.onDuty,
            } : null,
            branch: o.branch ? {
              _id: o.branch._id || o.branch.id,
              name: o.branch.name || o.branch.branchName,
            } : null,
          }))
          .sort((a: Order, b: Order) => {
            const aIsCancelled = a.status === 'CANCELLED';
            const bIsCancelled = b.status === 'CANCELLED';
            if (aIsCancelled && !bIsCancelled) return -1;
            if (!aIsCancelled && bIsCancelled) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        
        setOrders(processedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    setSelectedBranch(event.target.value);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'riders' | 'orders') => {
    setActiveTab(newValue);
  };

  const handleAssignClick = (order: Order) => {
    setSelectedOrder(order);
    setSelectedRider('');
    setAssignDialogOpen(true);
  };

  const handleAssignRider = async () => {
    if (!selectedOrder || !selectedRider) return;
    
    setAssigning(true);
    try {
      const response: any = await api.put(`/orders/${selectedOrder._id}/assign-rider`, { 
        riderId: selectedRider 
      });
      
      if (response?.success) {
        setAssignDialogOpen(false);
        setSelectedOrder(null);
        setSelectedRider('');
        loadOrders(); // Refresh orders
      } else {
        alert(response?.message || 'Failed to assign rider');
      }
    } catch (error: any) {
      console.error('Error assigning rider:', error);
      alert(error?.message || 'Failed to assign rider');
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return { bg: '#dcfce7', color: '#166534', label: 'Delivered' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' };
      case 'OUT_FOR_DELIVERY':
      case 'PICKED_UP':
        return { bg: '#dbeafe', color: '#1e40af', label: 'Out for Delivery' };
      case 'READY':
        return { bg: '#fed7aa', color: '#9a3412', label: 'Ready' };
      case 'PREPARING':
        return { bg: '#f3f4f6', color: '#6b7280', label: 'Preparing' };
      case 'RIDER_ASSIGNED':
        return { bg: '#e0e7ff', color: '#3730a3', label: 'Assigned' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', label: status };
    }
  };

  const getDutyColor = (onDuty?: boolean) => ({
    bg: onDuty ? '#dcfce7' : '#fee2e2',
    color: onDuty ? '#166534' : '#dc2626',
    label: onDuty ? 'On Duty' : 'Off Duty',
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/dashboard')}>
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Riders Management
        </Typography>
      </Box>

      {/* Branch Filter */}
      <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Branch:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <Select
              value={selectedBranch}
              onChange={handleBranchChange}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Branches</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch._id} value={branch._id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ px: 2, pt: 1 }}>
            <Tab 
              value="riders" 
              label={`Riders (${riders.length})`}
              icon={<TwoWheeler />}
              iconPosition="start"
            />
            <Tab 
              value="orders" 
              label={`Orders (${orders.length})`}
              icon={<LocalShipping />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {activeTab === 'riders' ? (
            // Riders Tab
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#666' }}>Rider</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#666' }} align="center">Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#666' }} align="center">Delivered Orders</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#666' }} align="center">Rating</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#666' }} align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <TableRow key={`rider-skel-${idx}`}>
                        <TableCell><Skeleton width="60%" /></TableCell>
                        <TableCell align="center"><Skeleton width={80} sx={{ mx: 'auto' }} /></TableCell>
                        <TableCell align="center"><Skeleton width={60} sx={{ mx: 'auto' }} /></TableCell>
                        <TableCell align="center"><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                        <TableCell align="right"><Skeleton width={90} sx={{ ml: 'auto' }} /></TableCell>
                      </TableRow>
                    ))
                  ) : riders.length > 0 ? (
                    riders.map((rider) => (
                      <TableRow key={rider.riderId} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: '#FF6B35' }}>
                              {rider.avatar ? (
                                <img src={rider.avatar} alt={rider.name} style={{ width: '100%', height: '100%' }} />
                              ) : (
                                <TwoWheeler />
                              )}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                                {rider.name}
                              </Typography>
                              {rider.email && (
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                  {rider.email}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getDutyColor(rider.onDuty).label}
                            size="small"
                            sx={{
                              bgcolor: getDutyColor(rider.onDuty).bg,
                              color: getDutyColor(rider.onDuty).color,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#666', fontWeight: 500 }}>
                          {rider.deliveredOrders?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 600, color: '#f59e0b' }}>
                              ★ {rider.rating?.toFixed(1) || '5.0'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                          {formatPrice(rider.revenue || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: '#666' }}>
                        <TwoWheeler sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
                        <Typography>No riders found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // Orders Tab
            <Box>
              {orders.filter(o => o.status === 'CANCELLED').length > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <AlertTitle>Cancelled Orders Needing Reassignment</AlertTitle>
                  There are {orders.filter(o => o.status === 'CANCELLED').length} cancelled orders that need to be reassigned to a new rider.
                </Alert>
              )}
              
              <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }}>Order</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }}>Rider</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#666' }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={`order-skel-${idx}`}>
                          <TableCell><Skeleton width="80%" /></TableCell>
                          <TableCell><Skeleton width={80} /></TableCell>
                          <TableCell><Skeleton width="60%" /></TableCell>
                          <TableCell><Skeleton width={100} /></TableCell>
                          <TableCell><Skeleton width={80} /></TableCell>
                          <TableCell align="center"><Skeleton width={100} sx={{ mx: 'auto' }} /></TableCell>
                        </TableRow>
                      ))
                    ) : orders.length > 0 ? (
                      orders.map((order) => {
                        const isCancelled = order.status === 'CANCELLED';
                        const needsAssignment = !order.rider && ['READY', 'PREPARING'].includes(order.status);
                        const needsReassignment = isCancelled && order.rider;
                        const statusColor = getStatusColor(order.status);
                        
                        return (
                          <TableRow 
                            key={order._id} 
                            sx={{ 
                              '&:hover': { bgcolor: '#fafafa' },
                              ...(needsReassignment && { bgcolor: '#fef2f2' }),
                            }}
                          >
                            <TableCell>
                              <Typography sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                                #{order.orderNumber}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#666' }}>
                                <AccessTime sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                                {formatDate(order.createdAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusColor.label}
                                size="small"
                                sx={{
                                  bgcolor: statusColor.bg,
                                  color: statusColor.color,
                                  fontWeight: 600,
                                }}
                              />
                              {isCancelled && order.cancellationReason && (
                                <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', mt: 0.5 }}>
                                  {order.cancellationReason}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ color: '#1a1a2e' }}>
                                {order.customerName || 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {order.rider ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#FF6B35', fontSize: 12 }}>
                                    {order.rider.name?.[0] || 'R'}
                                  </Avatar>
                                  <Typography sx={{ color: '#666' }}>
                                    {order.rider.name}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography sx={{ color: '#f59e0b', fontStyle: 'italic' }}>
                                  Not assigned
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                                {formatPrice(order.totalAmount || 0)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {(needsAssignment || needsReassignment) && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<PersonAdd />}
                                  onClick={() => handleAssignClick(order)}
                                  sx={{
                                    bgcolor: needsReassignment ? '#dc2626' : '#FF6B35',
                                    '&:hover': {
                                      bgcolor: needsReassignment ? '#b91c1c' : '#e55a2b',
                                    },
                                  }}
                                >
                                  {needsReassignment ? 'Reassign' : 'Assign'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', color: '#666' }}>
                          <LocalShipping sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
                          <Typography>No delivery orders found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Assign Rider Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedOrder?.status === 'CANCELLED' ? 'Reassign Rider' : 'Assign Rider'}
            </Typography>
            <IconButton onClick={() => setAssignDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Order #{selectedOrder?.orderNumber}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Select a rider:
          </Typography>
          <List>
            {riders.filter(r => r.onDuty).length === 0 ? (
              <Alert severity="warning">
                No riders currently on duty. Please ask a rider to go on duty first.
              </Alert>
            ) : (
              riders
                .filter(r => r.onDuty)
                .map((rider) => (
                  <ListItem
                    key={rider.riderId}
                    onClick={() => setSelectedRider(rider.riderId)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: selectedRider === rider.riderId ? '#fff7ed' : 'transparent',
                      border: selectedRider === rider.riderId ? '2px solid #FF6B35' : '1px solid #e5e7eb',
                      '&:hover': {
                        bgcolor: selectedRider === rider.riderId ? '#fff7ed' : '#f9fafb',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#FF6B35' }}>
                        <TwoWheeler />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 600 }}>
                          {rider.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          ★ {rider.rating?.toFixed(1) || '5.0'} • {rider.deliveredOrders || 0} deliveries
                        </Typography>
                      }
                    />
                    <Radio checked={selectedRider === rider.riderId} />
                  </ListItem>
                ))
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAssignDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAssignRider}
            variant="contained"
            disabled={!selectedRider || assigning}
            startIcon={assigning ? null : <CheckCircle />}
            sx={{
              bgcolor: '#FF6B35',
              '&:hover': { bgcolor: '#e55a2b' },
            }}
          >
            {assigning ? 'Assigning...' : (selectedOrder?.status === 'CANCELLED' ? 'Reassign' : 'Assign')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRiders;
