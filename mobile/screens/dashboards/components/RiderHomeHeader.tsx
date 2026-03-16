import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

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
};

interface RiderHomeHeaderProps {
  riderName: string;
  riderAvatar?: string;
  isOnDuty: boolean;
  onToggleDuty: (status: boolean) => void;
  stats: {
    inProgress: number;
    earnings: number;
    last7Days: number;
  };
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
  notificationCount?: number;
  onPressInProgress?: () => void;
  onPressEarnings?: () => void;
}

const StatCard: React.FC<{
  icon: string;
  value: string | number;
  label: string;
  backgroundColor: string;
  onPress?: () => void;
}> = ({ icon, value, label, backgroundColor, onPress }) => (
  <TouchableOpacity
    style={[styles.statCard, { backgroundColor, shadowColor: backgroundColor }]}
    onPress={onPress}
    activeOpacity={0.85}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name={icon as any} size={28} color={COLORS.white} />
    <View style={styles.statTextContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const RiderHomeHeader: React.FC<RiderHomeHeaderProps> = ({
  riderName,
  riderAvatar,
  isOnDuty,
  onToggleDuty,
  stats,
  onNotificationPress,
  onSettingsPress,
  notificationCount = 0,
  onPressInProgress,
  onPressEarnings,
}) => {
  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileLeft}>
          {riderAvatar ? (
            <Image source={{ uri: riderAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {riderName?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.riderName}>{riderName}</Text>
            <Text style={[styles.dutyStatus, { color: isOnDuty ? COLORS.success : COLORS.gray }]}>
              ● {isOnDuty ? 'On Duty Now' : 'Off Duty Now'}
            </Text>
          </View>
        </View>

        <View style={styles.iconContainer}>
          {/* Notifications */}
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.darkText} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={20} color={COLORS.darkText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Duty Status Toggle */}
      <View style={styles.dutyToggleSection}>
        <Text style={styles.dutyLabel}>Duty Status</Text>
        <TouchableOpacity
          onPress={() => onToggleDuty(!isOnDuty)}
          style={[
            styles.toggleContainer,
            { backgroundColor: isOnDuty ? COLORS.success : COLORS.gray },
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              { marginLeft: isOnDuty ? 22 : 2 },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard
          icon="location"
          value={stats.inProgress}
          label="In Progress"
          backgroundColor={COLORS.primary}
          onPress={onPressInProgress}
        />
        <StatCard
          icon="cash-outline"
          value={`$${Number(stats.earnings || 0).toFixed(2)}`}
          label="Earnings"
          backgroundColor={COLORS.success}
          onPress={onPressEarnings}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  nameContainer: {
    justifyContent: 'center',
  },
  riderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  dutyStatus: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 2,
  },
  iconContainer: {
    flexDirection: 'row',
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
    top: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dutyToggleSection: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dutyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  toggleContainer: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 88,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statTextContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
});

export default RiderHomeHeader;
