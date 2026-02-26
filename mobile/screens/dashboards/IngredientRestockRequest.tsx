import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

// DESIGN SYSTEM - Admin Dashboard Colors
const COLORS = {
  orange: '#FF6B35',
  green: '#2ECC71',
  purple: '#9B59B6',
  blue: '#3498DB',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  red: '#E74C3C',
  yellow: '#F39C12',
  gray: '#95A5A6',
  border: '#ECEFF1',
  lightRed: '#FADBD8',
  lightOrange: '#FEF5E7',
  lightBlue: '#EBF5FB',
  lightGreen: '#D5F4E6',
};

interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  category: string;
}

interface RestockRequest {
  id: string;
  items: { ingredientId: string; quantity: number; notes?: string; deliveredQty?: number; status?: string }[];
  priority: 'LOW' | 'NORMAL' | 'URGENT';
  urgencyReason?: string;
  generalNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'PARTIAL' | 'DELIVERED' | 'REJECTED';
  createdAt: string;
  managerNotes?: string;
}

interface IngredientRestockRequestProps {
  visible: boolean;
  onClose: () => void;
  onRequestSubmitted: (requestId: string) => void;
}

type Step = 1 | 2 | 3 | 4;

export default function IngredientRestockRequest({
  visible,
  onClose,
  onRequestSubmitted,
}: IngredientRestockRequestProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'URGENT'>('NORMAL');
  const [urgencyReason, setUrgencyReason] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
  const [sortBy, setSortBy] = useState<'lowest' | 'name'>('lowest');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [trackingRequest, setTrackingRequest] = useState<RestockRequest | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  // Load ingredients when modal opens
  useEffect(() => {
    if (visible && step === 1) {
      loadIngredients();
    }
  }, [visible, step]);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      // Load all ingredients from inventory
      const response = await api.get('/inventory');
      if (response.success && response.data) {
        const items = response.data.items || [];
        // Map to Ingredient interface
        const mappedIngredients: Ingredient[] = items.map((item: any) => ({
          id: item.id,
          name: item.name || item.product_name || 'Unknown',
          currentStock: item.quantity_available || item.currentStock || 0,
          reorderLevel: item.reorder_level || item.reorderLevel || 0,
          unit: item.unit || 'kg',
          category: item.category || 'General',
        }));
        setIngredients(mappedIngredients);
        
        // Pre-select low stock items
        const lowStockIds = mappedIngredients
          .filter((i: Ingredient) => i.currentStock <= i.reorderLevel)
          .map((i: Ingredient) => i.id);
        setSelectedItems(lowStockIds);
        
        // Set default quantities
        const defaultQtys: Record<string, number> = {};
        mappedIngredients.forEach((i: Ingredient) => {
          defaultQtys[i.id] = Math.max(0, i.reorderLevel - i.currentStock);
        });
        setQuantities(defaultQtys);
      } else {
        setIngredients([]);
      }
    } catch (error) {
      console.log('Error loading ingredients:', error);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllLowStock = () => {
    if (ingredients.length === 0) {
      Alert.alert('No ingredients', 'Please wait for ingredients to load.');
      return;
    }
    
    const lowStockItems = ingredients.filter(i => i.currentStock < i.reorderLevel);
    
    if (lowStockItems.length === 0) {
      Alert.alert('No low stock items', 'All items are currently at adequate stock levels.');
      return;
    }
    
    const lowStockIds = lowStockItems.map(i => i.id);
    setSelectedItems(lowStockIds);
    
    // Set default quantities for all low stock items
    const newQuantities: Record<string, number> = { ...quantities };
    lowStockItems.forEach(i => {
      newQuantities[i.id] = Math.max(0, i.reorderLevel - i.currentStock);
    });
    setQuantities(newQuantities);
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const updateQuantity = (id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const updateItemNotes = (id: string, notes: string) => {
    setItemNotes(prev => ({ ...prev, [id]: notes }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i !== id));
  };

  const getStockStatusColor = (current: number, reorder: number) => {
    const ratio = current / reorder;
    if (ratio < 0.5) return COLORS.red;
    if (ratio < 0.75) return COLORS.yellow;
    return COLORS.green;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Meat': '#FF6B6B',
      'Vegetables': '#4ECDC4',
      'Oils': '#FFD93D',
      'Spices': '#95A5A6',
      'Grains': '#E67E22',
      'Dairy': '#3498DB',
      'Bakery': '#F39C12',
      'Custom': '#9B59B6',
      'General': '#BDC3C7',
    };
    return colors[category] || '#BDC3C7';
  };

  const filteredIngredients = ingredients
    .filter(i => {
      // Apply search filter
      const matchesSearch = i.name?.toLowerCase().includes(searchQuery.toLowerCase());
      // Apply status filter
      if (filter === 'LOW') return matchesSearch && i.currentStock <= i.reorderLevel;
      if (filter === 'OK') return matchesSearch && i.currentStock > i.reorderLevel;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'lowest') {
        return (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel);
      }
      return a.name?.localeCompare(b.name) || 0;
    });

  const selectedIngredients = ingredients.filter(i => selectedItems.includes(i.id));

  const submitRequest = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item');
      return;
    }
    if (priority === 'URGENT' && !urgencyReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for urgent priority');
      return;
    }

    setSubmitting(true);
    try {
      const items = selectedItems.map(id => ({
        ingredientId: id,
        quantity: quantities[id] || 0,
        notes: itemNotes[id] || '',
      }));

      const response = await api.post('/ingredient-restock/request', {
        items,
        priority,
        urgencyReason: priority === 'URGENT' ? urgencyReason : undefined,
        generalNotes,
      });

      if (response.success && response.data) {
        setRequestId(response.data.request_id);
        setStep(4);
        onRequestSubmitted(response.data.request_id);
      } else {
        Alert.alert('Error', 'Failed to submit request');
      }
    } catch (error) {
      console.log('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedItems([]);
    setQuantities({});
    setItemNotes({});
    setPriority('NORMAL');
    setUrgencyReason('');
    setGeneralNotes('');
    setSearchQuery('');
    setRequestId('');
    setShowTracking(false);
    setTrackingRequest(null);
    onClose();
  };

  const viewTracking = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await api.get(`/ingredient-restock/requests/${requestId}`);
      if (response.success && response.data) {
        setTrackingRequest(response.data);
        setShowTracking(true);
      }
    } catch (error) {
      console.log('Error loading tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select Ingredients
  const renderStep1 = () => {
    const lowStockCount = ingredients.filter(i => i.currentStock <= i.reorderLevel).length;
    const okStockCount = ingredients.filter(i => i.currentStock > i.reorderLevel).length;
    
    return (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Request Ingredient Restock</Text>
          <Text style={styles.modalSubtitle}>Select ingredients you need</Text>
        </View>
        <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['ALL', 'LOW', 'OK'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab === 'ALL' ? `All (${ingredients.length})` : 
               tab === 'LOW' ? `Low Stock (${lowStockCount})` : 
               `OK (${okStockCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity
          style={styles.sortDropdown}
          onPress={() => setSortBy(sortBy === 'lowest' ? 'name' : 'lowest')}
        >
          <Text style={styles.sortText}>{sortBy === 'lowest' ? 'Lowest First' : 'Name'}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <TouchableOpacity style={styles.addAllBtn} onPress={selectAllLowStock}>
        <Ionicons name="flash" size={18} color={COLORS.white} />
        <Text style={styles.addAllBtnText}>Add All Low Stock</Text>
      </TouchableOpacity>

      {selectedItems.length > 0 && (
        <TouchableOpacity onPress={clearSelection} style={styles.clearLink}>
          <Text style={styles.clearLinkText}>Clear Selection</Text>
        </TouchableOpacity>
      )}

      {/* Ingredients List */}
      <ScrollView style={styles.ingredientsList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.orange} style={styles.loader} />
        ) : filteredIngredients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No ingredients found</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try a different search term' 
                : filter === 'LOW' 
                  ? 'No low stock items - all ingredients are well stocked!' 
                  : 'No ingredients configured yet. Please setup ingredients first.'}
            </Text>
          </View>
        ) : (
          filteredIngredients.map(item => {
            const isSelected = selectedItems.includes(item.id);
            const stockColor = getStockStatusColor(item.currentStock, item.reorderLevel);
            const isLowStock = item.currentStock <= item.reorderLevel;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.ingredientCard,
                  isSelected && styles.ingredientCardSelected,
                  isLowStock && !isSelected && styles.ingredientCardLowStock,
                ]}
                onPress={() => toggleItemSelection(item.id)}
              >
                <View style={styles.checkbox}>
                  {isSelected && (
                    <View style={styles.checkboxChecked}>
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    </View>
                  )}
                </View>
                <View style={styles.ingredientInfo}>
                  <View style={styles.ingredientNameRow}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category) }]}>
                      <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={[styles.stockText, { color: stockColor }]}

>
                      Current: {item.currentStock} {item.unit}
                    </Text>
                    <Text style={styles.reorderText}>
                      Reorder: {item.reorderLevel} {item.unit}
                    </Text>
                  </View>
                  {isLowStock && (
                    <View style={styles.deficitRow}>
                      <Ionicons name="alert-circle" size={14} color={COLORS.red} />
                      <Text style={styles.deficitText}>
                        Deficit: {Math.max(0, item.reorderLevel - item.currentStock)} {item.unit}
                      </Text>
                    </View>
                  )}
                  {isLowStock && (
                    <View style={styles.lowStockBadge}>
                      <Text style={styles.lowStockText}>LOW STOCK</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Text style={styles.selectedCount}>
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
        </Text>
        <TouchableOpacity
          style={[styles.continueBtn, selectedItems.length === 0 && styles.continueBtnDisabled]}
          disabled={selectedItems.length === 0}
          onPress={() => setStep(2)}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={resetAndClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

  // Step 2: Add Quantities & Priority
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.darkText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.modalTitle}>Restock Details</Text>
          <Text style={styles.stepIndicator}>Step 2 of 3</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Items */}
        <Text style={styles.sectionTitle}>Items Selected ({selectedIngredients.length})</Text>
        {selectedIngredients.map(item => (
          <View key={item.id} style={styles.itemDetailCard}>
            <View style={styles.itemDetailHeader}>
              <Text style={styles.itemDetailName}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                <Ionicons name="trash" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemDetailStock}>
              Current: {item.currentStock} {item.unit} ({getStockStatusColor(item.currentStock, item.reorderLevel) === COLORS.red ? 'RED' : getStockStatusColor(item.currentStock, item.reorderLevel) === COLORS.yellow ? 'YELLOW' : 'GREEN'})
            </Text>
            <Text style={styles.itemDetailReorder}>
              Reorder level: {item.reorderLevel} {item.unit}
            </Text>

            <View style={styles.dividerLight} />

            {/* Quantity Input */}
            <Text style={styles.inputLabel}>Quantity needed</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => updateQuantity(item.id, (quantities[item.id] || 0) - 1)}
              >
                <Ionicons name="remove" size={20} color={COLORS.darkText} />
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={String(quantities[item.id] || 0)}
                onChangeText={(text) => updateQuantity(item.id, parseInt(text) || 0)}
              />
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => updateQuantity(item.id, (quantities[item.id] || 0) + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.darkText} />
              </TouchableOpacity>
              <Text style={styles.unitText}>{item.unit}</Text>
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Any special requests?"
              value={itemNotes[item.id] || ''}
              onChangeText={(text) => updateItemNotes(item.id, text)}
              maxLength={200}
            />
            <Text style={styles.charCount}>{(itemNotes[item.id] || '').length}/200</Text>
          </View>
        ))}

        {/* Priority Section */}
        <Text style={styles.sectionTitle}>Priority Level</Text>
        <View style={styles.priorityContainer}>
          {[
            { key: 'LOW', label: 'LOW', desc: 'Not urgent, can wait', color: COLORS.green },
            { key: 'NORMAL', label: 'NORMAL', desc: 'Standard restock', color: COLORS.orange },
            { key: 'URGENT', label: 'URGENT', desc: 'Need ASAP (same day)', color: COLORS.red },
          ].map((opt: any) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.priorityOption,
                priority === opt.key && { borderColor: opt.color, backgroundColor: opt.key === 'URGENT' ? COLORS.lightRed : COLORS.white },
              ]}
              onPress={() => setPriority(opt.key)}
            >
              <View style={styles.priorityRadio}>
                {priority === opt.key && <View style={[styles.priorityRadioSelected, { backgroundColor: opt.color }]} />}
              </View>
              <View style={styles.priorityTextContainer}>
                <Text style={[styles.priorityLabel, { color: priority === opt.key ? opt.color : COLORS.darkText }]}>
                  {opt.label}
                </Text>
                <Text style={styles.priorityDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgency Reason */}
        {priority === 'URGENT' && (
          <>
            <Text style={styles.inputLabel}>Why is this urgent? *</Text>
            <TextInput
              style={styles.urgencyInput}
              multiline
              placeholder="e.g., Running out for lunch rush"
              value={urgencyReason}
              onChangeText={setUrgencyReason}
            />
          </>
        )}

        {/* Additional Notes */}
        <Text style={styles.sectionTitle}>Additional Notes (optional)</Text>
        <TextInput
          style={styles.generalNotesInput}
          multiline
          placeholder="Any special requests or requirements?"
          value={generalNotes}
          onChangeText={setGeneralNotes}
          maxLength={500}
        />
        <Text style={styles.charCount}>{generalNotes.length}/500</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Total items: {selectedItems.length}</Text>
          <Text style={styles.summarySubtext}>
            {selectedIngredients.map(i => `${i.name} (${quantities[i.id] || 0}${i.unit})`).join(', ')}
          </Text>
          <Text style={[styles.summaryPriority, { color: priority === 'URGENT' ? COLORS.red : priority === 'NORMAL' ? COLORS.orange : COLORS.green }]}>
            Priority: {priority}
          </Text>
          {priority === 'URGENT' && <Ionicons name="warning" size={20} color={COLORS.red} style={styles.warningIcon} />}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backActionBtn} onPress={() => setStep(1)}>
            <Text style={styles.backActionBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueActionBtn, priority === 'URGENT' && !urgencyReason.trim() && styles.continueBtnDisabled]}
            disabled={priority === 'URGENT' && !urgencyReason.trim()}
            onPress={() => setStep(3)}
          >
            <Text style={styles.continueActionBtnText}>Continue to Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Step 3: Confirm & Submit
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.darkText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.modalTitle}>Confirm Restock Request</Text>
          <Text style={styles.stepIndicator}>Review before submitting</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Review Items */}
        <View style={styles.reviewCard}>
          {selectedIngredients.map((item, index) => (
            <View key={item.id}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemNumber}>Item {index + 1}: {item.name}</Text>
                <Text style={styles.reviewQuantity}>Quantity: {quantities[item.id] || 0} {item.unit}</Text>
                {itemNotes[item.id] ? (
                  <Text style={styles.reviewNotes}>Notes: {itemNotes[item.id]}</Text>
                ) : (
                  <Text style={styles.reviewNotesEmpty}>(no notes)</Text>
                )}
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                  <Text style={styles.readyText}>Ready to submit</Text>
                </View>
              </View>
              {index < selectedIngredients.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        {/* Request Details */}
        <View style={styles.detailsCard}>
          <Text style={[styles.detailsPriority, { color: priority === 'URGENT' ? COLORS.red : priority === 'NORMAL' ? COLORS.orange : COLORS.green }]}>
            Priority: {priority}
          </Text>
          {priority === 'URGENT' && (
            <Text style={styles.detailsReason}>Reason: {urgencyReason}</Text>
          )}
          {generalNotes && <Text style={styles.detailsGeneral}>Additional notes: {generalNotes}</Text>}
          <Ionicons name="alert-circle" size={24} color={COLORS.orange} style={styles.detailsIcon} />
        </View>

        {/* Ready to Submit */}
        <View style={styles.readyCard}>
          <View style={styles.readyIconContainer}>
            <Ionicons name="checkmark-circle" size={40} color={COLORS.green} />
          </View>
          <Text style={styles.readyTitle}>Ready to submit</Text>
          <Text style={styles.readySubtitle}>Your request will be sent to the kitchen manager</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backActionBtn} onPress={() => setStep(2)}>
            <Text style={styles.backActionBtnText}>← Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            disabled={submitting}
            onPress={submitRequest}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Step 4: Success/Confirmation
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIconBg}>
            <Ionicons name="checkmark" size={60} color={COLORS.green} />
          </View>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Your restock request has been sent to the kitchen manager
          </Text>
        </View>

        {/* Request Summary */}
        <View style={styles.confirmCard}>
          <Text style={styles.confirmLabel}>Request ID:</Text>
          <Text style={styles.confirmId}>{requestId}</Text>

          <Text style={styles.confirmLabel}>Items Requested:</Text>
          {selectedIngredients.map(item => (
            <Text key={item.id} style={styles.confirmItem}>
              • {item.name} - {quantities[item.id] || 0} {item.unit}
            </Text>
          ))}

          <Text style={styles.confirmLabel}>Priority:</Text>
          <Text style={[styles.confirmValue, { color: priority === 'URGENT' ? COLORS.red : priority === 'NORMAL' ? COLORS.orange : COLORS.green }]}>
            {priority}
          </Text>

          <Text style={styles.confirmLabel}>Status:</Text>
          <Text style={[styles.confirmValue, { color: COLORS.purple }]}>PENDING</Text>

          <Text style={styles.confirmLabel}>Submitted:</Text>
          <Text style={styles.confirmValue}>{new Date().toLocaleString()}</Text>

          <View style={styles.notifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
            <Text style={styles.notifiedText}>Manager Notified</Text>
          </View>
        </View>

        {/* Info Message */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.blue} />
          <Text style={styles.infoText}>
            The kitchen manager typically responds within 30 minutes
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.trackBtn} onPress={viewTracking}>
          <Text style={styles.trackBtnText}>Track Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={resetAndClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tracking Screen
  const renderTracking = () => {
    if (!trackingRequest) return null;

    const statusSteps = [
      { key: 'SUBMITTED', label: 'Submitted', time: trackingRequest.createdAt },
      { key: 'APPROVED', label: 'Approved', time: trackingRequest.status !== 'PENDING' ? 'Waiting...' : null },
      { key: 'DELIVERED', label: 'Delivered', time: trackingRequest.status === 'DELIVERED' ? 'Completed' : null },
    ];

    return (
      <View style={styles.stepContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTracking(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={COLORS.darkText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.modalTitle}>Track Request</Text>
            <Text style={styles.stepIndicator}>{trackingRequest.id}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Timeline */}
          <View style={styles.timelineCard}>
            <View style={styles.timeline}>
              {statusSteps.map((step, index) => (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    index === 0 && styles.timelineDotCompleted,
                    index > 0 && trackingRequest.status !== 'PENDING' && styles.timelineDotCompleted,
                  ]}>
                    {index === 0 && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      index > 0 && trackingRequest.status === 'PENDING' && styles.timelineLabelPending,
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={styles.timelineTime}>{step.time || 'Not yet'}</Text>
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      index === 0 && trackingRequest.status !== 'PENDING' && styles.timelineLineCompleted,
                    ]} />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Items Breakdown */}
          <Text style={styles.sectionTitle}>Items Status</Text>
          {trackingRequest.items.map((item: any, index: number) => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            const statusColors: any = {
              PENDING: COLORS.blue,
              APPROVED: COLORS.green,
              PARTIAL: COLORS.yellow,
              DELIVERED: COLORS.green,
              REJECTED: COLORS.red,
            };
            const statusColor = statusColors[item.status] || COLORS.gray;

            return (
              <View key={index} style={[styles.trackingItemCard, { borderLeftColor: statusColor }]}>
                <Text style={styles.trackingItemName}>
                  {ingredient?.name || item.ingredientId} - {item.quantity} {ingredient?.unit}
                </Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusLabel, { color: statusColor }]}>
                    Status: {item.status}
                  </Text>
                </View>
                <Text style={styles.trackingDetails}>Requested: {item.quantity}</Text>
                {item.deliveredQty !== undefined && (
                  <Text style={styles.trackingDetails}>Delivered: {item.deliveredQty}</Text>
                )}
              </View>
            );
          })}

          {/* Manager Notes */}
          {trackingRequest.managerNotes && (
            <>
              <Text style={styles.sectionTitle}>Manager Notes</Text>
              <View style={styles.managerNotesCard}>
                <Text style={styles.managerNotesText}>{trackingRequest.managerNotes}</Text>
              </View>
            </>
          )}

          {/* Cancel Button */}
          {trackingRequest.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={() => {
                Alert.alert(
                  'Cancel Request?',
                  'Are you sure? You can submit a new request later.',
                  [
                    { text: 'No, Keep it', style: 'cancel' },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.patch(`/ingredient-restock/requests/${trackingRequest.id}/cancel`);
                          showToast('Request cancelled', 'success');
                          setShowTracking(false);
                          resetAndClose();
                        } catch (error) {
                          showToast('Failed to cancel', 'error');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {showTracking ? renderTracking() : (
            <>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  keyboardView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Header Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  stepIndicator: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginHorizontal: 16,
  },

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.darkText,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginRight: 8,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  sortText: {
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },

  // Quick Actions
  addAllBtn: {
    backgroundColor: COLORS.orange,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  addAllBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  clearLink: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  clearLinkText: {
    color: COLORS.blue,
    fontSize: 14,
  },

  // Ingredients List
  ingredientsList: {
    flex: 1,
    marginHorizontal: 16,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  ingredientCardSelected: {
    backgroundColor: COLORS.lightOrange,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  ingredientCardLowStock: {
    backgroundColor: COLORS.lightRed,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  stockRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  reorderText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  lowStockBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  lowStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  // Bottom Actions
  bottomActions: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 12,
  },
  selectedCount: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  continueBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: COLORS.lightBg,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: COLORS.darkText,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  backActionBtn: {
    backgroundColor: COLORS.lightBg,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 0.3,
  },
  backActionBtnText: {
    color: COLORS.darkText,
    fontSize: 14,
  },
  continueActionBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 0.7,
  },
  continueActionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 0.7,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Step 2 Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginTop: 20,
    marginBottom: 12,
  },
  itemDetailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetailName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
  },
  removeBtn: {
    backgroundColor: COLORS.red,
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetailStock: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  itemDetailReorder: {
    fontSize: 12,
    color: COLORS.gray,
  },
  dividerLight: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.lightBg,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 8,
    color: COLORS.darkText,
  },
  unitText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 8,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    color: COLORS.darkText,
  },
  urgencyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 8,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 16,
  },
  generalNotesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: COLORS.darkText,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: 4,
  },

  // Priority Styles
  priorityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  priorityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityTextContainer: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  priorityDesc: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.lightOrange,
    borderWidth: 2,
    borderColor: COLORS.orange,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  summarySubtext: {
    fontSize: 12,
    color: COLORS.darkText,
    marginTop: 4,
  },
  summaryPriority: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  warningIcon: {
    marginTop: 4,
  },

  // Step 3 Styles
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 12,
  },
  reviewItem: {
    paddingVertical: 8,
  },
  reviewItemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  reviewQuantity: {
    fontSize: 14,
    color: COLORS.orange,
    marginTop: 2,
  },
  reviewNotes: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  reviewNotesEmpty: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 2,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  readyText: {
    fontSize: 12,
    color: COLORS.green,
    marginLeft: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  detailsCard: {
    backgroundColor: COLORS.lightOrange,
    borderWidth: 2,
    borderColor: COLORS.orange,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  detailsPriority: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsReason: {
    fontSize: 12,
    color: COLORS.darkText,
    marginTop: 4,
  },
  detailsGeneral: {
    fontSize: 12,
    color: COLORS.darkText,
    marginTop: 4,
  },
  detailsIcon: {
    marginTop: 8,
  },
  readyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  readyIconContainer: {
    marginBottom: 12,
  },
  readyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  readySubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Step 4 Styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
    marginTop: 12,
  },
  confirmId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  confirmItem: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: 8,
    marginTop: 4,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notifiedText: {
    fontSize: 14,
    color: COLORS.green,
    marginLeft: 8,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBlue,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.blue,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.darkText,
    marginLeft: 8,
    flex: 1,
  },
  trackBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  trackBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: COLORS.lightBg,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: COLORS.darkText,
    fontSize: 14,
  },

  // Tracking Styles
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.green,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: COLORS.gray,
    zIndex: -1,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.orange,
  },
  timelineContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  timelineLabelPending: {
    color: COLORS.gray,
  },
  timelineTime: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  trackingItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  trackingItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackingDetails: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  managerNotesCard: {
    backgroundColor: COLORS.lightBg,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
    marginBottom: 12,
  },
  managerNotesText: {
    fontSize: 13,
    color: COLORS.darkText,
  },
  cancelRequestBtn: {
    backgroundColor: COLORS.red,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelRequestBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Common
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
  },
  loader: {
    marginTop: 40,
  },
  bottomSpacer: {
    height: 100,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.orange,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },

  // Empty State
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 12,
  },

  // Ingredient Card
  ingredientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Deficit
  deficitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deficitText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.red,
  },
});

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  // This is a placeholder - in the actual implementation, this would use the parent's showToast
  console.log(`Toast: ${message} (${type})`);
}
