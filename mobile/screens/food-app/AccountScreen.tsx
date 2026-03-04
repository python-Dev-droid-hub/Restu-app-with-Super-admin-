import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';

const MENU_ITEMS = [
  { id: '1', title: 'My Orders', icon: 'receipt-outline', screen: 'OrderHistory' },
  { id: '2', title: 'Addresses', icon: 'location-outline', screen: 'Addresses' },
  { id: '3', title: 'Payment Methods', icon: 'card-outline', screen: 'PaymentMethods' },
  { id: '4', title: 'Favorites', icon: 'heart-outline', screen: 'Favorites' },
  { id: '5', title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
  { id: '6', title: 'Help & Support', icon: 'help-circle-outline', screen: 'Support' },
  { id: '7', title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
];

export default function AccountScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
            style={styles.avatar}
            defaultSource={require('../../assets/icon.png')}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>Ahmad Khan</Text>
          <Text style={styles.phone}>+92 300 1234567</Text>
          <Text style={styles.email}>ahmad@example.com</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Addresses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>2</Text>
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
      <TouchableOpacity style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
