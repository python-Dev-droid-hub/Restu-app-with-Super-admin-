import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

const MENU_ITEMS = [
  { id: '1', title: 'My Orders', icon: 'receipt-outline', screen: 'OrderHistory' },
  { id: '2', title: 'Addresses', icon: 'location-outline', screen: 'Addresses' },
  { id: '3', title: 'Payment Methods', icon: 'card-outline', screen: 'PaymentMethods' },
  { id: '4', title: 'Favorites', icon: 'heart-outline', screen: 'Favorites' },
  { id: '5', title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
  { id: '6', title: 'Help & Support', icon: 'help-circle-outline', screen: 'Support' },
  { id: '7', title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
];

interface UserData {
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<UserData>({});
  const [stats, setStats] = useState({ orders: 0, addresses: 0, cards: 0 });
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserData({
          name: parsed.name || parsed.displayName || 'Customer',
          email: parsed.email || '',
          phone: parsed.phone || parsed.phoneNumber || '',
          image: parsed.image || parsed.avatar || parsed.profileImage,
        });
      }
    } catch (error) {
      console.error('[AccountScreen] Error loading user data:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Fetch real order count from API
      const ordersRes = await api.get('/orders/my-orders');
      const orderCount = ordersRes.success ? (ordersRes.data?.orders?.length || 0) : 0;
      
      // For now, use mock data for addresses and cards until those endpoints are ready
      setStats({
        orders: orderCount,
        addresses: 2,
        cards: 1,
      });
    } catch (error) {
      console.error('[AccountScreen] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'userId']);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('[AccountScreen] Logout error:', error);
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={userData.image ? { uri: userData.image } : require('../../assets/icon.png')}
            style={styles.avatar}
            defaultSource={require('../../assets/icon.png')}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{userData.name || 'Customer'}</Text>
          <Text style={styles.phone}>{userData.phone || ''}</Text>
          <Text style={styles.email}>{userData.email || ''}</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.addresses}</Text>
          <Text style={styles.statLabel}>Addresses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.cards}</Text>
          <Text style={styles.statLabel}>Cards</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray_400} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.horizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: spacing.lg, marginBottom: spacing.sm },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  phone: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  email: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  editButton: { padding: spacing.sm },
  statsContainer: { flexDirection: 'row', backgroundColor: colors.white, paddingVertical: spacing.md, marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.primary },
  statLabel: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.gray_200 },
  menuContainer: { backgroundColor: colors.white },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray_100 },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  menuText: { flex: 1, fontSize: typography.sizes.body, color: colors.text_dark, fontWeight: typography.weights.medium },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginTop: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  logoutText: { marginLeft: spacing.md, fontSize: typography.sizes.body, color: colors.danger, fontWeight: typography.weights.medium },
});
