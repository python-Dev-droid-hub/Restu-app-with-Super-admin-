import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// App Styling Constants
const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
};

const FONTS = {
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
};

interface RiderEarningsTabProps {
  todayEarnings: number;
  weekEarnings: number;
  totalDeliveries: number;
  earnings: any;
  formatPrice: (amount: number) => string;
}

export default function RiderEarningsTab({
  todayEarnings,
  weekEarnings,
  totalDeliveries,
  earnings,
  formatPrice,
}: RiderEarningsTabProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        <Text style={styles.earningsAmount}>${todayEarnings.toFixed(2)}</Text>
        <Text style={styles.earningsPeriod}>Last 7 Days: ${weekEarnings.toFixed(2)}</Text>
        
        {/* Chart Placeholder */}
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartBars}>
            {[40, 65, 45, 80, 55, 70, 60].map((height, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.bar, { height: height }]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.metricsCard}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>On-time</Text>
          <Text style={styles.metricValue}>92%</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Acceptance</Text>
          <Text style={styles.metricValue}>87%</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Completion</Text>
          <Text style={styles.metricValue}>100%</Text>
        </View>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Cash</Text>
          <Text style={styles.breakdownValue}>${(todayEarnings * 0.4).toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Online</Text>
          <Text style={styles.breakdownValue}>${(todayEarnings * 0.5).toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Tips</Text>
          <Text style={styles.breakdownValue}>${(todayEarnings * 0.1).toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.paymentCard}>
        <Text style={styles.paymentTitle}>Connected Payment Method</Text>
        <Text style={styles.paymentMethod}>Bank Account: XXXXXX1234</Text>
        <Text style={styles.lastPayout}>Last Payout: Feb 21, 2024</Text>
        <TouchableOpacity style={styles.changeMethodButton}>
          <Text style={styles.changeMethodText}>Change Method</Text>
        </TouchableOpacity>
      </View>

      {/* Payout History */}
      <View style={styles.payoutCard}>
        <Text style={styles.payoutTitle}>Payout History</Text>
        {[
          { date: 'Feb 21, 2024', amount: 200 },
          { date: 'Feb 14, 2024', amount: 195.5 },
          { date: 'Feb 7, 2024', amount: 187.75 },
        ].map((payout, index) => (
          <View key={index} style={styles.payoutRow}>
            <Text style={styles.payoutDate}>{payout.date}</Text>
            <View style={styles.payoutRight}>
              <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.verticalGap,
  },
  earningsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  earningsPeriod: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
    marginBottom: 16,
  },
  chartPlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: COLORS.lightBg,
    borderRadius: 8,
    justifyContent: 'flex-end',
    padding: 12,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 50,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  metricsCard: {
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
  },
  metricValue: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 12,
  },
  breakdownLabel: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
  },
  breakdownValue: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginBottom: 4,
  },
  lastPayout: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
    marginBottom: 16,
  },
  changeMethodButton: {
    backgroundColor: COLORS.info,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeMethodText: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.white,
  },
  payoutCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutTitle: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  payoutDate: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
  },
  payoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutAmount: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  viewAllButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
