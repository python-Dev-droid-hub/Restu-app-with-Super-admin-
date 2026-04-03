import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';

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

interface LogoutConfirmScreenProps {
  onBack: () => void;
  api: any;
}

export default function LogoutConfirmScreen({ onBack, api }: LogoutConfirmScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);

  const handleLogout = async () => {
    try {
      // Call logout API
      await api.post('/auth/logout', {
        logout_all_devices: logoutAllDevices,
      });

      // Clear local storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('selectedBranchId'); // Clear saved branch on logout

      // Navigate to login
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' as any }],
        })
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logout</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Confirmation Card */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="log-out-outline" size={40} color={DESIGN.colors.red} />
        </View>
        
        <Text style={styles.title}>Are you sure?</Text>
        <Text style={styles.message}>You will be logged out from this device</Text>

        {/* Option */}
        <View style={styles.optionRow}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionLabel}>Logout from all devices</Text>
            <Text style={styles.optionDesc}>Includes all other phones and browsers</Text>
          </View>
          <Switch
            value={logoutAllDevices}
            onValueChange={setLogoutAllDevices}
            trackColor={{ false: '#ddd', true: DESIGN.colors.red }}
            thumbColor="#fff"
          />
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  card: {
    backgroundColor: DESIGN.colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 24,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  logoutBtn: {
    backgroundColor: DESIGN.colors.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelBtnText: {
    color: DESIGN.colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
});
