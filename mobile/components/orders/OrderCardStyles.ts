import { StyleSheet } from 'react-native';

export const ORDER_CARD_COLORS = {
  white: '#FFFFFF',
  darkText: '#1A1A2E',
  secondary: '#8E8E93',
  lightBorder: '#E5E5EA',
  lightBackground: '#F8F9FA',
  danger: '#E74C3C',
  warning: '#FF6B35',
  preparing: '#FF9F43',
  primary: '#3498DB',
  success: '#2ECC71',
  highlight: '#FFF8E6',
};

export const orderCardStyles = StyleSheet.create({
  card: {
    backgroundColor: ORDER_CARD_COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  cardHighlight: {
    backgroundColor: ORDER_CARD_COLORS.highlight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontWeight: '700',
    color: ORDER_CARD_COLORS.darkText,
  },
  metaText: {
    fontSize: 12,
    color: ORDER_CARD_COLORS.secondary,
    marginTop: 2,
  },
  tableBadge: {
    backgroundColor: 'rgba(255,122,89,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  tableBadgeText: {
    color: '#FF7A59',
    fontWeight: '700',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: ORDER_CARD_COLORS.lightBackground,
  },
  itemImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: ORDER_CARD_COLORS.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
