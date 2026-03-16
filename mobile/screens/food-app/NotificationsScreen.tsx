import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotifications, markNotificationAsRead, deleteNotification, clearAllNotifications, Notification } from '../../services/notificationService';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNotifications(50);
      if (response.success) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('[NotificationsScreen] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error('[NotificationsScreen] Error deleting notification:', error);
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear all?', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Clear', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await clearAllNotifications();
            setNotifications([]);
          } catch (error) {
            console.error('[NotificationsScreen] Error clearing notifications:', error);
          }
        }
      }
    ]);
  };

  const getIconColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return colors.danger;
      case 'HIGH': return colors.warning;
      case 'MEDIUM': return colors.primary;
      case 'LOW': return colors.info;
      default: return colors.primary;
    }
  };

  const getIconName = (type: string): any => {
    if (type.includes('ORDER')) return 'receipt';
    if (type.includes('PAYMENT')) return 'card';
    if (type.includes('DELIVERY')) return 'bicycle';
    if (type.includes('PROMO')) return 'gift';
    return 'notifications';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        {notifications.length === 0 && <View style={{ width: 24 }} />}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <View style={[styles.notificationItem, { backgroundColor: item.read ? colors.white : colors.gray_50 }]}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.priority) + '20' }]}>
              <Ionicons name={getIconName(item.type)} size={24} color={getIconColor(item.priority)} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage}>{item.body || item.message || ''}</Text>
              <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
              <Ionicons name="close" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color={colors.gray_300} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  settingInfo: { flex: 1 },
  settingTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text_dark,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  testButtonText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
  },
  clearText: { fontSize: typography.sizes.body, color: colors.danger, fontWeight: typography.weights.medium },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray_200 },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.gray_500 },
  tabTextActive: { color: colors.primary },
  notificationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray_100 },
  iconContainer: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  notificationMessage: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: spacing.xs },
  notificationTime: { fontSize: typography.sizes.xs, color: colors.gray_400, marginTop: spacing.xs },
  notificationActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { padding: spacing.xs },
  emptyContainer: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg },
  emptySubtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
});
