import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Styling Constants
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
  green: '#2ECC71',
  blue: '#3498DB',
  orange: '#FF6B35',
};

const FONTS = {
  pageTitle: { fontSize: 24, fontWeight: '700' as const },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 14, fontWeight: '700' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
  cardPadding: 16,
};

interface RiderDashboardHeaderProps {
  riderData: {
    name: string;
    avatar: string | null;
    onDuty: boolean;
    rating: number;
    verification: number;
  };
  stats: {
    activeDeliveries: number;
    todayEarnings: number;
    weekEarnings: number;
  };
  onToggleDuty: () => void;
  onNotificationPress: () => void;
  onSettingsPress: () => void;
}

export default function RiderDashboardHeader({
  riderData,
  stats,
  onToggleDuty,
  onNotificationPress,
  onSettingsPress,
}: RiderDashboardHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top > 0 ? 8 : 12 }]}>
      {/* Top Row - Profile & Icons */}
      <View style={styles.topRow}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {riderData.avatar ? (
              <Image source={{ uri: riderData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={COLORS.white} />
              </View>
            )}
            {riderData.onDuty && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.riderName}>{riderData.name}</Text>
            <View style={styles.statusRow}>
              <Ionicons 
                name={riderData.onDuty ? "checkmark-circle" : "close-circle"} 
                size={14} 
                color={riderData.onDuty ? COLORS.green : COLORS.gray} 
              />
              <Text style={[styles.statusText, { color: riderData.onDuty ? COLORS.green : COLORS.gray }]}
>
                {riderData.onDuty ? 'On Duty Now' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Icons */}
        <View style={styles.iconsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.darkText} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={24} color={COLORS.darkText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards - Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        {/* Active Deliveries Card */}
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${COLORS.orange}20` }]}>
            <Ionicons name="bicycle" size={20} color={COLORS.orange} />
          </View>
          <Text style={styles.statValue}>{stats.activeDeliveries}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>

        {/* Today's Earnings Card */}
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${COLORS.green}20` }]}>
            <Ionicons name="cash-outline" size={20} color={COLORS.green} />
          </View>
          <Text style={[styles.statValue, { color: COLORS.orange }]}>
            ${Number(stats.todayEarnings || 0).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>

        {/* Week Earnings Card */}
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${COLORS.blue}20` }]}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.blue} />
          </View>
          <Text style={styles.statValue}>${Number(stats.weekEarnings || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Last 7 Days</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    paddingBottom: SPACING.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.verticalGap,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  riderName: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: FONTS.sectionTitle.fontWeight,
    color: COLORS.darkText,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONTS.small.fontSize,
    marginLeft: 4,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statsContainer: {
    paddingRight: SPACING.horizontal,
    gap: 8,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
  },
});
