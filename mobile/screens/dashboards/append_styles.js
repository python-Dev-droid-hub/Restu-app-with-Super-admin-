const fs = require('fs');

const cookingStyles = `
const cookingStyles = StyleSheet.create({
  typeTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  typeTabActive: {
    backgroundColor: '#3498DB',
  },
  typeTabActiveOrange: {
    backgroundColor: '#FF6B35',
  },
  typeTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  typeTabTextActive: {
    color: '#fff',
  },
  typeTabBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  typeTabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  typeTabIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
  filterTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  filterTabTextActive: {
    color: DESIGN.colors.darkText,
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
  },
  orderCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dineInCard: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  deliveryCard: {
    borderColor: '#FF6B35',
    backgroundColor: '#FEF5E7',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dineInBadge: {
    backgroundColor: '#3498DB',
  },
  deliveryBadge: {
    backgroundColor: '#FF6B35',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  orderBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderMeta: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  tableTimeText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  urgentBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  itemPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  specialBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  specialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F39C12',
    marginBottom: 4,
  },
  specialText: {
    fontSize: 13,
    color: DESIGN.colors.darkText,
    fontStyle: 'italic',
  },
  packingBox: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  packingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 6,
  },
  packingList: {
    gap: 2,
  },
  packingItem: {
    fontSize: 12,
    color: DESIGN.colors.darkText,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  locationText: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  readyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  dineInReadyBtn: {
    backgroundColor: '#2BC48A',
  },
  deliveryReadyBtn: {
    backgroundColor: '#2BC48A',
  },
  readyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2BC48A20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  readyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2BC48A',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: DESIGN.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2BC48A',
    borderColor: '#2BC48A',
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.darkText,
    flex: 1,
  },
  checklistWarning: {
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#2BC48A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: DESIGN.colors.border,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
});
`;

const mainFile = 'c:\\Projects\\restaurant-app-saas\\mobile\\screens\\dashboards\\ChefDashboard.tsx';
const content = fs.readFileSync(mainFile, 'utf8');
fs.writeFileSync(mainFile, content + cookingStyles);
console.log('cookingStyles appended successfully');
