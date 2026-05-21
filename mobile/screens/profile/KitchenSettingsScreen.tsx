import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { isAdminRole } from '../../utils/permissionHelpers';
import ManageIngredientsScreen from './ManageIngredientsScreen';
import SetupIngredientsScreen from './SetupIngredientsScreen';

// Admin Dashboard Color Scheme
const DESIGN = {
  headerBg: '#2C3E50',
  headerText: '#FFFFFF',
  pageBg: '#F5F5F5',
  cardBg: '#FFFFFF',
  primaryText: '#2C3E50',
  secondaryText: '#95A5A6',
  placeholderText: '#BDC3C7',
  orange: '#FF6B35',
  blue: '#3498DB',
  green: '#2ECC71',
  red: '#E74C3C',
  divider: '#ECEFF1',
  border: '#E0E0E0',
};

interface KitchenSettingsScreenProps {
  onBack?: () => void;
  userRole?: string;
  branchId?: string;
}

export default function KitchenSettingsScreen({ onBack, userRole, branchId }: KitchenSettingsScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<'main' | 'manage' | 'setup'>('main');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [userRoleState, setUserRoleState] = useState<string>(userRole || 'CHEF');
  
  const [prefs, setPrefs] = useState({
    orderNotifications: true,
    inventoryAlerts: true,
    showMetrics: true,
    allowSharing: false,
  });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>(userRole || '');

  // Load user role from AsyncStorage if not provided as prop
  useEffect(() => {
    const loadUserRole = async () => {
      if (!userRole) {
        try {
          const stored = await AsyncStorage.getItem('userData');
          if (stored) {
            const parsed = JSON.parse(stored);
            setCurrentUserRole(parsed.role || '');
          }
        } catch (error) {
          console.log('Error loading user role:', error);
        }
      }
    };
    loadUserRole();
  }, [userRole]);

  const menuItems = [
    { name: 'Notifications', icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(isAdminRole(currentUserRole) ? [{ name: 'Branches', icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDealCampaigns' },
    { name: 'Coupons', icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: 'Categories', icon: 'grid-outline', screen: 'AdminCategories' },
    { name: 'Reports', icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: 'Settings', icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  const isManager = userRoleState === 'MANAGER' || userRoleState === 'ADMIN' || currentUserRole === 'BRANCH_MANAGER';

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await api.get('/inventory');
      if (response.success && response.data) {
        const items = response.data.items || [];
        setInventory(items.slice(0, 5));
        setTotalIngredients(items.length);
        setLowStockCount(response.data.lowStockCount || items.filter((i: any) => 
          (i.quantityAvailable || i.quantity_available) <= (i.reorderLevel || i.reorder_level)
        ).length);
        
        if (items.length === 0 && isManager && currentView === 'main') {
          setTimeout(() => {
            Alert.alert(
              'Setup Required',
              'Your kitchen has no ingredients configured. Would you like to set them up now?',
              [
                { text: 'Later', style: 'cancel' },
                { text: 'Setup Now', onPress: () => setCurrentView('setup') }
              ]
            );
          }, 500);
        }
      }
    } catch (error) {
      console.log('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSetupComplete = () => {
    setCurrentView('main');
    loadInventory();
  };

  // Render Manage Ingredients Screen
  if (currentView === 'manage') {
    return <ManageIngredientsScreen onBack={() => setCurrentView('main')} branchId={branchId} />;
  }

  // Render Setup Ingredients Screen
  if (currentView === 'setup') {
    return (
      <SetupIngredientsScreen 
        onComplete={handleSetupComplete} 
        onSkip={() => setCurrentView('main')}
        branchId={branchId}
      />
    );
  }

  // Render Main Kitchen Settings
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* White Header - Matching Categories Style */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.leftSection}>
          <Text style={styles.headerTitle}>Kitchen Settings</Text>
        </View>
        
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats - Categories Style */}
        {!loading && inventory.length > 0 && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.orangeCard]}>
              <Text style={styles.statCardValue}>{totalIngredients}</Text>
              <Text style={styles.statCardLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.greenCard]}>
              <Text style={styles.statCardValue}>{totalIngredients - lowStockCount}</Text>
              <Text style={styles.statCardLabel}>Normal</Text>
            </View>
            <View style={[styles.statCard, styles.blueCard]}>
              <Text style={styles.statCardValue}>{lowStockCount}</Text>
              <Text style={styles.statCardLabel}>Low Stock</Text>
            </View>
          </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {isManager && (
            <TouchableOpacity 
              style={styles.menuCard}
              onPress={() => setCurrentView('manage')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: DESIGN.orange + '15' }]}>
                <Ionicons name="cube" size={24} color={DESIGN.orange} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Manage Ingredients</Text>
                <Text style={styles.menuSubtitle}>Add, edit, or remove ingredients</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={DESIGN.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Inventory Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inventory Status</Text>
            {lowStockCount > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{lowStockCount} low</Text>
              </View>
            )}
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={DESIGN.orange} />
              <Text style={styles.loadingText}>Loading inventory...</Text>
            </View>
          ) : inventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={DESIGN.placeholderText} />
              <Text style={styles.emptyTitle}>No ingredients configured</Text>
              <Text style={styles.emptySubtitle}>
                {isManager 
                  ? 'Add ingredients to get started' 
                  : 'Contact your manager to setup ingredients'}
              </Text>
              {isManager && (
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => setCurrentView('setup')}
                >
                  <Text style={styles.primaryButtonText}>Setup Ingredients</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {inventory.map((item, idx) => {
                const qty = item.quantityAvailable || item.quantity_available || 0;
                const reorder = item.reorderLevel || item.reorder_level || 0;
                const isLow = qty <= reorder;
                
                return (
                  <View key={idx} style={styles.inventoryCard}>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.inventoryName}>{item.name || item.product_name || 'Unknown'}</Text>
                      <Text style={styles.inventorySubtext}>
                        {qty} {item.unit || 'kg'} • Reorder: {reorder}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      isLow ? styles.statusBadgeLow : styles.statusBadgeGood
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isLow ? styles.statusTextLow : styles.statusTextGood
                      ]}>
                        {isLow ? 'LOW' : 'OK'}
                      </Text>
                    </View>
                  </View>
                );
              })}
              
              {totalIngredients > 5 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setCurrentView('manage')}
                >
                  <Text style={styles.viewAllText}>View All Ingredients</Text>
                  <Ionicons name="arrow-forward" size={16} color={DESIGN.orange} />
                </TouchableOpacity>
              )}
            </>
          )}
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="add-circle-outline" size={20} color={DESIGN.blue} />
            <Text style={styles.secondaryButtonText}>Request Ingredient Restock</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>234</Text>
              <Text style={styles.metricLabel}>Orders Prepared</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>98%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>18m</Text>
              <Text style={styles.metricLabel}>Avg Prep Time</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>4.8</Text>
              <Text style={styles.metricLabel}>Quality Rating</Text>
            </View>
          </View>
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment & Facilities</Text>
          <View style={styles.equipmentCard}>
            <View style={styles.equipmentItem}>
              <Ionicons name="checkmark-circle" size={16} color={DESIGN.green} />
              <Text style={styles.equipmentText}>Grill Station</Text>
            </View>
            <View style={styles.equipmentItem}>
              <Ionicons name="checkmark-circle" size={16} color={DESIGN.green} />
              <Text style={styles.equipmentText}>Fryer Station</Text>
            </View>
            <View style={styles.equipmentItem}>
              <Ionicons name="checkmark-circle" size={16} color={DESIGN.green} />
              <Text style={styles.equipmentText}>Prep Station</Text>
            </View>
            <View style={styles.equipmentItem}>
              <Ionicons name="checkmark-circle" size={16} color={DESIGN.green} />
              <Text style={styles.equipmentText}>Pizza Oven</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="alert-circle-outline" size={20} color={DESIGN.red} />
            <Text style={[styles.secondaryButtonText, { color: DESIGN.red }]}>Report Equipment Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {[
            { key: 'orderNotifications' as const, label: 'Receive order notifications' },
            { key: 'inventoryAlerts' as const, label: 'Receive inventory alerts' },
            { key: 'showMetrics' as const, label: 'Show performance metrics' },
            { key: 'allowSharing' as const, label: 'Allow sharing stats' },
          ].map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => togglePref(item.key)}
                trackColor={{ false: '#ddd', true: DESIGN.green }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} />

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  // @ts-ignore
                  navigation.navigate(item.screen);
                }}
              >
                <Ionicons name={item.icon as any} size={24} color="#E87E35" />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.pageBg,
  },
  
  // Header Styles - White like Categories
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  leftSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // ScrollView Styles
  scrollView: {
    flex: 1,
    backgroundColor: DESIGN.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  // Stats Grid - Categories Style
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  orangeCard: {
    backgroundColor: '#FF8C42',
  },
  greenCard: {
    backgroundColor: '#2ECC71',
  },
  blueCard: {
    backgroundColor: '#3B82F6',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  
  // Section Styles
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN.primaryText,
    marginBottom: 12,
  },
  
  // Menu Card Styles
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN.primaryText,
  },
  menuSubtitle: {
    fontSize: 12,
    color: DESIGN.secondaryText,
    marginTop: 2,
  },
  
  // Alert Badge
  alertBadge: {
    backgroundColor: DESIGN.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DESIGN.headerText,
  },
  
  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: DESIGN.secondaryText,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN.primaryText,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DESIGN.secondaryText,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Buttons
  primaryButton: {
    marginTop: 20,
    backgroundColor: DESIGN.orange,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN.headerText,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DESIGN.blue,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: DESIGN.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Inventory Card
  inventoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN.primaryText,
  },
  inventorySubtext: {
    fontSize: 12,
    color: DESIGN.secondaryText,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeLow: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeGood: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTextLow: {
    color: DESIGN.red,
  },
  statusTextGood: {
    color: DESIGN.green,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.orange,
  },
  
  // More Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 16,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '47%',
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN.primaryText,
  },
  metricLabel: {
    fontSize: 12,
    color: DESIGN.secondaryText,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Equipment
  equipmentCard: {
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  equipmentText: {
    fontSize: 14,
    color: DESIGN.primaryText,
  },
  
  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  toggleLabel: {
    fontSize: 14,
    color: DESIGN.primaryText,
  },
});
