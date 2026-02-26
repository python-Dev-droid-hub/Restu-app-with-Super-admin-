import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';

interface SummaryCard {
  id: string;
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}

const summaryCards: SummaryCard[] = [
  {
    id: 'total',
    value: '1,024',
    label: 'Total Orders',
    icon: 'receipt-outline',
    accentColor: COLORS.orange,
  },
  {
    id: 'completed',
    value: '32',
    label: 'Completed Orders',
    icon: 'checkmark-circle-outline',
    accentColor: COLORS.green,
  },
  {
    id: 'rate',
    value: '86%',
    label: 'Completed Rate',
    icon: 'pie-chart-outline',
    accentColor: COLORS.blue,
  },
  {
    id: 'revenue',
    value: '$5,420',
    label: 'Revenue Today',
    icon: 'cash-outline',
    accentColor: COLORS.green,
  },
];

export const TodaySummarySection: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      <View style={styles.cardsGrid}>
        {summaryCards.map((card) => (
          <View
            key={card.id}
            style={[
              styles.card,
              { borderLeftColor: card.accentColor },
            ]}
          >
            <Ionicons name={card.icon} size={28} color={card.accentColor} />
            <Text style={[styles.cardValue, { color: card.accentColor }]}>
              {card.value}
            </Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.section,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: SPACING.itemGap,
    paddingHorizontal: SPACING.horizontal,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.horizontal,
    gap: SPACING.small,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    width: '48%',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    marginTop: SPACING.small,
  },
  cardLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginTop: SPACING.tiny,
  },
});

export default TodaySummarySection;
