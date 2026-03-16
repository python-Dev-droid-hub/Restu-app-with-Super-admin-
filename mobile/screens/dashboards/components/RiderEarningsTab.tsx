import React, { useMemo, useState } from 'react';
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
  const total = Number(earnings?.totalEarnings ?? todayEarnings ?? 0);
  const week = Number(earnings?.thisWeekEarnings ?? weekEarnings ?? 0);
  const month = Number(earnings?.thisMonthEarnings ?? 0);
  const lastMonth = Number(earnings?.lastMonthEarnings ?? 0);
  const breakdown: Array<any> = Array.isArray(earnings?.weeklyBreakdown) ? earnings.weeklyBreakdown : [];

  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { mainLabel, mainValue } = useMemo(() => {
    if (range === 'weekly') return { mainLabel: 'This Week', mainValue: week };
    if (range === 'monthly') return { mainLabel: 'This Month', mainValue: month };
    return { mainLabel: 'Today', mainValue: Number(todayEarnings || 0) };
  }, [month, range, todayEarnings, week]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>{mainLabel} Earnings</Text>
        <Text style={styles.earningsAmount}>{formatPrice(mainValue)}</Text>

        <View style={styles.rangeRow}>
          {([
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.rangeButton, range === item.key && styles.rangeButtonActive]}
              onPress={() => setRange(item.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.rangeButtonText, range === item.key && styles.rangeButtonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.earningsPeriod}>Total: {formatPrice(total)}</Text>
        
        {/* Weekly Breakdown (if available) */}
        <View style={styles.chartPlaceholder}>
          {breakdown.length > 0 ? (
            <View style={styles.chartBars}>
              {breakdown.slice(0, 7).map((d, index) => {
                const value = Number(d?.earnings || d?.total || d?.amount || 0);
                const max = Math.max(...breakdown.slice(0, 7).map((x: any) => Number(x?.earnings || x?.total || x?.amount || 0)), 1);
                const height = Math.max(6, Math.round((value / max) * 50));
                return (
                  <View key={index} style={styles.barContainer}>
                    <View style={[styles.bar, { height }]} />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noChart}>
              <Text style={styles.noChartText}>No breakdown available</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryValue}>{formatPrice(month)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Last Month</Text>
          <Text style={styles.summaryValue}>{formatPrice(lastMonth)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Completed Deliveries</Text>
          <Text style={styles.summaryValue}>{Number(totalDeliveries || 0)}</Text>
        </View>
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
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
    marginBottom: 8,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  rangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.lightBg,
  },
  rangeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  rangeButtonTextActive: {
    color: COLORS.white,
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
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  noChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
  },
  summaryValue: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
