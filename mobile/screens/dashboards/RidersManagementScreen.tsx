import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { useUserData } from '../../hooks/useUserData';

const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#3498DB',
  darkText: '#1A1A2E',
  lightBg: '#F8F9FA',
  white: '#FFFFFF',
  muted: '#8E8E93',
  border: '#E5E5EA',
  cardBg: '#FFFFFF',
  orange: '#FF7A59',
  green: '#2BC48A',
  blue: '#6C63FF',
  red: '#FF4D4D',
  gray: '#95A5A6',
};

interface Branch {
  _id: string;
  name: string;
  branchName?: string;
}

interface Rider {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  onDuty: boolean;
  rating?: number;
  totalDeliveries?: number;
  assignedBranch?: Branch;
  avatar?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  deliveryAddress?: string;
  rider?: Rider;
  branch?: Branch;
  totalAmount?: number;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rejectionReason?: string;
}

interface RidersManagementScreenProps {
  route?: { params?: { userRole?: 'ADMIN' | 'MANAGER'; assignedBranch?: Branch } };
}

export default function RidersManagementScreen({ route }: RidersManagementScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { profileImage } = useUserData();
  
  // Get parent navigator - will be undefined for stack screens
  const tabNavigation = navigation.getParent();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'riders' | 'orders'>('riders');
  const [selectedRiderForAssign, setSelectedRiderForAssign] = useState<Rider | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER'>('ADMIN');
  const [managerBranch, setManagerBranch] = useState<Branch | null>(null);

  // Load data on mount
  useEffect(() => {
    loadUserRole();
    loadInitialData();
  }, []);

  const loadUserRole = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const role = parsed.role || 'ADMIN';
        setUserRole(role === 'BRANCH_MANAGER' ? 'MANAGER' : 'ADMIN');
        
        // For manager, set their assigned branch
        if (role === 'BRANCH_MANAGER') {
          const branchData = parsed.assignedBranch || parsed.branch;
          if (branchData) {
            setManagerBranch({
              _id: branchData._id || branchData.id,
              name: branchData.name || branchData.branchName,
            });
            setSelectedBranch(branchData._id || branchData.id || 'all');
          }
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  // Normalize media URL to full URL if it's a relative path
  const normalizeMediaUrl = useCallback((uri?: string): string => {
    if (!uri) return '';
    const value = String(uri);
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }
    const normalizedPath = value.startsWith('/')
      ? value
      : (value.startsWith('uploads/') || value.startsWith('src/uploads/'))
          ? `/${value.replace(/^src\//, '')}`
          : value;
    if (!normalizedPath.startsWith('/')) return normalizedPath;
    const base = (api as any).getBaseURL ? (api as any).getBaseURL() : '';
    const host = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${host}${normalizedPath}`;
  }, []);

  // Reload when branch changes
  useEffect(() => {
    loadRiders();
    loadOrders();
  }, [selectedBranch]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadBranches(),
      loadRiders(),
      loadOrders(),
    ]);
    setLoading(false);
  };

  const loadBranches = async () => {
    if (userRole === 'MANAGER') return; // Managers don't need branch list
    
    try {
      const response: any = await api.get('/branches');
      if (response?.success) {
        const rawList = response?.data?.branches || response?.data?.data?.branches || [];
        const normalized = (Array.isArray(rawList) ? rawList : []).map((b: any) => ({
          _id: b?._id || b?.id,
          name: b?.name || b?.branchName || b?.restaurantName,
        })).filter((b: any) => !!b._id && !!b.name);
        setBranches(normalized);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadRiders = async () => {
    try {
      const params = new URLSearchParams();
      
      if (userRole === 'MANAGER' && managerBranch?._id) {
        params.append('branchId', managerBranch._id);
      } else if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      
      // Use the dashboard riders performance endpoint for real stats
      const response = await api.get(`/dashboard/admin/performance/riders?${params.toString()}`);
      console.log('🔥 RIDERS_MANAGEMENT: Riders API response:', JSON.stringify(response.data?.riders?.[0], null, 2));
      if (response.success && response.data) {
        const ridersList = response.data.riders || [];
        
        // API already filters by branch server-side, so we use all returned riders
        console.log('🔥 RIDERS_MANAGEMENT: Showing', ridersList.length, 'riders from API');
        
        setRiders(ridersList.map((r: any) => ({
          _id: r.riderId || r._id || r.id,
          name: r.name || 'Unknown Rider',
          email: r.email || '',
          phone: r.phoneNumber || r.phone,
          onDuty: r.onDuty || false,
          rating: r.rating || 5.0,
          totalDeliveries: r.deliveredOrders || r.totalDeliveries || 0,
          revenue: r.revenue || 0,
          assignedBranch: r.assignedBranch || r.branch,
          avatar: normalizeMediaUrl(r.avatar || r.image || r.profileImage),
        })));
      }
    } catch (error) {
      console.error('Error loading riders:', error);
      // Fallback to users endpoint if dashboard endpoint fails
      try {
        const params = new URLSearchParams();
        if (userRole === 'MANAGER' && managerBranch?._id) {
          params.append('branchId', managerBranch._id);
        } else if (selectedBranch !== 'all') {
          params.append('branchId', selectedBranch);
        }
        params.append('role', 'RIDER');
        
        const response = await api.get(`/users?${params.toString()}`);
        if (response.success && response.data) {
          const users = response.data.users || response.data.data || [];
          const ridersList = users.filter((u: any) => u.role === 'RIDER' || u.role === 'rider');
          setRiders(ridersList.map((r: any) => ({
            _id: r._id || r.id,
            name: r.displayName || r.name || r.email || 'Unknown Rider',
            email: r.email,
            phone: r.phoneNumber || r.phone,
            onDuty: r.onDuty || false,
            rating: r.rating || 5.0,
            totalDeliveries: r.totalDeliveries || 0,
            assignedBranch: r.assignedBranch || r.branch,
            avatar: normalizeMediaUrl(r.avatar || r.image || r.profileImage),
          })));
        }
      } catch (fallbackError) {
        console.error('Fallback error loading riders:', fallbackError);
      }
    }
  };

  // Helper to extract address from various API response formats
  const extractAddress = (order: any): string => {
    // For delivery orders, look for delivery address fields
    // For dine-in, the addressLine contains table info
    const possibleFields = [
      // Direct delivery address fields
      order?.deliveryAddress?.street,
      order?.deliveryAddress?.address,
      order?.deliveryAddress?.fullAddress,
      order?.deliveryAddress?.formatted,
      order?.delivery_address,
      order?.deliveryAddress,
      // Generic address fields (could be delivery or table)
      order?.addressLine,
      order?.address,
      order?.shippingAddress,
      order?.shipping_address,
      order?.customerAddress,
      // Customer nested
      order?.customer?.address,
      order?.customer?.deliveryAddress,
      order?.customer?.street,
      // Location object
      order?.location?.address,
      order?.location?.street,
    ];

    for (const field of possibleFields) {
      if (field && typeof field === 'string' && field.trim()) {
        return field.trim();
      }
      if (field && typeof field === 'object' && field.toString) {
        const str = field.toString();
        if (str && str !== '[object Object]') {
          return str;
        }
      }
    }

    // Last resort: check if deliveryAddress is a string directly
    if (order?.deliveryAddress && typeof order.deliveryAddress === 'string') {
      return order.deliveryAddress;
    }

    return '';
  };

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.append('orderType', 'DELIVERY');
      
      if (userRole === 'MANAGER' && managerBranch?._id) {
        params.append('branchId', managerBranch._id);
      } else if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      
      console.log('🔥 RIDERS_MANAGEMENT: Loading orders with params:', params.toString());
      
      // Get orders with rider assignment info
      const response = await api.get(`/orders?${params.toString()}`);
      
      console.log('🔥 RIDERS_MANAGEMENT: Orders count:', response.data?.orders?.length);
      
      if (response.data?.orders?.[0]) {
        const sampleOrder = response.data.orders[0];
        console.log('🔥 RIDERS_MANAGEMENT: Sample order keys:', Object.keys(sampleOrder));
        console.log('🔥 RIDERS_MANAGEMENT: Sample order deliveryAddress:', JSON.stringify(sampleOrder.deliveryAddress));
        console.log('🔥 RIDERS_MANAGEMENT: Sample order customer:', JSON.stringify(sampleOrder.customer));
        console.log('🔥 RIDERS_MANAGEMENT: Full sample order:', JSON.stringify(sampleOrder, null, 2));
      }
      
      if (response.success && response.data) {
        const ordersList = response.data.orders || [];
        
        // Filter to only show DELIVERY orders (server filter may not work correctly)
        const deliveryOrders = ordersList.filter((o: any) => 
          o.orderType === 'DELIVERY' || o.order_type === 'DELIVERY'
        );
        
        console.log('🔥 RIDERS_MANAGEMENT: DELIVERY orders:', deliveryOrders.map((o: any) => ({ 
          id: o._id, 
          orderType: o.orderType,
          addressLine: o.addressLine,
          deliveryAddress: o.deliveryAddress,
          hasRider: !!o.rider
        })));
        
        console.log('🔥 RIDERS_MANAGEMENT: DELIVERY orders only:', deliveryOrders.length, 'of', ordersList.length);
        
        const processedOrders = deliveryOrders
          .filter((o: any) => {
            const needsRider = ['READY', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(o.status);
            const hasRider = o.rider && o.rider._id;
            const wasCancelled = o.status === 'CANCELLED' && hasRider;
            const wasRejected = o.rejectionReason && !o.rider;
            return needsRider || hasRider || wasCancelled || wasRejected;
          })
          .map((o: any) => {
            const addr = extractAddress(o);
            console.log('🔥 RIDERS_MANAGEMENT: Order', o._id, 'address:', addr);
            return {
              _id: o._id || o.id,
              orderNumber: o.orderNumber || o.order_number || `ORD-${(o._id || '').slice(-6)}`,
              status: o.status,
              customerName: o.customer?.displayName || o.customer?.name || o.customerName,
              deliveryAddress: addr || 'No address provided',
              rider: o.rider ? {
                _id: o.rider._id,
                name: o.rider.displayName || o.rider.name,
                onDuty: o.rider.onDuty,
              } : null,
              branch: o.branch ? {
                _id: o.branch._id,
                name: o.branch.name || o.branch.branchName,
              } : null,
              totalAmount: o.totalAmount || o.total_amount || o.total || 0,
              createdAt: o.createdAt || o.created_at,
              cancelledAt: o.cancelledAt || o.cancelled_at,
              cancellationReason: o.cancellationReason || o.cancellation_reason,
              rejectionReason: o.rejectionReason,
            };
          })
          .sort((a: Order, b: Order) => {
            const aIsCancelled = a.status === 'CANCELLED';
            const bIsCancelled = b.status === 'CANCELLED';
            if (aIsCancelled && !bIsCancelled) return -1;
            if (!aIsCancelled && bIsCancelled) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        
        console.log('🔥 RIDERS_MANAGEMENT: Processed orders count:', processedOrders.length);
        setOrders(processedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRiders(), loadOrders()]);
    setRefreshing(false);
  };

  const handleAssignOrder = async (orderId: string, riderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/assign-rider`, { riderId });
      if (response.success) {
        Alert.alert('Success', 'Order assigned to rider successfully');
        setShowAssignModal(false);
        setOrderToAssign(null);
        setSelectedRiderForAssign(null);
        loadOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to assign order');
      }
    } catch (error: any) {
      console.error('Error assigning order:', error);
      Alert.alert('Error', error?.message || 'Failed to assign order');
    }
  };

  const openAssignModal = (order: Order) => {
    setOrderToAssign(order);
    setShowAssignModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return COLORS.success;
      case 'OUT_FOR_DELIVERY':
      case 'PICKED_UP':
        return COLORS.info;
      case 'READY':
        return COLORS.warning;
      case 'CANCELLED':
        return COLORS.danger;
      case 'RIDER_ASSIGNED':
        return COLORS.blue;
      case 'PREPARING':
        return COLORS.orange;
      default:
        return COLORS.gray;
    }
  };

  const renderBranchFilter = () => {
    if (userRole === 'MANAGER') {
      return (
        <View style={styles.branchInfo}>
          <Ionicons name="business-outline" size={18} color={COLORS.orange} />
          <Text style={styles.branchInfoText}>
            {managerBranch?.name || 'My Branch'}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.branchSelector}
        onPress={() => setShowBranchDropdown(!showBranchDropdown)}
      >
        <Ionicons name="business-outline" size={18} color={COLORS.darkText} />
        <Text style={styles.branchText}>
          {selectedBranch === 'all' 
            ? 'All Branches' 
            : branches.find(b => b._id === selectedBranch)?.name || 'Select Branch'}
        </Text>
        <Ionicons 
          name={showBranchDropdown ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={COLORS.muted} 
        />
      </TouchableOpacity>
    );
  };

  const renderRidersList = () => {
    if (riders.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>No riders found</Text>
        </View>
      );
    }

    return riders.map((rider) => (
      <View key={rider._id} style={styles.riderCard}>
        <View style={styles.riderHeader}>
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              {rider.avatar ? (
                <Image source={{ uri: rider.avatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={32} color={COLORS.white} />
              )}
            </View>
            <View>
              <Text style={styles.riderName}>{rider.name}</Text>
              <Text style={styles.riderEmail}>{rider.email}</Text>
              {rider.phone && (
                <Text style={styles.riderPhone}>{rider.phone}</Text>
              )}
            </View>
          </View>
          <View style={[
            styles.dutyBadge,
            { backgroundColor: rider.onDuty ? COLORS.success + '20' : COLORS.danger + '20' }
          ]}>
            <View style={[
              styles.dutyDot,
              { backgroundColor: rider.onDuty ? COLORS.success : COLORS.danger }
            ]} />
            <Text style={[
              styles.dutyText,
              { color: rider.onDuty ? COLORS.success : COLORS.danger }
            ]}>
              {rider.onDuty ? 'On Duty' : 'Off Duty'}
            </Text>
          </View>
        </View>

        <View style={styles.riderStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rider.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rider.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: 14 }]} numberOfLines={1}>
              {rider.assignedBranch?.name || rider.assignedBranch?.branchName || managerBranch?.name || 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Branch</Text>
          </View>
        </View>
      </View>
    ));
  };

  const renderOrdersList = () => {
    if (orders.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>No delivery orders found</Text>
        </View>
      );
    }

    return orders.map((order) => {
      const isCancelled = order.status === 'CANCELLED';
      const isRejected = order.rejectionReason && !order.rider;
      const needsReassignment = (isCancelled || isRejected) && order.rider;
      const needsAssignment = !order.rider && ['READY', 'PREPARING'].includes(order.status);

      return (
        <View key={order._id} style={[
          styles.orderCard,
          (needsReassignment || isRejected) && styles.cancelledOrderCard
        ]}>
          {needsReassignment && (
            <View style={styles.reassignmentBanner}>
              <Ionicons name="warning" size={16} color={COLORS.white} />
              <Text style={styles.reassignmentText}>
                {isRejected ? 'Rider Rejected - Needs Reassignment' : 'Rider Cancelled - Needs Reassignment'}
              </Text>
            </View>
          )}
          
          {isRejected && !needsReassignment && (
            <View style={[styles.reassignmentBanner, { backgroundColor: COLORS.warning }]}>
              <Ionicons name="alert-circle" size={16} color={COLORS.white} />
              <Text style={styles.reassignmentText}>
                Rider Rejected - Unassigned
              </Text>
            </View>
          )}
          
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
              <Text style={styles.orderCustomer}>{order.customerName || 'Unknown Customer'}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(order.status) }
              ]}>
                {order.status}
              </Text>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.muted} />
              <Text style={styles.detailText} numberOfLines={2}>
                {order.deliveryAddress || 'No address provided'}
              </Text>
            </View>
            
            {order.rider ? (
              <View style={styles.detailRow}>
                <Ionicons name="bicycle-outline" size={16} color={COLORS.muted} />
                <Text style={styles.detailText}>
                  Assigned to: {order.rider.name}
                </Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                <Text style={[styles.detailText, { color: COLORS.warning }]}>
                  No rider assigned
                </Text>
              </View>
            )}

            {(order.cancellationReason || order.rejectionReason) && (
              <View style={styles.detailRow}>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                <Text style={[styles.detailText, { color: COLORS.danger }]}>
                  Reason: {order.rejectionReason || order.cancellationReason}
                </Text>
              </View>
            )}
          </View>

          {(needsAssignment || needsReassignment || isRejected) && (
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => openAssignModal(order)}
            >
              <Ionicons name="person-add" size={18} color={COLORS.white} />
              <Text style={styles.assignButtonText}>
                {needsReassignment || isRejected ? 'Reassign Rider' : 'Assign Rider'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  };

  return (
    <View style={[styles.container]}>
      <ResponsiveHeader
        title="Riders Management"
        profileImage={profileImage}
        onNotificationPress={() => navigation.navigate('AdminNotifications' as never)}
        onProfilePress={() => navigation.navigate('AdminSettings' as never)}
      />

      {/* Branch Filter */}
      <View style={styles.filterContainer}>
        {renderBranchFilter()}
      </View>

      {/* Branch Dropdown for Admin */}
      {userRole === 'ADMIN' && showBranchDropdown && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedBranch('all');
              setShowBranchDropdown(false);
            }}
          >
            <Text style={selectedBranch === 'all' ? styles.dropdownTextActive : styles.dropdownText}>
              All Branches
            </Text>
          </TouchableOpacity>
          {branches.map((branch) => (
            <TouchableOpacity
              key={branch._id}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedBranch(branch._id);
                setShowBranchDropdown(false);
              }}
            >
              <Text style={selectedBranch === branch._id ? styles.dropdownTextActive : styles.dropdownText}>
                {branch.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'riders' && styles.activeTab]}
          onPress={() => setActiveTab('riders')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'riders' ? COLORS.primary : COLORS.muted} 
          />
          <Text style={[styles.tabText, activeTab === 'riders' && styles.activeTabText]}>
            Riders ({riders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons 
            name="receipt" 
            size={20} 
            color={activeTab === 'orders' ? COLORS.primary : COLORS.muted} 
          />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'riders' ? renderRidersList() : renderOrdersList()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Assign Rider Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {orderToAssign?.status === 'CANCELLED' ? 'Reassign Rider' : 'Assign Rider'}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Order #{orderToAssign?.orderNumber}
            </Text>

            <Text style={styles.sectionLabel}>Select Rider:</Text>

            <ScrollView style={styles.ridersList}>
              {riders.filter(r => r.onDuty).length === 0 ? (
                <Text style={styles.noRidersText}>
                  No riders currently on duty. Please ask a rider to go on duty first.
                </Text>
              ) : (
                riders
                  .filter(r => r.onDuty)
                  .map((rider) => (
                    <TouchableOpacity
                      key={rider._id}
                      style={[
                        styles.riderSelectItem,
                        selectedRiderForAssign?._id === rider._id && styles.riderSelectItemActive
                      ]}
                      onPress={() => setSelectedRiderForAssign(rider)}
                    >
                      <View style={styles.riderSelectInfo}>
                        <Text style={styles.riderSelectName}>{rider.name}</Text>
                        <Text style={styles.riderSelectDetails}>
                          Rating: {rider.rating?.toFixed(1) || '5.0'} • {rider.totalDeliveries || 0} deliveries
                        </Text>
                      </View>
                      {selectedRiderForAssign?._id === rider._id && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.assignConfirmButton,
                !selectedRiderForAssign && styles.assignConfirmButtonDisabled
              ]}
              onPress={() => {
                if (orderToAssign && selectedRiderForAssign) {
                  handleAssignOrder(orderToAssign._id, selectedRiderForAssign._id);
                }
              }}
              disabled={!selectedRiderForAssign}
            >
              <Text style={styles.assignConfirmButtonText}>
                {orderToAssign?.status === 'CANCELLED' ? 'Reassign Order' : 'Assign Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999 }}>
        <AdminBottomNavigation 
          currentRoute="RidersManagement"
          tabNavigation={tabNavigation}
        />
      </View>
    </View>
  );
}

import { Image } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange + '20',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  branchText: {
    fontSize: 14,
    color: COLORS.darkText,
    fontWeight: '500',
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  dropdownTextActive: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
  },
  activeTab: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 16,
  },
  // Rider Card Styles
  riderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  riderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  riderEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  riderPhone: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dutyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  riderStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  // Order Card Styles
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cancelledOrderCard: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  reassignmentBanner: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  reassignmentText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  orderCustomer: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  assignButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
  },
  assignButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  ridersList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  noRidersText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  riderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 8,
  },
  riderSelectItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  riderSelectInfo: {
    flex: 1,
  },
  riderSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  riderSelectDetails: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  assignConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  assignConfirmButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
  },
  assignConfirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
