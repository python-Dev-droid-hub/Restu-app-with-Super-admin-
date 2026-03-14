import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useWebSocket } from '../../context/WebSocketContext';
import Toast from 'react-native-toast-message';

const SETTING_ITEMS = [
  {
    id: '1',
    title: 'Account Settings',
    subtitle: 'Manage your account information',
    icon: 'person-outline',
    action: 'account',
  },
  {
    id: '2',
    title: 'Privacy Settings',
    subtitle: 'Control your privacy preferences',
    icon: 'lock-closed-outline',
    action: 'privacy',
  },
  {
    id: '3',
    title: 'App Preferences',
    subtitle: 'Customize your app experience',
    icon: 'options-outline',
    action: 'preferences',
  },
  {
    id: '4',
    title: 'Language',
    subtitle: 'English (Default)',
    icon: 'language-outline',
    action: 'language',
  },
  {
    id: '5',
    title: 'About App',
    subtitle: 'App version and information',
    icon: 'information-circle-outline',
    action: 'about',
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { disconnectWebSocket } = useWebSocket();
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [autoReorder, setAutoReorder] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [autoLogin, setAutoLogin] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [shareData, setShareData] = useState(false);

  const settingSections = [
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { label: 'Push Notifications', value: pushNotifications, onToggle: () => setPushNotifications(!pushNotifications) },
        { label: 'Email Notifications', value: emailNotifications, onToggle: () => setEmailNotifications(!emailNotifications) },
        { label: 'SMS Notifications', value: smsNotifications, onToggle: () => setSmsNotifications(!smsNotifications) },
      ]
    },
    {
      title: 'Preferences',
      icon: 'options',
      items: [
        { label: 'Auto Reorder', value: autoReorder, onToggle: () => setAutoReorder(!autoReorder) },
        { label: 'Save History', value: saveHistory, onToggle: () => setSaveHistory(!saveHistory) },
        { label: 'Auto Login', value: autoLogin, onToggle: () => setAutoLogin(!autoLogin) },
      ]
    },
    {
      title: 'Privacy',
      icon: 'lock-closed',
      items: [
        { label: 'Share Location', value: shareLocation, onToggle: () => setShareLocation(!shareLocation) },
        { label: 'Share Data', value: shareData, onToggle: () => setShareData(!shareData) },
      ]
    },
  ];

  const otherSettings = [
    { id: '1', title: 'Account Settings', icon: 'person-outline', action: () => Alert.alert('Account Settings', 'Navigate to account settings') },
    { id: '2', title: 'Privacy Settings', icon: 'lock-closed-outline', action: () => Alert.alert('Privacy Settings', 'Navigate to privacy settings') },
    { id: '3', title: 'Language', icon: 'language-outline', action: () => Alert.alert('Language', 'Language settings will be available soon!') },
    { id: '4', title: 'About App', icon: 'information-circle-outline', action: () => Alert.alert('About', 'Restaurant App v1.0.0\n© 2024 Restaurant App') },
  ];

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
              // Disconnect WebSocket
              disconnectWebSocket();
              console.log('[Settings] WebSocket disconnected');

              // Clear user data
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('userData');
              console.log('[Settings] User data cleared');

              Toast.show({
                type: 'success',
                text1: 'Logged out',
                text2: 'You have been logged out successfully',
                duration: 2000,
              });

              // Navigate to login
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' as never }],
                })
              );
            } catch (error) {
              console.error('[Settings] Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Toggles */}
        <View style={styles.quickSettings}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Enable dark theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.gray_300, true: colors.primary }}
              thumbColor={darkMode ? colors.white : colors.gray_100}
            />
          </View>
        </View>

        {/* Setting Sections */}
        {settingSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.items.map((item, i) => (
              <View key={i} style={[styles.settingRow, i === section.items.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: colors.gray_300, true: colors.primary }}
                  thumbColor={item.value ? colors.white : colors.gray_100}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Other Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          {otherSettings.map((item, i) => (
            <TouchableOpacity key={item.id} onPress={item.action} style={[styles.otherSetting, i === otherSettings.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.otherSettingLeft}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                <Text style={styles.otherSettingText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray_400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  settingIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
  quickSettings: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  settingLabel: {
    fontSize: typography.sizes.body,
    color: colors.text_dark,
    flex: 1,
  },
  otherSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  otherSettingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  otherSettingText: {
    fontSize: typography.sizes.body,
    color: colors.text_dark,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    color: colors.white,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
  },
});
