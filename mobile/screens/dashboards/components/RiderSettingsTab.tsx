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

const FONTS = {
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
};

interface RiderSettingsTabProps {
  riderData: {
    name: string;
    avatar: string | null;
    rating: number;
  };
  onViewAnalytics: () => void;
  onChangeName: () => void;
  onChangePassword: () => void;
  onChangeProfileImage: () => void;
  onLogout: () => void;
}

export default function RiderSettingsTab({
  riderData,
  onViewAnalytics,
  onChangeName,
  onChangePassword,
  onChangeProfileImage,
  onLogout,
}: RiderSettingsTabProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {riderData.avatar ? (
            <Image source={{ uri: riderData.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={30} color={COLORS.white} />
            </View>
          )}
        </View>
        <Text style={styles.riderName}>{riderData.name || 'Rider'}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>{Number(riderData.rating || 0).toFixed(1)} ⭐</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemFirst]} onPress={onChangeProfileImage}>
            <View style={[styles.menuIcon, { backgroundColor: `${COLORS.info}20` }]}>
              <Ionicons name="image-outline" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.menuLabel}>Change Profile Image</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onChangeName}>
            <View style={[styles.menuIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuLabel}>Change Name</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={onChangePassword}>
            <View style={[styles.menuIcon, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.menuLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemFirst, styles.menuItemLast]} onPress={onViewAnalytics}>
            <View style={[styles.menuIcon, { backgroundColor: `${COLORS.success}20` }]}>
              <Ionicons name="stats-chart" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.menuLabel}>View Analytics</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.verticalGap,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  riderName: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.warning,
    fontWeight: '600',
  },
  emergencyText: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginLeft: 8,
  },
  section: {
    marginBottom: SPACING.verticalGap,
  },
  sectionTitle: {
    fontSize: FONTS.small.fontSize,
    fontWeight: '600',
    color: COLORS.gray,
    marginLeft: SPACING.horizontal,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: SPACING.horizontal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    height: 48,
  },
  menuItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  toggleActive: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  logoutText: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
