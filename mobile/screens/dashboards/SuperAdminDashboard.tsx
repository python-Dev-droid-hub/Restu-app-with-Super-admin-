import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { getSpacing } from '../../utils/responsive';
import { api } from '../../components/api/client';
import DashboardTab from '../../components/superadmin/DashboardTab';
import BranchesTab from '../../components/superadmin/BranchesTab';
import SuperAdminRevenueTab from '../../components/superadmin/SuperAdminRevenueTab';
import ProfileTab from '../../components/superadmin/ProfileTab';

const { width } = Dimensions.get('window');

type TabType = 'Dashboard' | 'Branches' | 'Financial' | 'Profile';

interface Branch {
  _id: string;
  name: string;
  location: string;
  manager?: {
    _id: string;
    displayName: string;
    rating: number;
  };
  isActive: boolean;
  revenue: number;
  orders: number;
  performance: number;
}

interface UserData {
  displayName?: string;
  role?: string;
  email?: string;
}

// Access Denied Component
const AccessDenied = () => (
  <View style={styles.accessDeniedContainer}>
    <Ionicons name="lock-closed" size={64} color={COLORS.error} />
    <Text style={styles.accessDeniedTitle}>Access Denied</Text>
    <Text style={styles.accessDeniedText}>
      You don't have permission to access this dashboard. Super Admin access only.
    </Text>
  </View>
);

export default function SuperAdminDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userData, setUserData] = useState<UserData>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Summary stats
  const [totalBranches, setTotalBranches] = useState(0);
  const [activeBranches, setActiveBranches] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  // ROLE CHECK - Load user role
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN') {
      loadDashboardData();
    }
  }, [userRole]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        setUserData({
          displayName: parsed.displayName || parsed.name || 'Super Admin',
          email: parsed.email || 'admin@restaurant.com',
          role: parsed.role,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all branches
      const branchesResponse = await api.get('/branches');
      if (branchesResponse.success && branchesResponse.data) {
        const branchData = branchesResponse.data.branches || [];
        setBranches(branchData);
        setTotalBranches(branchData.length);
        setActiveBranches(branchData.filter((b: Branch) => b.isActive).length);
      }

      // Load summary stats
      const statsResponse = await api.get('/dashboard/super-admin/summary');
      if (statsResponse.success && statsResponse.data) {
        setTotalRevenue(statsResponse.data.totalRevenue || 0);
        setTotalOrders(statsResponse.data.totalOrders || 0);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredBranches = branches.filter(branch =>
    branch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ROLE CHECK - Only SUPER_ADMIN can access
  if (userRole && userRole !== 'SUPER_ADMIN') {
    return <AccessDenied />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardTab />;
      case 'Branches':
        return <BranchesTab />;
      case 'Financial':
        return <SuperAdminRevenueTab />;
      case 'Profile':
        return <ProfileTab />;
      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading Super Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      backgroundColor: COLORS.lightBackground,
    }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header - WaiterDashboard style with user info + avatar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerRole}>Super Admin</Text>
          <Text style={styles.headerName}>{userData.displayName || 'Admin'}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Now</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderTabContent()}
      </View>

      {/* Bottom Navigation - 4 Tabs */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + (Platform.OS === 'android' ? 10 : 0) }]}>
        {[
          { key: 'Dashboard', icon: 'grid' },
          { key: 'Branches', icon: 'business' },
          { key: 'Financial', icon: 'cash' },
          { key: 'Profile', icon: 'person' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <Ionicons 
                name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)} 
                size={24} 
                color={isActive ? COLORS.orange : COLORS.lightText} 
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.key}</Text>
              {isActive && <View style={styles.navIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Branches</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>All Branches</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>Active Only</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>Inactive Only</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>High Performance (90%+)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>Needs Attention (&lt;90%)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.lightText,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: COLORS.lightText,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    paddingVertical: SPACING.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  headerRole: {
    fontSize: 12,
    color: COLORS.lightText,
    fontWeight: FONTS.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: FONTS.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: FONTS.weights.bold,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  overviewContent: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  tabContent: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  placeholderText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
    textAlign: 'center',
    marginTop: SPACING.section,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
    paddingBottom: 12,
    marginTop: 8,
    height: 84,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.lightText,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  navIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 3,
    backgroundColor: COLORS.orange,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
});
