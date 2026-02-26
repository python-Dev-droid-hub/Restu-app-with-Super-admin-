import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { getSpacing } from '../../utils/responsive';

const { width } = Dimensions.get('window');

interface Branch {
  _id: string;
  name: string;
  revenue: number;
  orders: number;
  monthlyRevenue: number;
}

interface SuperAdminFinancialTabProps {
  branches: Branch[];
  totalRevenue: number;
  loading: boolean;
}

export default function SuperAdminFinancialTab({
  branches,
  totalRevenue,
}: SuperAdminFinancialTabProps) {
  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString();
  };

  // Calculate daily average
  const dailyAverage = totalRevenue / 30;

  // Sort branches by revenue for breakdown
  const sortedBranches = [...branches]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  const totalBranchRevenue = sortedBranches.reduce((sum, b) => sum + (b.revenue || 0), 0);

  // Mock data for charts
  const dailyRevenue = [
    { day: 'Mon', amount: 5200 },
    { day: 'Tue', amount: 6100 },
    { day: 'Wed', amount: 5800 },
    { day: 'Thu', amount: 7200 },
    { day: 'Fri', amount: 8500 },
    { day: 'Sat', amount: 9200 },
    { day: 'Sun', amount: 7800 },
  ];

  const paymentMethods = [
    { method: 'Cash', amount: totalRevenue * 0.5, color: COLORS.green, icon: 'cash' },
    { method: 'Card', amount: totalRevenue * 0.4, color: COLORS.blue, icon: 'card' },
    { method: 'Digital Wallet', amount: totalRevenue * 0.1, color: '#F39C12', icon: 'phone-portrait' },
  ];

  const expenses = {
    salaries: 45000,
    inventory: 32000,
    rent: 12000,
    utilities: 5000,
    other: 8000,
  };

  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <View style={styles.container}>
      {/* Total Revenue Card */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Total Revenue</Text>
        <Text style={styles.revenueAmount}>{formatCurrency(totalRevenue)}</Text>
        <Text style={styles.revenuePeriod}>This Month</Text>

        <View style={styles.revenueStatsRow}>
          <View style={styles.revenueStat}>
            <Text style={styles.revenueStatLabel}>Daily Average</Text>
            <Text style={styles.revenueStatValue}>{formatCurrency(dailyAverage)}</Text>
          </View>
          <View style={styles.revenueStat}>
            <Text style={styles.revenueStatLabel}>Trend</Text>
            <Text style={[styles.revenueStatValue, styles.trendUp]}>↑ +12%</Text>
          </View>
        </View>
      </View>

      {/* Revenue by Branch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Branch</Text>

        {sortedBranches.map((branch, index) => {
          const percentage = totalBranchRevenue > 0
            ? ((branch.revenue || 0) / totalBranchRevenue) * 100
            : 0;

          return (
            <View key={branch._id} style={styles.branchRevenueItem}>
              <View style={styles.branchRevenueHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <Text style={styles.branchAmount}>{formatCurrency(branch.revenue || 0)}</Text>
                </View>
                <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.max(percentage, 5)}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Daily Revenue Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend (Last 7 Days)</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartContainer}>
            {dailyRevenue.map((item, index) => {
              const maxAmount = Math.max(...dailyRevenue.map(d => d.amount));
              const height = (item.amount / maxAmount) * 150;

              return (
                <View key={index} style={styles.chartColumn}>
                  <View style={[styles.chartBar, { height }]}>
                    <Text style={styles.chartValue}>
                      ${(item.amount / 1000).toFixed(1)}k
                    </Text>
                  </View>
                  <Text style={styles.chartLabel}>{item.day}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.chartStats}>
            <View style={styles.chartStat}>
              <Text style={styles.chartStatLabel}>Peak</Text>
              <Text style={styles.chartStatValue}>$9,200 (Sat)</Text>
            </View>
            <View style={styles.chartStat}>
              <Text style={styles.chartStatLabel}>Lowest</Text>
              <Text style={styles.chartStatValue}>$5,200 (Mon)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethodsCard}>
          {paymentMethods.map((method) => (
            <View key={method.method} style={styles.paymentMethodItem}>
              <View style={[styles.paymentIcon, { backgroundColor: method.color }]}>
                <Ionicons name={method.icon as any} size={20} color="#fff" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethodName}>{method.method}</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(method.amount)}</Text>
              </View>
              <Text style={styles.paymentPercentage}>
                {((method.amount / totalRevenue) * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Expenses Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Expenses</Text>
        <View style={styles.expensesCard}>
          {Object.entries(expenses).map(([category, amount]) => (
            <View key={category} style={styles.expenseItem}>
              <Text style={styles.expenseCategory}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Text style={styles.expenseAmount}>{formatCurrency(amount)}</Text>
            </View>
          ))}
          <View style={styles.expenseDivider} />
          <View style={styles.expenseItem}>
            <Text style={[styles.expenseCategory, styles.totalText]}>Total Expenses</Text>
            <Text style={[styles.expenseAmount, styles.totalText]}>{formatCurrency(totalExpenses)}</Text>
          </View>
        </View>
      </View>

      {/* Net Profit */}
      <View style={[styles.profitCard, { backgroundColor: netProfit >= 0 ? '#D4EDDA' : '#F8D7DA' }]}>
        <View style={styles.profitHeader}>
          <Ionicons
            name={netProfit >= 0 ? 'trending-up' : 'trending-down'}
            size={24}
            color={netProfit >= 0 ? COLORS.green : COLORS.error}
          />
          <Text style={[styles.profitLabel, { color: netProfit >= 0 ? '#155724' : '#721C24' }]}>
            Net Profit
          </Text>
        </View>
        <Text style={[styles.profitAmount, { color: netProfit >= 0 ? '#155724' : '#721C24' }]}>
          {formatCurrency(netProfit)}
        </Text>
        <Text style={[styles.profitMargin, { color: netProfit >= 0 ? '#155724' : '#721C24' }]}>
          {((netProfit / totalRevenue) * 100).toFixed(1)}% margin
        </Text>
      </View>

      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton}>
        <Ionicons name="download" size={20} color="#fff" style={styles.exportIcon} />
        <Text style={styles.exportButtonText}>Export Financial Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: getSpacing(16),
  },
  revenueCard: {
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
  revenueLabel: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.orange,
    marginBottom: 4,
  },
  revenuePeriod: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 16,
  },
  revenueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  revenueStat: {
    flex: 1,
  },
  revenueStatLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
  },
  revenueStatValue: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.darkText,
  },
  trendUp: {
    color: COLORS.green,
  },
  section: {
    marginBottom: SPACING.section,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.subheading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: SPACING.itemGap,
  },
  branchRevenueItem: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    padding: SPACING.itemGap,
    marginBottom: SPACING.small,
  },
  branchRevenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.small,
  },
  rankText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.small,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: FONTS.sizes.body,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  branchAmount: {
    fontSize: 14,
    color: COLORS.orange,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.orange,
    borderRadius: 4,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: 16,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 30,
    backgroundColor: COLORS.orange,
    borderRadius: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    minHeight: 20,
  },
  chartValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  chartLabel: {
    fontSize: 11,
    color: COLORS.lightText,
    marginTop: 6,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatLabel: {
    fontSize: 11,
    color: COLORS.lightText,
  },
  chartStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 2,
  },
  paymentMethodsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  paymentAmount: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  paymentPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  expensesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(16),
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  expenseCategory: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  totalText: {
    fontWeight: 'bold',
  },
  profitCard: {
    borderRadius: 12,
    padding: getSpacing(16),
    marginBottom: getSpacing(20),
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  profitAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profitMargin: {
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: getSpacing(20),
  },
  exportIcon: {
    marginRight: 8,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
