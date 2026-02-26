import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserRole = 'ADMIN' | 'CUSTOMER' | 'CHEF' | 'WAITER' | 'RIDER';

const roles = [
  {
    id: 'ADMIN' as UserRole,
    title: 'Administrator',
    description: 'Manage restaurant operations, staff, and settings',
    icon: '👑',
    color: '#1976d2',
  },
  {
    id: 'CUSTOMER' as UserRole,
    title: 'Customer',
    description: 'Browse menu, place orders, track deliveries',
    icon: '👤',
    color: '#4caf50',
  },
  {
    id: 'CHEF' as UserRole,
    title: 'Chef',
    description: 'Manage kitchen orders and menu items',
    icon: '👨‍🍳',
    color: '#ff9800',
  },
  {
    id: 'WAITER' as UserRole,
    title: 'Waiter',
    description: 'Handle table service and customer orders',
    icon: '🪑',
    color: '#9c27b0',
  },
  {
    id: 'RIDER' as UserRole,
    title: 'Delivery Rider',
    description: 'Manage deliveries and track orders',
    icon: '🚴',
    color: '#f44336',
  },
];

const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

export default function RoleSelectionScreen() {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    await AsyncStorage.setItem('selectedRole', role);
    // @ts-ignore
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={[styles.header, { paddingTop: HEADER_MARGIN }]}>
        <Text style={styles.title}>Restaurant App</Text>
        <Text style={styles.subtitle}>Select your role to continue</Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleCard, { borderLeftColor: role.color }]}
            onPress={() => handleRoleSelect(role.id)}
            activeOpacity={0.7}
          >
            <View style={styles.roleIcon}>
              <Text style={styles.iconText}>{role.icon}</Text>
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </View>
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add bottom safe area to prevent overlap */}
      <View style={styles.bottomSafeArea} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Choose your role to access the appropriate dashboard
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
    padding: 20,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  arrow: {
    marginLeft: 16,
  },
  arrowText: {
    fontSize: 24,
    color: '#ccc',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40, // Extra bottom padding for safe area
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  bottomSafeArea: {
    height: 20, // Additional spacing before footer
  },
});
