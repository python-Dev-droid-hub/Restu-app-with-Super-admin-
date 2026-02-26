import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { getSpacing } from '../../utils/responsive';

interface Branch {
  _id: string;
  name: string;
  location: string;
  manager?: {
    _id: string;
    displayName: string;
    rating: number;
  };
  isActive: boolean;
  revenue: number;
  orders: number;
  performance: number;
}

interface SuperAdminOverviewTabProps {
  totalBranches: number;
  activeBranches: number;
  totalRevenue: number;
  totalOrders: number;
  branches: Branch[];
  loading: boolean;
}

export default function SuperAdminOverviewTab({
  totalBranches,
  activeBranches,
  totalRevenue,
  totalOrders,
  branches,
  loading,
}: SuperAdminOverviewTabProps) {
  // Sort branches by performance for top performers
  const topPerformers = [...branches]
    .sort((a, b) => (b.performance || 0) - (a.performance || 0))
    .slice(0, 3);

  // Find branches needing attention (performance < 90%)
  const attentionBranches = branches.filter(b => (b.performance || 100) < 90);

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString();
  };

  return (
    <View style={styles.container}>
      {/* Quick Stats - Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={[styles.statCard, { backgroundColor: COLORS.orange }]}>
          <Ionicons name="business" size={24} color="#fff" />
          <Text style={styles.statNumber}>{totalBranches}</Text>
          <Text style={styles.statLabel}>Total Branches</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: COLORS.green }]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.statNumber}>{activeBranches}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: COLORS.blue }]}>
          <Ionicons name="cash" size={24} color="#fff" />
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F39C12' }]}>
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.statNumber}>{totalOrders.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
      </ScrollView>

      {/* Top Performing Branches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Branches</Text>
        
        {topPerformers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No branch data available</Text>
          </View>
        ) : (
          topPerformers.map((branch, index) => (
            <View key={branch._id} style={styles.branchCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              
              <View style={styles.branchInfo}>
                <Text style={styles.branchName}>{branch.name}</Text>
                <Text style={styles.branchRevenue}>
                  Revenue: {formatCurrency(branch.revenue || 0)}/day
                </Text>
                <Text style={styles.branchOrders}>
                  Orders: {branch.orders || 0}/day
                </Text>
                
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceText}>
                    Performance: {branch.performance || 0}%
                  </Text>
                  <View style={styles.starContainer}>
                    {[1, 2, 3].map((star) => (
                      <Ionicons
                        key={star}
                        name="star"
                        size={14}
                        color={star <= Math.round((branch.performance || 0) / 20) ? '#FFD700' : '#ddd'}
                      />
                    ))}
                  </View>
                </View>
                
                <Text style={styles.managerText}>
                  Manager: {branch.manager?.displayName || 'Not Assigned'}
                </Text>
                
                <View style={[styles.statusBadge, branch.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, branch.isActive ? styles.activeText : styles.inactiveText]}>
                    {branch.isActive ? 'Active ✓' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All Branches</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {/* Alerts Section */}
      {attentionBranches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts & Issues</Text>
          
          {attentionBranches.map((branch) => (
            <View key={branch._id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={20} color={COLORS.error} />
                <Text style={styles.alertTitle}>ATTENTION REQUIRED</Text>
              </View>
              
              <Text style={styles.alertBranchName}>{branch.name}</Text>
              <Text style={styles.alertDescription}>
                Performance is low at {branch.performance || 0}%. Revenue down from expected targets.
              </Text>
              
              <View style={styles.alertActions}>
                <TouchableOpacity style={styles.alertButton}>
                  <Text style={styles.alertButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.alertButton, styles.alertButtonPrimary]}>
                  <Text style={[styles.alertButtonText, styles.alertButtonTextPrimary]}>
                    Assign Help
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.vertical,
  },
  statsContainer: {
    paddingRight: SPACING.horizontal,
    gap: SPACING.small,
  },
  statCard: {
    width: SPACING.statCard.width,
    height: SPACING.statCard.height,
    padding: SPACING.itemGap,
    borderRadius: SPACING.borderRadius.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SPACING.shadow.medium,
  },
  statNumber: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginTop: 4,
  },
  statValue: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginTop: 4,
  },
  statLabel: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.white,
    marginTop: 2,
    opacity: 0.9,
  },
  section: {
    marginTop: SPACING.section,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.subheading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: SPACING.itemGap,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.card,
    borderRadius: SPACING.borderRadius.card,
    alignItems: 'center',
    ...SPACING.shadow.light,
  },
  emptyText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
  },
  branchCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    marginBottom: SPACING.itemGap,
    flexDirection: 'row',
    ...SPACING.shadow.medium,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.itemGap,
  },
  rankText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.body,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: SPACING.tiny,
  },
  branchRevenue: {
    fontSize: FONTS.sizes.body,
    color: COLORS.orange,
    fontWeight: FONTS.weights.semibold,
  },
  branchOrders: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
    marginTop: SPACING.tiny,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  performanceText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
    marginRight: SPACING.small,
  },
  starContainer: {
    flexDirection: 'row',
  },
  managerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginTop: SPACING.tiny,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.borderRadius.card,
    marginTop: SPACING.small,
  },
  activeBadge: {
    backgroundColor: '#D4EDDA',
  },
  inactiveBadge: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.semibold,
  },
  activeText: {
    color: '#155724',
  },
  inactiveText: {
    color: '#721C24',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.itemGap,
    marginTop: SPACING.small,
  },
  viewAllText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.orange,
    fontWeight: FONTS.weights.semibold,
    marginRight: SPACING.tiny,
  },
  alertCard: {
    backgroundColor: '#FADBD8',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    borderRadius: SPACING.borderRadius.button,
    padding: SPACING.itemGap,
    marginBottom: SPACING.itemGap,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  alertTitle: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: COLORS.error,
    marginLeft: SPACING.small,
  },
  alertBranchName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  alertDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginTop: SPACING.tiny,
    marginBottom: SPACING.small,
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  alertButton: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.itemGap,
    borderRadius: SPACING.borderRadius.button,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  alertButtonPrimary: {
    backgroundColor: COLORS.orange,
  },
  alertButtonText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.blue,
    fontWeight: FONTS.weights.semibold,
  },
  alertButtonTextPrimary: {
    color: COLORS.white,
  },
});
