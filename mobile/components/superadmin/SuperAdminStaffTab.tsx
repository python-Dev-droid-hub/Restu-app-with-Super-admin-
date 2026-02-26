import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { getSpacing } from '../../utils/responsive';

interface Branch {
  _id: string;
  name: string;
  staffCount?: {
    chefs: number;
    waiters: number;
    riders: number;
  };
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  branch: string;
  rating: number;
  ordersOrDeliveries: number;
  avatar?: string;
}

interface SuperAdminStaffTabProps {
  branches: Branch[];
  loading: boolean;
}

export default function SuperAdminStaffTab({
  branches,
}: SuperAdminStaffTabProps) {
  // Mock staff data
  const totalStaff = {
    chefs: 12,
    waiters: 15,
    riders: 18,
    total: 45,
  };

  const staffByBranch = [
    {
      branchName: 'Main Branch',
      staffCount: { chefs: 4, waiters: 6, riders: 5 },
      total: 15,
    },
    {
      branchName: 'North Branch',
      staffCount: { chefs: 3, waiters: 4, riders: 5 },
      total: 12,
    },
    {
      branchName: 'South Branch',
      staffCount: { chefs: 5, waiters: 5, riders: 8 },
      total: 18,
    },
  ];

  const topPerformers: StaffMember[] = [
    {
      id: '1',
      name: 'John Doe',
      role: 'Chef',
      branch: 'Main Branch',
      rating: 4.9,
      ordersOrDeliveries: 500,
    },
    {
      id: '2',
      name: 'Sarah Smith',
      role: 'Rider',
      branch: 'North Branch',
      rating: 4.7,
      ordersOrDeliveries: 240,
    },
    {
      id: '3',
      name: 'Mike Johnson',
      role: 'Waiter',
      branch: 'South Branch',
      rating: 4.6,
      ordersOrDeliveries: 450,
    },
  ];

  const currentlyOnDuty = {
    online: 28,
    offline: 17,
  };

  return (
    <View style={styles.container}>
      {/* Total Staff Overview */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Total Staff Across Branches</Text>
        <Text style={styles.overviewNumber}>{totalStaff.total} employees</Text>

        <View style={styles.roleContainer}>
          <View style={styles.roleItem}>
            <View style={[styles.roleIcon, { backgroundColor: COLORS.orange }]}>
              <Ionicons name="restaurant" size={16} color="#fff" />
            </View>
            <Text style={styles.roleCount}>{totalStaff.chefs}</Text>
            <Text style={styles.roleLabel}>Chefs</Text>
          </View>

          <View style={styles.roleItem}>
            <View style={[styles.roleIcon, { backgroundColor: COLORS.blue }]}>
              <Ionicons name="people" size={16} color="#fff" />
            </View>
            <Text style={styles.roleCount}>{totalStaff.waiters}</Text>
            <Text style={styles.roleLabel}>Waiters</Text>
          </View>

          <View style={styles.roleItem}>
            <View style={[styles.roleIcon, { backgroundColor: COLORS.green }]}>
              <Ionicons name="bicycle" size={16} color="#fff" />
            </View>
            <Text style={styles.roleCount}>{totalStaff.riders}</Text>
            <Text style={styles.roleLabel}>Riders</Text>
          </View>
        </View>
      </View>

      {/* Staff by Branch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff by Branch</Text>

        {staffByBranch.map((branch, index) => (
          <View key={index} style={styles.branchCard}>
            <View style={styles.branchHeader}>
              <Text style={styles.branchName}>{branch.branchName}</Text>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{branch.total}</Text>
              </View>
            </View>

            <View style={styles.staffBreakdown}>
              <View style={styles.staffType}>
                <Text style={styles.staffTypeCount}>{branch.staffCount.chefs}</Text>
                <Text style={styles.staffTypeLabel}>Chefs</Text>
              </View>
              <View style={styles.staffType}>
                <Text style={styles.staffTypeCount}>{branch.staffCount.waiters}</Text>
                <Text style={styles.staffTypeLabel}>Waiters</Text>
              </View>
              <View style={styles.staffType}>
                <Text style={styles.staffTypeCount}>{branch.staffCount.riders}</Text>
                <Text style={styles.staffTypeLabel}>Riders</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Top Performers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Staff</Text>

        {topPerformers.map((staff, index) => (
          <View key={staff.id} style={styles.performerCard}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>

            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            </View>

            <View style={styles.performerInfo}>
              <Text style={styles.performerName}>{staff.name}</Text>
              <Text style={styles.performerRole}>{staff.role}</Text>
              <Text style={styles.performerBranch}>{staff.branch}</Text>
            </View>

            <View style={styles.performerStats}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{staff.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.performanceText}>
                {staff.role === 'Rider' ? `${staff.ordersOrDeliveries} deliveries` : `${staff.ordersOrDeliveries} orders`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Currently On Duty */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currently On Duty</Text>
        <View style={styles.dutyCard}>
          <View style={styles.dutyItem}>
            <View style={[styles.dutyIndicator, { backgroundColor: COLORS.green }]} />
            <View style={styles.dutyInfo}>
              <Text style={styles.dutyNumber}>{currentlyOnDuty.online}</Text>
              <Text style={styles.dutyLabel}>Online Staff</Text>
            </View>
          </View>

          <View style={styles.dutyDivider} />

          <View style={styles.dutyItem}>
            <View style={[styles.dutyIndicator, { backgroundColor: '#95A5A6' }]} />
            <View style={styles.dutyInfo}>
              <Text style={styles.dutyNumber}>{currentlyOnDuty.offline}</Text>
              <Text style={styles.dutyLabel}>Offline Staff</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Staff by Role Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff Distribution by Role</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartRow}>
            <Text style={styles.chartLabel}>Chefs</Text>
            <View style={styles.chartBarContainer}>
              <View style={[styles.chartBar, { width: '40%', backgroundColor: COLORS.orange }]}>
                <Text style={styles.chartBarText}>27%</Text>
              </View>
            </View>
            <Text style={styles.chartValue}>{totalStaff.chefs}</Text>
          </View>

          <View style={styles.chartRow}>
            <Text style={styles.chartLabel}>Waiters</Text>
            <View style={styles.chartBarContainer}>
              <View style={[styles.chartBar, { width: '33%', backgroundColor: COLORS.blue }]}>
                <Text style={styles.chartBarText}>33%</Text>
              </View>
            </View>
            <Text style={styles.chartValue}>{totalStaff.waiters}</Text>
          </View>

          <View style={styles.chartRow}>
            <Text style={styles.chartLabel}>Riders</Text>
            <View style={styles.chartBarContainer}>
              <View style={[styles.chartBar, { width: '40%', backgroundColor: COLORS.green }]}>
                <Text style={styles.chartBarText}>40%</Text>
              </View>
            </View>
            <Text style={styles.chartValue}>{totalStaff.riders}</Text>
          </View>
        </View>
      </View>

      {/* Filter Button */}
      <TouchableOpacity style={styles.filterButton}>
        <Ionicons name="filter" size={18} color={COLORS.orange} />
        <Text style={styles.filterButtonText}>Filter by Branch, Role, or Performance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: getSpacing(16),
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(20),
    marginBottom: getSpacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 8,
  },
  overviewNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  roleItem: {
    alignItems: 'center',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  roleLabel: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  section: {
    marginBottom: getSpacing(20),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: getSpacing(12),
  },
  branchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
    marginBottom: getSpacing(12),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  totalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  staffBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  staffType: {
    alignItems: 'center',
  },
  staffTypeCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  staffTypeLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 2,
  },
  performerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(12),
    marginBottom: getSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  performerRole: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  performerBranch: {
    fontSize: 11,
    color: '#95A5A6',
    marginTop: 2,
  },
  performerStats: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 4,
  },
  performanceText: {
    fontSize: 11,
    color: COLORS.lightText,
  },
  dutyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dutyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dutyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dutyInfo: {
    alignItems: 'center',
  },
  dutyNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  dutyLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 2,
  },
  dutyDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartLabel: {
    width: 60,
    fontSize: 13,
    color: COLORS.darkText,
  },
  chartBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 4,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  chartBarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  chartValue: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'right',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: getSpacing(20),
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: 8,
  },
});
