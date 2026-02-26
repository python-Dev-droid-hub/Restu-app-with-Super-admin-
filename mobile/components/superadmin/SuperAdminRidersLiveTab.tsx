import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

const { width } = Dimensions.get('window');

interface Rider {
  id: string;
  name: string;
  avatar: string;
  status: 'preparing' | 'on_route' | 'delivery' | 'available' | 'offline';
  rating: number;
  currentOrder?: string;
  lat: number;
  lng: number;
}

const mockRiders: Rider[] = [
  {
    id: '1',
    name: 'Robert Cole',
    avatar: 'https://i.pravatar.cc/150?u=1',
    status: 'delivery',
    rating: 4.8,
    currentOrder: 'On Delivery',
    lat: 40.7128,
    lng: -74.0060,
  },
  {
    id: '2',
    name: 'Amy Wilson',
    avatar: 'https://i.pravatar.cc/150?u=2',
    status: 'preparing',
    rating: 4.8,
    currentOrder: 'Order #1025',
    lat: 40.7200,
    lng: -74.0100,
  },
  {
    id: '3',
    name: 'Michael Brown',
    avatar: 'https://i.pravatar.cc/150?u=3',
    status: 'available',
    rating: 4.5,
    lat: 40.7150,
    lng: -74.0020,
  },
  {
    id: '4',
    name: 'Sarah Davis',
    avatar: 'https://i.pravatar.cc/150?u=4',
    status: 'on_route',
    rating: 4.7,
    currentOrder: 'Order #1026',
    lat: 40.7180,
    lng: -74.0080,
  },
  {
    id: '5',
    name: 'James Miller',
    avatar: 'https://i.pravatar.cc/150?u=5',
    status: 'offline',
    rating: 4.2,
    lat: 40.7100,
    lng: -74.0040,
  },
];

const getStatusColor = (status: Rider['status']) => {
  switch (status) {
    case 'delivery':
      return COLORS.orange;
    case 'on_route':
      return COLORS.blue;
    case 'available':
      return COLORS.green;
    case 'preparing':
      return COLORS.purple;
    case 'offline':
    default:
      return '#999999';
  }
};

const getStatusLabel = (status: Rider['status']) => {
  switch (status) {
    case 'delivery':
      return 'On Delivery';
    case 'on_route':
      return 'On Route';
    case 'available':
      return 'Available';
    case 'preparing':
      return 'Preparing';
    case 'offline':
    default:
      return 'Offline';
  }
};

type TabType = 'preparing' | 'on_route' | 'delivery';

export const SuperAdminRidersLiveTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('delivery');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active'>('all');

  const activeRiders = mockRiders.filter(
    (r) => r.status !== 'offline'
  ).length;

  const filteredRiders = mockRiders.filter((rider) => {
    if (filterStatus === 'active') {
      return rider.status !== 'offline';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Riders Live</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>All ▼</Text>
          </TouchableOpacity>
          <Text style={styles.activeCount}>Active {activeRiders}</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabs}>
        {(['preparing', 'on_route', 'delivery'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, activeTab === tab && styles.subTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.subTabText,
                activeTab === tab && styles.subTabTextActive,
              ]}
            >
              {tab === 'on_route' ? 'On Route' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color={COLORS.lightText} />
          <Text style={styles.mapText}>Map View - Rider Locations</Text>
          <Text style={styles.mapSubtext}>Google Maps Integration</Text>
        </View>
        
        {/* Map Pins Simulation */}
        <View style={styles.pinsContainer}>
          {filteredRiders.slice(0, 3).map((rider, index) => (
            <View
              key={rider.id}
              style={[
                styles.mapPin,
                {
                  left: 50 + index * 80,
                  top: 40 + (index % 2) * 60,
                  borderColor: getStatusColor(rider.status),
                },
              ]}
            >
              <Image source={{ uri: rider.avatar }} style={styles.pinAvatar} />
            </View>
          ))}
        </View>
      </View>

      {/* Rider List */}
      <ScrollView style={styles.riderList} showsVerticalScrollIndicator={false}>
        {filteredRiders.map((rider) => (
          <TouchableOpacity key={rider.id} style={styles.riderCard}>
            <Image source={{ uri: rider.avatar }} style={styles.riderAvatar} />
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{rider.name}</Text>
              <Text style={styles.riderStatus}>
                {rider.currentOrder || getStatusLabel(rider.status)}
              </Text>
            </View>
            <View style={styles.riderRating}>
              <Ionicons name="star" size={14} color={COLORS.orange} />
              <Text style={styles.ratingText}>{rider.rating}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.lightText} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Assign Rider Button */}
      <TouchableOpacity style={styles.assignButton}>
        <Text style={styles.assignButtonText}>ASSIGN RIDER</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.horizontal,
    paddingVertical: SPACING.card,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    marginRight: SPACING.card,
  },
  filterText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
  },
  activeCount: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subTab: {
    paddingVertical: SPACING.itemGap,
    paddingHorizontal: SPACING.card,
    marginRight: SPACING.small,
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.orange,
  },
  subTabText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  subTabTextActive: {
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  mapContainer: {
    height: 250,
    backgroundColor: '#e8e8e8',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
    marginTop: SPACING.small,
  },
  mapSubtext: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginTop: SPACING.tiny,
  },
  pinsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pinAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  riderList: {
    flex: 1,
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.itemGap,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    padding: SPACING.itemGap,
    marginBottom: SPACING.small,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  riderInfo: {
    flex: 1,
    marginLeft: SPACING.small,
  },
  riderName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.darkText,
  },
  riderStatus: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginTop: 2,
  },
  riderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.small,
  },
  ratingText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.orange,
    marginLeft: 2,
    fontWeight: FONTS.weights.medium,
  },
  assignButton: {
    backgroundColor: COLORS.red,
    marginHorizontal: SPACING.horizontal,
    marginVertical: SPACING.card,
    paddingVertical: 14,
    borderRadius: SPACING.borderRadius.button,
    alignItems: 'center',
  },
  assignButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
});

export default SuperAdminRidersLiveTab;
