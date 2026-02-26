import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

const { width } = Dimensions.get('window');

interface BranchPerformance {
  name: string;
  color: string;
  value: number;
}

interface BranchPerformanceSectionProps {
  branches?: BranchPerformance[];
  onViewAll?: () => void;
}

const defaultBranches: BranchPerformance[] = [
  { name: 'Downtown', color: COLORS.orange, value: 85 },
  { name: 'East Side', color: COLORS.green, value: 72 },
  { name: 'West End', color: COLORS.blue, value: 90 },
  { name: 'Uptown', color: COLORS.purple, value: 65 },
];

export const BranchPerformanceSection: React.FC<BranchPerformanceSectionProps> = ({
  branches = defaultBranches,
  onViewAll,
}) => {
  // Simple line chart using SVG-like approach with Views
  const chartHeight = 120;
  const maxValue = 100;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Branch Performance</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View 90%</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Area */}
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>100</Text>
          <Text style={styles.yLabel}>75</Text>
          <Text style={styles.yLabel}>50</Text>
          <Text style={styles.yLabel}>25</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>

        {/* Chart bars */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>

          {/* Bars */}
          <View style={styles.barsContainer}>
            {branches.map((branch, index) => {
              const barHeight = (branch.value / maxValue) * chartHeight;
              return (
                <View key={branch.name} style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: branch.color,
                      },
                    ]}
                  />
                  <Text style={styles.barValue}>{branch.value}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {branches.map((branch) => (
          <View key={branch.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: branch.color }]} />
            <Text style={styles.legendText}>{branch.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    marginBottom: SPACING.itemGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.itemGap,
  },
  title: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  viewAll: {
    fontSize: FONTS.sizes.small,
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  yLabel: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.lightText,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  gridLine: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 20,
  },
  barWrapper: {
    alignItems: 'center',
  },
  bar: {
    width: 30,
    borderRadius: 4,
    opacity: 0.8,
  },
  barValue: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.darkText,
    marginTop: 4,
    fontWeight: FONTS.weights.medium,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.small,
    gap: SPACING.card,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
  },
});

export default BranchPerformanceSection;
