import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
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
  },
  spacing: { pagePad: 16 },
};

interface NotificationsScreenProps {
  onBack: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    newOrderAssigned: true,
    orderReadyPickup: true,
    kitchenAlert: true,
    systemMessage: true,
    lowInventory: false,
    pushNotifications: true,
    soundAlert: true,
    vibrationAlert: true,
    dndEnabled: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  // Load notification history from API
  useEffect(() => {
    const loadNotificationHistory = async () => {
      try {
        setLoading(true);
        const response = await api.get('/notifications/history');
        if (response.success && response.data) {
          setNotificationHistory(response.data.notifications || []);
        }
      } catch (error) {
        console.log('Error loading notification history:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNotificationHistory();
  }, []);

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notifications/history');
              setNotificationHistory([]);
            } catch (error) {
              console.log('Error clearing notification history:', error);
            }
          },
        },
      ]
    );
  };

  const savePreferences = async () => {
    try {
      await api.patch('/notifications/preferences', settings);
      Alert.alert('Success', 'Notification preferences saved');
    } catch (error) {
      console.log('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        {[
          { key: 'newOrderAssigned' as const, label: 'New Order Assigned', desc: 'When order gets assigned to you' },
          { key: 'orderReadyPickup' as const, label: 'Order Ready for Pickup', desc: 'When waiter/rider picks up from kitchen' },
          { key: 'kitchenAlert' as const, label: 'Kitchen Alert', desc: 'Urgent message from manager' },
          { key: 'systemMessage' as const, label: 'System Message', desc: 'App updates, maintenance notices' },
          { key: 'lowInventory' as const, label: 'Low Inventory Alert', desc: 'When ingredient stock is low' },
        ].map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Text style={styles.toggleDesc}>{item.desc}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggleSetting(item.key)}
              trackColor={{ false: '#ddd', true: DESIGN.colors.green }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      {/* Notification Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Method</Text>
        {[
          { key: 'pushNotifications' as const, label: 'Push Notifications' },
          { key: 'soundAlert' as const, label: 'Sound Alert' },
          { key: 'vibrationAlert' as const, label: 'Vibration Alert' },
        ].map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{item.label}</Text>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggleSetting(item.key)}
              trackColor={{ false: '#ddd', true: DESIGN.colors.green }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      {/* Notification History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {notificationHistory.map((notif) => (
          <View key={notif.id} style={[styles.notifItem, notif.read && styles.notifItemRead]}>
            <Text style={styles.notifMessage}>{notif.message}</Text>
            <Text style={styles.notifTime}>{notif.time}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
          <Text style={styles.clearBtnText}>Clear History</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={savePreferences}>
        <Text style={styles.saveBtnText}>Save Preferences</Text>
      </TouchableOpacity>
    </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  section: {
    backgroundColor: DESIGN.colors.white,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  toggleDesc: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#F8F9FA',
  },
  notifItemRead: {
    backgroundColor: DESIGN.colors.white,
  },
  notifMessage: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    flex: 1,
  },
  notifTime: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 16,
  },
  clearBtnText: {
    color: DESIGN.colors.red,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: DESIGN.colors.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
