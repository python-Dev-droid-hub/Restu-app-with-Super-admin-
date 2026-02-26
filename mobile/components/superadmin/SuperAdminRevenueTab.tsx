import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { api } from '../../components/api/client';

export const SuperAdminRevenueTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    pendingPayouts: 0,
    monthlyReport: [],
    branchWise: [],
  });

  const fetchRevenue = async () => {
    try {
      const response = await api.get('/dashboard/superadmin/revenue?range=30d');
      if (response.success) {
        setRevenue(response.data);
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total Revenue Section */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>30 Days Revenue</Text>
        <Text style={styles.revenueAmount}>${(revenue.totalRevenue || 0).toLocaleString()}</Text>
        <View style={styles.trendContainer}>
          <Ionicons name="trending-up" size={20} color={COLORS.green} />
          <Text style={styles.trendText}>Total revenue across all branches</Text>
        </View>
      </View>

      {/* Pending Payouts Section */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Pending Payouts</Text>
        <Text style={[styles.revenueAmount, { color: COLORS.orange }]}>${(revenue.pendingPayouts || 0).toLocaleString()}</Text>
        <View style={styles.trendContainer}>
          <Ionicons name="time" size={20} color={COLORS.orange} />
          <Text style={[styles.trendText, { color: COLORS.orange }]}>Awaiting processing</Text>
        </View>
      </View>

      {/* Branch Revenue Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Branch</Text>
        {revenue.branchWise?.length > 0 ? (
          revenue.branchWise.map((branch: any, index: number) => (
            <View key={index} style={styles.payoutRow}>
              <View style={styles.payoutLeft}>
                <Text style={styles.payoutLabel}>{branch.name}</Text>
                <Text style={styles.monthlyStat}>${branch.revenue.toLocaleString()} ({branch.percentage}%)</Text>
              </View>
              <Text style={styles.monthlyValue}>{branch.orders} orders</Text>
            </View>
          ))
        ) : (
          <Text style={styles.monthlyStat}>No revenue data available</Text>
        )}
      </View>

      {/* Monthly Report */}
      <View style={styles.monthlyCard}>
        <Text style={styles.sectionTitle}>Monthly Report</Text>
        <View style={styles.growthRow}>
          <Ionicons name="trending-up" size={24} color={COLORS.green} />
          <Text style={styles.growthText}>Revenue Trend</Text>
        </View>
        <View style={styles.monthlyStats}>
          <Text style={styles.monthlyStat}>
            Total: <Text style={styles.monthlyValue}>${(revenue.totalRevenue || 0).toLocaleString()}</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.card,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: 20,
    marginBottom: SPACING.itemGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  revenueLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginBottom: SPACING.tiny,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: FONTS.weights.bold,
    color: COLORS.green,
    marginBottom: SPACING.small,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.green,
    marginLeft: SPACING.tiny,
  },
  breakdownSection: {
    marginBottom: SPACING.section,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.small,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    padding: 12,
    borderLeftWidth: 3,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  breakdownTitle: {
    fontSize: FONTS.sizes.tiny,
    marginBottom: 4,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: FONTS.weights.bold,
    marginBottom: 2,
  },
  breakdownPercent: {
    fontSize: FONTS.sizes.tiny,
  },
  section: {
    marginBottom: SPACING.section,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: SPACING.itemGap,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.itemGap,
    borderRadius: SPACING.borderRadius.button,
    marginBottom: SPACING.small,
  },
  payoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payoutLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
  },
  monthlyCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    marginBottom: SPACING.section,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  growthText: {
    fontSize: 16,
    fontWeight: FONTS.weights.bold,
    color: COLORS.green,
    marginLeft: SPACING.small,
  },
  monthlyStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyStat: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  monthlyValue: {
    fontWeight: FONTS.weights.semibold,
    color: COLORS.darkText,
  },
  monthlyDivider: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginHorizontal: SPACING.small,
  },
});

export default SuperAdminRevenueTab;
