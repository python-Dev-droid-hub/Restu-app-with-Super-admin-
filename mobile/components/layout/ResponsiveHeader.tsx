import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';

interface ResponsiveHeaderProps {
  title: string;
  showNotification?: boolean;
  showProfile?: boolean;
  showMore?: boolean;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onMorePress?: () => void;
  profileImage?: string;
  notificationCount?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveHeader({
  title,
  showNotification = true,
  showProfile = true,
  showMore = false,
  onNotificationPress,
  onProfilePress,
  onMorePress,
  profileImage = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  notificationCount = 0,
  style,
}: ResponsiveHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + getSpacing(3) },
        style,
      ]}
    >
      {/* Left: Page Title */}
      <View style={styles.leftSection}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right: Notification + Profile */}
      <View style={styles.rightSection}>
        {showMore && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={onMorePress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={COLORS.darkText}
            />
          </TouchableOpacity>
        )}
        {showNotification && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={COLORS.darkText}
            />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showProfile && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImage}>
                <Ionicons name="person" size={24} color={COLORS.darkText} />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getSpacing(4), // 16px
    paddingBottom: getSpacing(3), // 12px
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkText,
    lineHeight: 34,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(4), // 16px
  },
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
});
