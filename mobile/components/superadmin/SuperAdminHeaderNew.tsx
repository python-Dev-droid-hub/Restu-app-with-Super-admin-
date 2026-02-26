import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

interface QuickStat {
  id: string;
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  backgroundColor: string;
}

interface SuperAdminHeaderNewProps {
  userName?: string;
  lastUpdated?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

const quickStats: QuickStat[] = [
  {
    id: 'orders',
    value: '12',
    label: 'Orders Today',
    icon: 'receipt-outline',
    accentColor: COLORS.orange,
    backgroundColor: '#FFF8F0',
  },
  {
    id: 'items',
    value: '248',
    label: 'Total Items',
    icon: 'cube-outline',
    accentColor: COLORS.blue,
    backgroundColor: '#F0F7FF',
  },
  {
    id: 'revenue',
    value: '$18,420',
    label: 'Total Revenue',
    icon: 'cash-outline',
    accentColor: COLORS.green,
    backgroundColor: '#F0FFF4',
  },
  {
    id: 'rate',
    value: '86%',
    label: 'Performance',
    icon: 'trending-up-outline',
    accentColor: COLORS.yellow,
    backgroundColor: '#FFFBF0',
  },
];

export const SuperAdminHeaderNew: React.FC<SuperAdminHeaderNewProps> = ({
  userName = 'Ahmed',
  lastUpdated = 'just now',
  notificationCount = 2,
  onNotificationPress,
  onProfilePress,
}) => {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileLeft}>
          <TouchableOpacity onPress={onProfilePress} style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.lastUpdated}>Last Updated: {lastUpdated}</Text>
          </View>
        </View>
        <View style={styles.profileRight}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <TouchableOpacity
            onPress={onNotificationPress}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.darkText} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        {quickStats.map((stat) => (
          <View
            key={stat.id}
            style={[
              styles.statCard,
              {
                backgroundColor: stat.backgroundColor,
                borderLeftColor: stat.accentColor,
              },
            ]}
          >
            <Ionicons name={stat.icon} size={24} color={stat.accentColor} />
            <Text style={[styles.statValue, { color: stat.accentColor }]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    paddingVertical: SPACING.small,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.itemGap,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: SPACING.small,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  lastUpdated: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginRight: SPACING.small,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.tiny,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  statsContainer: {
    paddingRight: SPACING.horizontal,
    gap: SPACING.small,
  },
  statCard: {
    width: 90,
    height: 80,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.small,
  },
  statValue: {
    fontSize: 18,
    fontWeight: FONTS.weights.bold,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.lightText,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default SuperAdminHeaderNew;
