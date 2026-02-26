import React from 'react';
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

interface Branch {
  id: string;
  name: string;
  manager: string;
  rating: number;
  revenue: string;
  orders: number;
  avgTime: string;
  status: 'active' | 'attention' | 'inactive';
}

interface BranchCardProps {
  branch: Branch;
  onPress?: (branchId: string) => void;
  onLongPress?: (branchId: string) => void;
}

const renderStars = (rating: number) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color={COLORS.orange} />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <Ionicons key={i} name="star-half" size={14} color={COLORS.orange} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={14} color={COLORS.orange} />
      );
    }
  }
  return stars;
};

const getStatusBadge = (status: Branch['status']) => {
  switch (status) {
    case 'active':
      return { text: 'Active', color: COLORS.green, bgColor: '#D4EDDA' };
    case 'attention':
      return { text: 'Attention!', color: COLORS.orange, bgColor: '#FFF3CD' };
    case 'inactive':
      return { text: 'Inactive', color: COLORS.red, bgColor: '#F8D7DA' };
    default:
      return { text: 'Active', color: COLORS.green, bgColor: '#D4EDDA' };
  }
};

const BranchCard: React.FC<BranchCardProps> = ({ branch, onPress, onLongPress }) => {
  const statusBadge = getStatusBadge(branch.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(branch.id)}
      onLongPress={() => onLongPress?.(branch.id)}
      activeOpacity={0.8}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.branchName}>{branch.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
          <Text style={[styles.statusText, { color: statusBadge.color }]}>
            {statusBadge.text}
          </Text>
        </View>
      </View>

      {/* Manager Row */}
      <View style={styles.managerRow}>
        <Ionicons name="person-outline" size={14} color={COLORS.lightText} />
        <Text style={styles.managerText}>Manager: {branch.manager}</Text>
      </View>

      {/* Rating Row */}
      <View style={styles.ratingRow}>
        <View style={styles.starsContainer}>{renderStars(branch.rating)}</View>
        <Text style={styles.ratingText}>({branch.rating})</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.revenueText}>{branch.revenue}</Text>
        <Text style={styles.divider}>|</Text>
        <Text style={styles.statText}>{branch.orders} Orders</Text>
        <Text style={styles.divider}>|</Text>
        <Text style={styles.statText}>{branch.avgTime}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface BranchCardsSectionProps {
  branches?: Branch[];
  onBranchPress?: (branchId: string) => void;
  onBranchLongPress?: (branchId: string) => void;
}

const defaultBranches: Branch[] = [
  {
    id: '1',
    name: 'Downtown Manhattan',
    manager: 'John Smith',
    rating: 4.8,
    revenue: '$5,230',
    orders: 120,
    avgTime: '24 mins',
    status: 'active',
  },
  {
    id: '2',
    name: 'Uptown',
    manager: 'Sarah Lee',
    rating: 4.2,
    revenue: '$3,890',
    orders: 95,
    avgTime: '28 mins',
    status: 'active',
  },
  {
    id: '3',
    name: 'East Side',
    manager: 'Mike Johnson',
    rating: 3.8,
    revenue: '$2,100',
    orders: 45,
    avgTime: '35 mins',
    status: 'attention',
  },
];

export const BranchCardsSection: React.FC<BranchCardsSectionProps> = ({
  branches = defaultBranches,
  onBranchPress,
  onBranchLongPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Branches Overview</Text>
      <View style={styles.cardsList}>
        {branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            onPress={onBranchPress}
            onLongPress={onBranchLongPress}
          />
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
  cardsList: {
    paddingHorizontal: SPACING.horizontal,
    gap: SPACING.itemGap,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  branchName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.bold,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  managerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
    marginLeft: SPACING.tiny,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: SPACING.tiny,
  },
  ratingText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: SPACING.small,
  },
  revenueText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: COLORS.orange,
  },
  divider: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginHorizontal: SPACING.small,
  },
  statText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.darkText,
  },
});

export default BranchCardsSection;
