import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../../context/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

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

interface RiderEarningsScreenProps {
  todayEarnings?: number;
  weekEarnings?: number;
  monthEarnings?: number;
  totalDeliveries?: number;
  earnings?: any;
}

type TimeRange = 'day' | 'week' | 'month';

const EARNINGS_DATA = {
  day: { amount: 125.50, deliveries: 12, breakdown: { base: 100, tips: 15, bonuses: 10.50 } },
  week: { amount: 890.00, deliveries: 78, breakdown: { base: 750, tips: 90, bonuses: 50 } },
  month: { amount: 3540.00, deliveries: 325, breakdown: { base: 3000, tips: 360, bonuses: 180 } },
};

const PERFORMANCE_STATS = [
  { label: 'Avg. Earning/Delivery', value: '$11.42', icon: 'cash-outline', color: COLORS.primary },
  { label: 'Completion Rate', value: '98.5%', icon: 'checkmark-circle', color: COLORS.success },
  { label: 'Avg. Rating', value: '4.8 ⭐', icon: 'star', color: COLORS.warning },
];

const RiderEarningsScreen: React.FC<RiderEarningsScreenProps> = ({
  todayEarnings = 0,
  weekEarnings = 0,
  monthEarnings = 0,
  totalDeliveries = 0,
  earnings,
}) => {
  const { formatPrice } = useSettings();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const currentData = EARNINGS_DATA[timeRange];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.headerTitle}>Your Earnings</Text>

      {/* Total Earnings Card */}
      <View style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Ionicons name="trending-up" size={20} color={COLORS.white} />
        </View>
        <Text style={styles.earningsAmount}>
          {formatPrice ? formatPrice(currentData.amount) : `$${currentData.amount.toFixed(2)}`}
        </Text>
        <Text style={styles.earningsSubtitle}>
          {currentData.deliveries} deliveries
        </Text>
      </View>

      {/* Time Range Buttons */}
      <View style={styles.timeRangeContainer}>
        {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setTimeRange(range)}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.activeTimeRange,
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === range && styles.activeTimeRangeText,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Breakdown</Text>
        <View style={styles.breakdownList}>
          {[
            { label: 'Base Earnings', amount: currentData.breakdown.base, color: COLORS.primary },
            { label: 'Tips', amount: currentData.breakdown.tips, color: COLORS.success },
            { label: 'Bonuses', amount: currentData.breakdown.bonuses, color: COLORS.warning },
          ].map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text style={styles.breakdownLabel}>{item.label}</Text>
              </View>
              <Text style={[styles.breakdownAmount, { color: item.color }]}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.performanceCard}>
        <Text style={styles.performanceTitle}>Performance</Text>
        <View style={styles.performanceList}>
          {PERFORMANCE_STATS.map((stat, index) => (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceLeft}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={styles.performanceLabel}>{stat.label}</Text>
              </View>
              <Text style={[styles.performanceValue, { color: stat.color }]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.quickStatsRow}>
        <View style={styles.quickStatCard}>
          <Ionicons name="time" size={24} color={COLORS.info} />
          <Text style={styles.quickStatValue}>4.2h</Text>
          <Text style={styles.quickStatLabel}>Online Today</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Ionicons name="navigate" size={24} color={COLORS.primary} />
          <Text style={styles.quickStatValue}>32km</Text>
          <Text style={styles.quickStatLabel}>Distance</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Ionicons name="flash" size={24} color={COLORS.warning} />
          <Text style={styles.quickStatValue}>98%</Text>
          <Text style={styles.quickStatLabel}>Acceptance</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  content: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  earningsSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  activeTimeRange: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  activeTimeRangeText: {
    color: COLORS.white,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 16,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBg,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  performanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 16,
  },
  performanceList: {
    gap: 16,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
});

export default RiderEarningsScreen;
