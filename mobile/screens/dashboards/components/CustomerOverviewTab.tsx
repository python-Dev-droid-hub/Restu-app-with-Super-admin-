import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../components/api/client';

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (url.startsWith('/')) return `${base}${url}`;
  return url;
};

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
  lightGray: '#ECEFF1',
};

interface UserData {
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
}

interface Stats {
  totalOrders: number;
  totalSpent: number;
  averageRating: number;
  pendingOrders: number;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  effectivePrice?: number;
  imageUrl?: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  products: Product[];
}

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl?: string;
  isActive?: boolean;
}

interface DealCampaign {
  _id: string;
  name: string;
  status: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    bgColor?: string;
  };
  deals: DealItem[];
}

interface CustomerOverviewTabProps {
  userData: UserData;
  stats: Stats;
  formatPrice: (amount: number) => string;
  onViewOrders: () => void;
  onViewFavorites: () => void;
}

export default function CustomerOverviewTab({
  userData,
  stats,
  formatPrice,
  onViewOrders,
  onViewFavorites,
}: CustomerOverviewTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [dealCampaigns, setDealCampaigns] = useState<DealCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🏠 [HOME] Starting loadData...');
      
      // Load categories and deals in parallel
      const [menuRes, dealsRes] = await Promise.all([
        api.get('/menu'),
        api.get('/deals/campaigns/active'),
      ]);

      console.log('🏠 [HOME] Menu response:', JSON.stringify(menuRes, null, 2).substring(0, 500));
      console.log('🏠 [HOME] Deals response:', JSON.stringify(dealsRes, null, 2).substring(0, 1000));

      const menuCategories = (menuRes as any)?.data?.categories;
      if (menuRes.success && Array.isArray(menuCategories)) {
        setCategories(menuCategories);
        if (menuCategories.length > 0) {
          setSelectedCategory(menuCategories[0]._id);
        }
      }

      const campaigns =
        (dealsRes as any)?.data?.campaigns ||
        (dealsRes as any)?.data?.data?.campaigns ||
        [];

      if (dealsRes.success && Array.isArray(campaigns)) {
        console.log('🏠 [HOME] Campaigns count:', campaigns.length);
        const activeCampaigns = campaigns.filter((c: DealCampaign) => c.status === 'ACTIVE');
        console.log('🏠 [HOME] Active campaigns:', activeCampaigns.length);

        setDealCampaigns(activeCampaigns);
        
        const allDeals: DealItem[] = [];
        activeCampaigns.forEach((campaign: DealCampaign) => {
          console.log('🏠 [HOME] Campaign:', campaign.name, 'deals:', campaign.deals?.length || 0);
          if (campaign.deals && campaign.deals.length > 0) {
            campaign.deals.forEach((deal) => {
              console.log('🏠 [HOME] Deal:', deal.title, 'isActive:', deal.isActive);
              if (deal.isActive !== false) {
                allDeals.push(deal);
              }
            });
          }
        });
        console.log('🏠 [HOME] Total deals extracted:', allDeals.length);
        setDeals(allDeals);
      } else {
        console.log('🏠 [HOME] No campaigns - success:', dealsRes.success, 'campaigns:', (dealsRes as any)?.data?.campaigns?.length);
      }
    } catch (error) {
      console.error('🏠 [HOME] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeContent}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userData.name?.split(' ')[0] || 'Guest'}</Text>
          <Text style={styles.welcomeSubtext}>What would you like to order today?</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.darkText} />
          {stats.pendingOrders > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingOrders}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="receipt-outline" size={24} color={COLORS.white} />
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
          <Ionicons name="wallet-outline" size={24} color={COLORS.white} />
          <Text style={styles.statValue}>{formatPrice(stats.totalSpent)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.info }]}>
          <Ionicons name="star-outline" size={24} color={COLORS.white} />
          <Text style={styles.statValue}>{Number(stats.averageRating || 0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
          <Ionicons name="time-outline" size={24} color={COLORS.white} />
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Browse Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onViewOrders}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="receipt-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionText}>My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onViewFavorites}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.danger + '20' }]}>
              <Ionicons name="heart-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.actionText}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
              <Ionicons name="location-outline" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.actionText}>Track Order</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories & Products */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Menu</Text>
          
          {/* Category Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category._id && styles.categoryTabActive
                ]}
                onPress={() => setSelectedCategory(category._id)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category._id && styles.categoryTabTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {categories
              .find(c => c._id === selectedCategory)?.products
              ?.slice(0, 4)
              .map((product) => (
                <TouchableOpacity key={product._id} style={styles.productCard}>
                  {product.imageUrl ? (
                    <Image 
                      source={{ uri: getFullImageUrl(product.imageUrl) }} 
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="restaurant" size={24} color={COLORS.gray} />
                    </View>
                  )}
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productPrice}>
                    {formatPrice(product.effectivePrice || product.price)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      {/* Campaign Banner - Just Image, No Text */}
      <View style={styles.section}>
        {dealCampaigns
          .filter((c) => c?.heroBanner?.imageUrl)
          .slice(0, 1)
          .map((c) => {
            const hero = getFullImageUrl(c.heroBanner?.imageUrl);
            return hero ? (
              <TouchableOpacity key={c._id} activeOpacity={0.9}>
                <Image source={{ uri: hero }} style={[styles.campaignHeroImage, { width: '100%', height: 180, borderRadius: 12 }]} resizeMode="cover" />
              </TouchableOpacity>
            ) : null;
          })}
      </View>

      {/* Promo Banner */}
      <TouchableOpacity style={styles.promoBanner}>
        <View style={styles.promoContent}>
          <Text style={styles.promoTitle}>Special Offer!</Text>
          <Text style={styles.promoSubtitle}>Get 20% off on your first order</Text>
          <Text style={styles.promoCode}>Use code: WELCOME20</Text>
        </View>
        <View style={styles.promoImageContainer}>
          <Ionicons name="gift-outline" size={48} color={COLORS.white} />
        </View>
      </TouchableOpacity>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={onViewOrders}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Order Delivered</Text>
            <Text style={styles.activitySubtitle}>Order #12345 has been delivered</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          <View style={[styles.activityIcon, { backgroundColor: COLORS.primary + '20' }]}>
            <Ionicons name="cart" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Order Placed</Text>
            <Text style={styles.activitySubtitle}>You placed a new order</Text>
            <Text style={styles.activityTime}>5 hours ago</Text>
          </View>
        </View>
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  welcomeContent: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  promoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  promoCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  // Category Tabs
  categoryTabs: {
    marginBottom: 12,
  },
  categoryTabsContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: COLORS.white,
  },
  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 8,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  // Deals Section
  dealsScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  dealCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealImageContainer: {
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  dealImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dealInfo: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dealOriginalPrice: {
    fontSize: 12,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  debugText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
  noDealsText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  campaignHeroImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
});
