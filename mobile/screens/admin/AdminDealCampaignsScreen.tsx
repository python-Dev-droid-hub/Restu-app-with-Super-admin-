import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Image,
  Switch,
  Platform,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { useUserData } from '../../hooks/useUserData';
import { isAdminRole } from '../../utils/permissionHelpers';
import { useBranch } from '../../context/BranchContext';
import GlobalBranchBar from '../../components/admin/GlobalBranchBar';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

const { width } = Dimensions.get('window');

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  const normalized = url.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (normalized.startsWith('/')) return `${baseUrl}${normalized}`;
  return `${baseUrl}/${normalized.replace(/^\/+/, '')}`;
};

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  isActive?: boolean;
  displayOrder?: number;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
  };
  deals: DealItem[];
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  startDate?: string;
  endDate?: string;
  displayOrder?: number;
}

export default function AdminDealCampaignsScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { profileImage } = useUserData();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDealsModal, setShowDealsModal] = useState(false);

  const [userRole, setUserRole] = useState<string>('');
  const { appendBranchQuery, branchRevision, isReady } = useBranch();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    loadCampaigns();
  }, [isReady, branchRevision]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const menuItems = [
    { name: t('nav.notifications'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    ...(isAdminRole(userRole) ? [{ name: t('nav.branches'), icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: 'Deal Campaigns', icon: 'pricetag-outline', screen: 'AdminDealCampaigns' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: t('nav.productSizes'), icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    ...(isAdminRole(userRole)
      ? [{ name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' }]
      : []),
  ];

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get(appendBranchQuery('/deals/campaigns'));
      if (response.success && response.data?.campaigns) {
        const normalized = (response.data.campaigns || []).map((c: any) => ({
          ...c,
          deals: Array.isArray(c?.deals) ? c.deals : [],
        }));
        setCampaigns(normalized);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await api.patch(`/deals/campaigns/${campaignId}`, { status: newStatus });

      if (response.success) {
        Alert.alert('Success', `Campaign ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
        loadCampaigns();
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      Alert.alert('Error', 'Failed to update campaign status');
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign and all its deals?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/deals/campaigns/${campaignId}`);
              if (response.success) {
                Alert.alert('Success', 'Campaign deleted');
                loadCampaigns();
              }
            } catch (error) {
              console.error('Error deleting campaign:', error);
              Alert.alert('Error', 'Failed to delete campaign');
            }
          },
        },
      ]
    );
  };

  const viewCampaignDeals = async (campaign: Campaign) => {
    try {
      // Always fetch full campaign details so deals are present
      const response = await api.get(`/deals/campaigns/${campaign._id}`);
      if (response.success && response.data?.campaign) {
        const c: any = response.data.campaign;
        setSelectedCampaign({
          ...c,
          deals: Array.isArray(c?.deals) ? c.deals : [],
        });
      } else {
        setSelectedCampaign({
          ...campaign,
          deals: Array.isArray(campaign?.deals) ? campaign.deals : [],
        });
      }
      setShowDealsModal(true);
    } catch (error) {
      console.error('Error loading campaign deals:', error);
      setSelectedCampaign({
        ...campaign,
        deals: Array.isArray(campaign?.deals) ? campaign.deals : [],
      });
      setShowDealsModal(true);
    }
  };

  const toggleDealItemStatus = async (dealId: string, currentStatus: boolean) => {
    if (!selectedCampaign) return;

    try {
      const response = await api.patch(
        `/deals/campaigns/${selectedCampaign._id}/deals/${dealId}/toggle`
      );

      if (response.success) {
        // Update local state
        const updatedDeals = selectedCampaign.deals.map((d) =>
          d._id === dealId ? { ...d, isActive: !currentStatus } : d
        );
        setSelectedCampaign({ ...selectedCampaign, deals: updatedDeals });
        loadCampaigns();
      }
    } catch (error) {
      console.error('Error toggling deal item:', error);
      Alert.alert('Error', 'Failed to update deal item');
    }
  };

  const deleteDealItem = async (dealId: string) => {
    if (!selectedCampaign) return;

    Alert.alert(
      'Delete Deal Item',
      'Are you sure you want to remove this deal from the campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(
                `/deals/campaigns/${selectedCampaign._id}/deals/${dealId}`
              );
              if (response.success) {
                const updatedDeals = selectedCampaign.deals.filter((d) => d._id !== dealId);
                setSelectedCampaign({ ...selectedCampaign, deals: updatedDeals });
                loadCampaigns();
              }
            } catch (error) {
              console.error('Error deleting deal item:', error);
              Alert.alert('Error', 'Failed to delete deal item');
            }
          },
        },
      ]
    );
  };

  const renderCampaignCard = ({ item }: { item: Campaign }) => (
    <TouchableOpacity
      style={styles.campaignCard}
      onPress={() => viewCampaignDeals(item)}
      activeOpacity={0.7}
    >
      {/* Hero Banner Preview */}
      {item.heroBanner?.imageUrl && (
        <Image
          source={{ uri: getFullImageUrl(item.heroBanner.imageUrl) }}
          style={styles.campaignImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.campaignContent}>
        <View style={styles.campaignHeader}>
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.campaignDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'ACTIVE' ? '#4CAF50' : '#F44336' },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.campaignStats}>
          <View style={styles.statItem}>
            <Ionicons name="pricetag" size={16} color="#E87E35" />
            <Text style={styles.statText}>{item.deals?.length || 0} deals</Text>
          </View>
          {item.startDate && (
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={16} color="#666" />
              <Text style={styles.statText}>
                {new Date(item.startDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.campaignActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleCampaignStatus(item._id, item.status)}
          >
            <Switch
              value={item.status === 'ACTIVE'}
              onValueChange={() => toggleCampaignStatus(item._id, item.status)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                // @ts-ignore
                navigation.navigate('AddDealCampaign', { campaignId: item._id })
              }
            >
              <Ionicons name="pencil" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => deleteCampaign(item._id)}
            >
              <Ionicons name="trash" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDealItem = ({ item }: { item: DealItem }) => (
    <View style={styles.dealItemCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: getFullImageUrl(item.imageUrl) }}
          style={styles.dealItemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.dealItemImagePlaceholder}>
          <Ionicons name="image-outline" size={22} color="#bbb" />
        </View>
      )}

      <View style={styles.dealItemContent}>
        <View style={styles.dealItemHeader}>
          <Text style={styles.dealItemTitle}>{item.title}</Text>
          <Switch
            value={item.isActive !== false}
            onValueChange={() => toggleDealItemStatus(item._id, item.isActive !== false)}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.dealItemPriceRow}>
          <Text style={styles.dealItemPrice}>PKR {item.price}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.dealItemOriginalPrice}>PKR {item.originalPrice}</Text>
          )}
          {item.discount && item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.dealItemActions}>
          <TouchableOpacity
            style={styles.dealActionBtn}
            onPress={() => {
              setShowDealsModal(false);
              // @ts-ignore
              navigation.navigate('AddDealItem', {
                campaignId: selectedCampaign?._id,
                dealId: item._id,
              });
            }}
          >
            <Ionicons name="pencil" size={18} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dealActionBtn}
            onPress={() => deleteDealItem(item._id)}
          >
            <Ionicons name="trash" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ResponsiveHeader
          title="Deal Campaigns"
          notificationCount={0}
          profileImage={profileImage}
          onNotificationPress={() => {
            // @ts-ignore
            navigation.navigate('AdminNotifications');
          }}
          onProfilePress={() => setShowProfileMenu(true)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87E35" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Responsive Header */}
      <ResponsiveHeader
        title="Deal Campaigns"
        notificationCount={0}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <GlobalBranchBar />

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E87E35' }]}>
            <Text style={styles.statValue}>{campaigns.length}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.statValue}>
              {campaigns.filter((c) => c.status === 'ACTIVE').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.statValue}>
              {campaigns.reduce((sum, c) => sum + (c.deals?.length || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Deals</Text>
          </View>
        </View>

        {/* Campaigns List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Campaigns</Text>

          {campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <View key={campaign._id}>
                {renderCampaignCard({ item: campaign })}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>No campaigns found</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first deal campaign
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: getSpacing(22) + insets.bottom }]}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('AddDealCampaign');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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

      {/* Campaign Deals Modal */}
      <Modal
        visible={showDealsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDealsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dealsModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCampaign?.name} - Deals</Text>
              <TouchableOpacity onPress={() => setShowDealsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Add Deal Button */}
            <TouchableOpacity
              style={styles.addDealBtn}
              onPress={() => {
                setShowDealsModal(false);
                // @ts-ignore
                navigation.navigate('AddDealItem', { campaignId: selectedCampaign?._id });
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addDealBtnText}>Add New Deal</Text>
            </TouchableOpacity>

            <FlatList
              data={selectedCampaign?.deals || []}
              renderItem={renderDealItem}
              keyExtractor={(item) => item._id}
              style={styles.dealsList}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No deals in this campaign</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Profile Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={() => {
          // @ts-ignore
          navigation.navigate('Welcome');
        }}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  campaignImage: {
    width: '100%',
    height: 120,
  },
  campaignContent: {
    padding: 16,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  campaignDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  campaignActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  actionBtn: {
    padding: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 150,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E87E35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E87E35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
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
    fontSize: 15,
    color: '#1a1a2e',
    marginLeft: 14,
  },
  dealsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    flex: 1,
    maxHeight: '85%',
  },
  addDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E87E35',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  addDealBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dealsList: {
    flex: 1,
  },
  dealItemCard: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dealItemImage: {
    width: 80,
    height: 80,
  },
  dealItemImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealItemContent: {
    flex: 1,
    padding: 12,
  },
  dealItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dealItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  dealItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dealItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E87E35',
  },
  dealItemOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dealItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dealActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchInfoText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  branchCodeBadge: {
    backgroundColor: '#E87E35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  branchCodeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
});
