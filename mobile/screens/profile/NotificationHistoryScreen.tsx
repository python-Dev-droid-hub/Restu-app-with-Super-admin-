import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
    cardBg: '#FFFFFF',
  },
} as const;

// Notification types with colors and icons
const NOTIFICATION_TYPES = {
  NEW_ORDER: { color: '#FF7A59', icon: 'bag', label: 'New Order' },
  KITCHEN_ALERT: { color: '#FF4D4D', icon: 'warning', label: 'Alert' },
  ORDER_READY: { color: '#2BC48A', icon: 'checkmark-circle', label: 'Order Ready' },
  INVENTORY_ALERT: { color: '#FF9F43', icon: 'cube', label: 'Inventory' },
  SYSTEM_MESSAGE: { color: '#6C63FF', icon: 'information-circle', label: 'System' },
};

interface NotificationHistoryScreenProps {
  onBack: () => void;
}

export default function NotificationHistoryScreen({ onBack }: NotificationHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.log('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.log('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.log('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notifications');
              setNotifications([]);
            } catch (error) {
              console.log('Error clearing notifications:', error);
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'READ') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotificationItem = ({ item }: { item: any }) => {
    const typeConfig = NOTIFICATION_TYPES[item.type as keyof typeof NOTIFICATION_TYPES] || NOTIFICATION_TYPES.SYSTEM_MESSAGE;
    
    return (
      <TouchableOpacity 
        style={[styles.item, !item.is_read && styles.unreadItem]}
        onPress={() => markAsRead(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
          <Ionicons name={typeConfig.icon as any} size={22} color={typeConfig.color} />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={[styles.typeLabel, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
          <Text style={styles.itemBody}>{item.body}</Text>
          <Text style={styles.time}>{item.created_at}</Text>
        </View>
        <View style={styles.actions}>
          {!item.is_read && <View style={styles.unreadDot} />}
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => deleteNotification(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification History</Text>
        <TouchableOpacity onPress={clearAllNotifications} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab === 'ALL' ? `All (${notifications.length})` : 
               tab === 'UNREAD' ? `Unread (${unreadCount})` : 
               `Read (${notifications.length - unreadCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mark All Read Button */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
          <Ionicons name="checkmark-done-outline" size={18} color={DESIGN.colors.orange} />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {/* Notification List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              {filter === 'UNREAD' ? 'No unread notifications' : 
               filter === 'READ' ? 'No read notifications' : 
               'You have no notifications yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: DESIGN.colors.red,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: DESIGN.colors.orange,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  filterTextActive: {
    color: DESIGN.colors.white,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
    gap: 6,
  },
  markAllText: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  unreadItem: {
    backgroundColor: '#FFF8F5',
    borderLeftWidth: 3,
    borderLeftColor: DESIGN.colors.orange,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    flex: 1,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemBody: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
    marginBottom: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginTop: 8,
  },
});
