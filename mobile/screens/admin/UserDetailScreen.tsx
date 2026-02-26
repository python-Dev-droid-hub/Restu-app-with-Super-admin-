import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface User {
  _id: string;
  email: string;
  displayName?: string;
  role: string;
  phoneNumber?: string;
  profileImage?: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  assignedBranch?: string;
  lastLoginAt?: string;
  createdAt: string;
  vehicleNumber?: string;
  vehicleType?: string;
  specialization?: string;
  assignedSection?: string;
}

export default function UserDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params as { userId: string };
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}`);
      if (response.success) {
        setUser(response.data.user);
      } else {
        Alert.alert('Error', 'Failed to load user details');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const toggleUserStatus = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const endpoint = user.isActive 
        ? `/users/${userId}/deactivate` 
        : `/users/${userId}/activate`;
      const response = await api.put(endpoint, {});

      if (response.success) {
        Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
        setUser({ ...user, isActive: !user.isActive });
      } else {
        Alert.alert('Error', response.message || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', error?.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/users/${userId}`);
              if (response.success) {
                Alert.alert('Success', 'User deleted');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
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
              await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
              // @ts-ignore
              navigation.reset({
                index: 0,
                // @ts-ignore
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#1976d2';
      case 'CHEF': return '#ff9800';
      case 'WAITER': return '#9c27b0';
      case 'RIDER': return '#f44336';
      case 'CUSTOMER': return '#4caf50';
      case 'BRANCH_MANAGER': return '#795548';
      default: return '#666';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'shield-outline';
      case 'CHEF': return 'restaurant-outline';
      case 'WAITER': return 'cafe-outline';
      case 'RIDER': return 'bicycle-outline';
      case 'CUSTOMER': return 'person-outline';
      case 'BRANCH_MANAGER': return 'business-outline';
      default: return 'person-outline';
    }
  };

  if (!user && loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>User not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity onPress={() => setShowProfileMenu(true)}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ 
              uri: user.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' 
            }}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{user.displayName || 'No Name'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <Ionicons name={getRoleIcon(user.role) as any} size={14} color="#fff" />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: user.isActive ? '#4caf50' : '#f44336' }]}>
            <Text style={styles.statusText}>{user.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E87E35' }]}>
            <Ionicons name="mail-outline" size={24} color="#fff" />
            <Text style={styles.statLabel}>Email</Text>
            <Text style={styles.statValue}>{user.emailVerified ? 'Verified' : 'Not Verified'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2196f3' }]}>
            <Ionicons name="call-outline" size={24} color="#fff" />
            <Text style={styles.statLabel}>Phone</Text>
            <Text style={styles.statValue}>{user.phoneVerified ? 'Verified' : 'Not Verified'}</Text>
          </View>
        </View>

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          
          <View style={styles.infoCard}>
            <InfoRow icon="call-outline" label="Phone Number" value={user.phoneNumber || 'Not provided'} />
            <InfoRow icon="calendar-outline" label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
            <InfoRow 
              icon="time-outline" 
              label="Last Login" 
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'} 
            />
            {user.assignedBranch && (
              <InfoRow icon="business-outline" label="Branch" value={user.assignedBranch} />
            )}
          </View>
        </View>

        {/* Role-Specific Information */}
        {user.role === 'RIDER' && (user.vehicleNumber || user.vehicleType) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rider Information</Text>
            <View style={styles.infoCard}>
              {user.vehicleType && <InfoRow icon="bicycle-outline" label="Vehicle Type" value={user.vehicleType} />}
              {user.vehicleNumber && <InfoRow icon="card-outline" label="Vehicle Number" value={user.vehicleNumber} />}
            </View>
          </View>
        )}

        {user.role === 'CHEF' && user.specialization && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chef Information</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="restaurant-outline" label="Specialization" value={user.specialization} />
            </View>
          </View>
        )}

        {user.role === 'WAITER' && user.assignedSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waiter Information</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="cafe-outline" label="Assigned Section" value={user.assignedSection} />
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: user.isActive ? '#f44336' : '#4caf50' }]}
              onPress={toggleUserStatus}
            >
              <Ionicons 
                name={user.isActive ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.actionButtonText}>
                {user.isActive ? 'Deactivate User' : 'Activate User'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#E87E35' }]}
              onPress={() => { // @ts-ignore
                navigation.navigate('EditUser', { userId });
              }}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Edit User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f44336' }]}
              onPress={deleteUser}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Delete User</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
                style={styles.profileMenuImage}
              />
              <View>
                <Text style={styles.profileMenuName}>Admin User</Text>
                <Text style={styles.profileMenuRole}>Administrator</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Helper component for info rows
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={20} color="#E87E35" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    color: '#E87E35',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  profileMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileMenuImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  profileMenuRole: {
    fontSize: 12,
    color: '#888',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  profileMenuItemText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '500',
  },
});
