import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: string;
  time: string;
  status: 'preparing' | 'ready' | 'completed' | 'delivering';
  riderName: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-1025',
    customerName: 'Michael Brown',
    amount: '$35.50',
    time: '2 mins',
    status: 'preparing',
    riderName: 'Robert Cole',
  },
  {
    id: '2',
    orderNumber: 'ORD-1024',
    customerName: 'James Wilson',
    amount: '$22.00',
    time: '10 mins',
    status: 'ready',
    riderName: 'Amy Wilson',
  },
  {
    id: '3',
    orderNumber: 'ORD-1023',
    customerName: 'Sarah Davis',
    amount: '$28.75',
    time: '5 mins',
    status: 'delivering',
    riderName: 'Michael Brown',
  },
  {
    id: '4',
    orderNumber: 'ORD-1022',
    customerName: 'Emma Johnson',
    amount: '$42.00',
    time: '15 mins',
    status: 'completed',
    riderName: 'Sarah Lee',
  },
  {
    id: '5',
    orderNumber: 'ORD-1021',
    customerName: 'David Miller',
    amount: '$18.50',
    time: '1 min',
    status: 'preparing',
    riderName: 'James Miller',
  },
];

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'preparing':
      return COLORS.blue;
    case 'ready':
      return COLORS.orange;
    case 'delivering':
      return COLORS.purple;
    case 'completed':
      return COLORS.green;
    default:
      return COLORS.lightText;
  }
};

const getStatusLabel = (status: Order['status']) => {
  switch (status) {
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'delivering':
      return 'Delivering';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

type StatusFilter = 'all' | 'preparing' | 'ready' | 'completed';

export const SuperAdminOrdersTab: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const filteredOrders =
    activeFilter === 'all'
      ? mockOrders
      : mockOrders.filter((o) => o.status === activeFilter);

  const orderCount = mockOrders.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.count}>{orderCount}</Text>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'preparing', 'ready', 'completed'] as StatusFilter[]).map(
          (filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Orders List */}
      <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
        {filteredOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            {/* Card Header Row */}
            <View style={styles.cardHeader}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <Text style={styles.amount}>{order.amount}</Text>
            </View>

            {/* Card Details Row */}
            <View style={styles.cardDetails}>
              <Text style={styles.timeText}>{order.time}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusLabel(order.status)}
                </Text>
              </View>
              <Text style={styles.riderText}>{order.riderName}</Text>
            </View>
          </View>
        ))}

        {/* Load More Button */}
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More...</Text>
        </TouchableOpacity>
      </ScrollView>
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
  count: {
    fontSize: 18,
    fontWeight: FONTS.weights.bold,
    color: COLORS.orange,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.horizontal,
    paddingBottom: SPACING.itemGap,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.card,
    marginRight: SPACING.small,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.orange,
  },
  filterTabText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  filterTabTextActive: {
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.itemGap,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    padding: SPACING.itemGap,
    marginBottom: SPACING.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  orderNumber: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  customerName: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
    flex: 1,
    textAlign: 'center',
  },
  amount: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: COLORS.orange,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  riderText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  loadMoreButton: {
    paddingVertical: SPACING.card,
    alignItems: 'center',
    marginBottom: SPACING.section,
  },
  loadMoreText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
});

export default SuperAdminOrdersTab;
