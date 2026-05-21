import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import tab components
import CustomerOverviewTab from './components/CustomerOverviewTab';
import CustomerOrdersTab from './components/CustomerOrdersTab';
import CustomerFavoritesTab from './components/CustomerFavoritesTab';
import CustomerWalletTab from './components/CustomerWalletTab';
import BranchSelector from './components/BranchSelector';
import CustomerMenuScreen from '../CustomerMenuScreen';

// Import location service
import { getSavedBranch, fetchBranches, Branch } from '../../services/locationService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#95A5A6',
};

type TabType = 'home' | 'menu' | 'orders' | 'favorites' | 'profile';

interface CustomerStats {
  totalOrders: number;
  favoriteItems: number;
  totalSpent: number;
  activeOrders: number;
  averageRating: number;
}

interface UserData {
  displayName?: string;
  role?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export default function CustomerDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [stats, setStats] = useState<CustomerStats>({
    totalOrders: 0,
    favoriteItems: 0,
    totalSpent: 0,
    activeOrders: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData>({});
  
  // Branch selection state
  const [showBranchSelector, setShowBranchSelector] = useState(true);
  const [branchSelectionRequired, setBranchSelectionRequired] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadUserData();
    checkAndLoadBranch();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkAndLoadBranch();
    }, [])
  );

  // Check saved branch on load
  const checkAndLoadBranch = async () => {
    try {
      const savedBranchId = await getSavedBranch();
      let allBranches: Branch[] = [];
      try {
        allBranches = await fetchBranches();
      } catch (e) {
        allBranches = [];
      }
      setBranches(allBranches);

      console.log('[CustomerDashboard] savedBranchId:', savedBranchId);
      console.log('[CustomerDashboard] branches loaded:', allBranches.length);

      if (savedBranchId && allBranches.length > 0) {
        const branch = allBranches.find((b) => b._id === savedBranchId);
        if (branch) {
          setSelectedBranch(branch);
          setBranchSelectionRequired(false);
          setShowBranchSelector(false);
          return;
        }
      }

      // No saved branch OR saved branch not found OR branches failed to load
      setSelectedBranch(null);
      setBranchSelectionRequired(true);
      setShowBranchSelector(true);
    } catch (error) {
      setSelectedBranch(null);
      setBranchSelectionRequired(true);
      setShowBranchSelector(true);
    }
  };

  const tabBarBaseHeight = 60;
  const safeBottom = Math.max(insets.bottom || 0, 0);
  const tabBarHeight = tabBarBaseHeight + safeBottom;
  const tabBarPaddingBottom = safeBottom > 0 ? safeBottom : 8;

  const handleBranchSelected = (branch: Branch) => {
    setSelectedBranch(branch);
    setBranchSelectionRequired(false);
    setShowBranchSelector(false);
  };

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        setUserData(JSON.parse(userDataStr));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const statsResponse = await api.get('/dashboard/customer/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalOrders: statsResponse.data.totalOrders || 0,
          favoriteItems: statsResponse.data.favoriteItems || 0,
          totalSpent: statsResponse.data.totalSpent || 0,
          activeOrders: statsResponse.data.activeOrders || 0,
          averageRating: statsResponse.data.averageRating || 0,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userData');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Welcome' as any }],
      })
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'My Dashboard';
      case 'menu':
        return 'Menu';
      case 'orders':
        return 'My Orders';
      case 'favorites':
        return 'Favorites';
      case 'profile':
        return 'My Account';
      default:
        return 'My Dashboard';
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <CustomerOverviewTab
            userData={{
              name: userData.displayName || 'Customer',
              email: userData.email || '',
              phone: userData.phone || '',
              avatar: userData.avatar || null,
            }}
            stats={{
              totalOrders: stats.totalOrders,
              totalSpent: stats.totalSpent,
              averageRating: stats.averageRating,
              pendingOrders: stats.activeOrders,
            }}
            formatPrice={formatPrice}
            onViewOrders={() => setActiveTab('orders')}
            onViewFavorites={() => setActiveTab('favorites')}
          />
        );
      case 'orders':
        return <CustomerOrdersTab formatPrice={formatPrice} />;
      case 'favorites':
        return <CustomerFavoritesTab />;
      case 'profile':
        return <CustomerWalletTab formatPrice={formatPrice} />;
      case 'menu':
        return <CustomerMenuScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top || 0, STATUSBAR_HEIGHT),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            {Platform.OS !== 'web' && (
              <>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                <Text style={styles.greeting}>
                  {`${getGreeting()}, ${userData?.displayName?.split(' ')[0] || 'Customer'}!`}
                </Text>
              </>
            )}
          </View>
          {/* Branch Location Indicator */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowBranchSelector(true)}
          >
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {selectedBranch ? `${selectedBranch.city} - ${selectedBranch.branchName}` : 'Select Location'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Branch Selector Modal */}
      <BranchSelector
        visible={showBranchSelector}
        onClose={() => setShowBranchSelector(false)}
        onBranchSelected={handleBranchSelected}
        requireSelection={branchSelectionRequired}
      />

      {/* Tab Content */}
      <View style={[styles.content, { paddingBottom: tabBarHeight }]}>
        {renderTabContent()}
      </View>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: tabBarPaddingBottom,
            height: tabBarHeight,
          },
        ]}
      >
        {[
          { id: 'home', icon: 'home', label: 'Home' },
          { id: 'menu', icon: 'grid-outline', label: 'Categories' },
          { id: 'orders', icon: 'receipt', label: 'Orders' },
          { id: 'favorites', icon: 'heart', label: 'Favorites' },
          { id: 'profile', icon: 'person', label: 'Profile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.id as TabType)}
          >
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={activeTab === tab.id ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.navText,
                activeTab === tab.id && styles.navTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  greeting: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '500',
    maxWidth: 200,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  navTextActive: {
    color: '#e87e35',
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },
});
