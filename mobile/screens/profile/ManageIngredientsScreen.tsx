import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { COLORS } from '../../constants/colors';

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
    cardBg: '#FFFFFF',
    yellow: '#FFC107',
  },
} as const;

// Preset products to select from
const PRESET_PRODUCTS = [
  { id: 'chicken', name: 'Chicken', unit: 'kg', category: 'Meat' },
  { id: 'beef', name: 'Beef', unit: 'kg', category: 'Meat' },
  { id: 'pork', name: 'Pork', unit: 'kg', category: 'Meat' },
  { id: 'fish', name: 'Fish', unit: 'kg', category: 'Meat' },
  { id: 'tomatoes', name: 'Tomatoes', unit: 'kg', category: 'Vegetables' },
  { id: 'lettuce', name: 'Lettuce', unit: 'kg', category: 'Vegetables' },
  { id: 'onions', name: 'Onions', unit: 'kg', category: 'Vegetables' },
  { id: 'garlic', name: 'Garlic', unit: 'kg', category: 'Vegetables' },
  { id: 'olive_oil', name: 'Olive Oil', unit: 'L', category: 'Oils' },
  { id: 'vegetable_oil', name: 'Vegetable Oil', unit: 'L', category: 'Oils' },
  { id: 'salt', name: 'Salt', unit: 'kg', category: 'Spices' },
  { id: 'pepper', name: 'Pepper', unit: 'kg', category: 'Spices' },
  { id: 'flour', name: 'Flour', unit: 'kg', category: 'Grains' },
  { id: 'sugar', name: 'Sugar', unit: 'kg', category: 'Grains' },
  { id: 'butter', name: 'Butter', unit: 'kg', category: 'Dairy' },
  { id: 'eggs', name: 'Eggs', unit: 'pieces', category: 'Dairy' },
  { id: 'milk', name: 'Milk', unit: 'L', category: 'Dairy' },
  { id: 'cheese', name: 'Cheese', unit: 'kg', category: 'Dairy' },
  { id: 'bread', name: 'Bread', unit: 'pieces', category: 'Bakery' },
  { id: 'rice', name: 'Rice', unit: 'kg', category: 'Grains' },
  { id: 'pasta', name: 'Pasta', unit: 'kg', category: 'Grains' },
];

const UNITS = ['kg', 'L', 'pieces', 'g', 'ml', 'oz', 'lb'];

interface Ingredient {
  id: string;
  product_id: string;
  name: string;
  quantity_available: number;
  reorder_level: number;
  unit: string;
  category?: string;
  updated_at?: string;
}

interface ManageIngredientsScreenProps {
  onBack: () => void;
  branchId?: string;
}

export default function ManageIngredientsScreen({ onBack, branchId }: ManageIngredientsScreenProps) {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lowest' | 'alphabetical'>('lowest');
  
  // Add modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('kg');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Edit modal states
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState('');
  const [editReorder, setEditReorder] = useState('');

  const loadIngredients = useCallback(async () => {
    try {
      // Get branch from AsyncStorage for filtering
      let branch = branchId;
      if (!branch) {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          branch = userData.assigned_branch_id || userData.branchId;
        }
      }

      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      
      const response = await api.get(`/inventory?${params.toString()}`);
      if (response.success && response.data) {
        const mappedIngredients = response.data.items?.map((item: any) => ({
          id: item._id || item.id,
          product_id: item.product?._id || item.product || item.product_id,
          name: item.product?.name || item.product_name || 'Unknown',
          quantity_available: item.quantityAvailable || item.quantity_available || 0,
          reorder_level: item.reorderLevel || item.reorder_level || 0,
          unit: item.unit || 'kg',
          category: item.category || 'General',
          updated_at: item.updatedAt || item.updated_at,
        })) || [];
        setIngredients(mappedIngredients);
      } else {
        setIngredients([]);
      }
    } catch (error) {
      console.log('Error loading ingredients:', error);
      setIngredients([]);
    }
  }, [branchId]);

  useEffect(() => {
    loadIngredients().then(() => setLoading(false));
  }, [loadIngredients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIngredients();
    setRefreshing(false);
  };

  const getFilteredAndSortedIngredients = () => {
    let filtered = ingredients;
    
    // Apply filter
    if (filter === 'LOW') {
      filtered = ingredients.filter(i => i.quantity_available <= i.reorder_level);
    } else if (filter === 'OK') {
      filtered = ingredients.filter(i => i.quantity_available > i.reorder_level);
    }
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(i => 
        i.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sort
    if (sortBy === 'lowest') {
      filtered = [...filtered].sort((a, b) => {
        const aRatio = a.quantity_available / (a.reorder_level || 1);
        const bRatio = b.quantity_available / (b.reorder_level || 1);
        return aRatio - bRatio;
      });
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  };

  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.quantity_available <= ingredient.reorder_level) {
      return { status: 'LOW', color: DESIGN.colors.red, bg: '#FFEBEE' };
    } else if (ingredient.quantity_available <= ingredient.reorder_level * 1.5) {
      return { status: 'APPROACHING', color: DESIGN.colors.yellow, bg: '#FFF8E1' };
    }
    return { status: 'OK', color: DESIGN.colors.green, bg: '#E8F5E9' };
  };

  const handleAddIngredient = async () => {
    const stock = parseFloat(currentStock);
    const reorder = parseFloat(reorderLevel);
    
    if (!selectedProduct && !isCustomProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }
    if (isCustomProduct && !customName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      Alert.alert('Error', 'Current stock must be 0 or greater');
      return;
    }
    if (isNaN(reorder) || reorder <= 0) {
      Alert.alert('Error', 'Reorder level must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      // Get branch from AsyncStorage if available - but it's optional for now
      let branch = branchId;
      if (!branch) {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          branch = userData.assigned_branch_id || 
                   userData.branchId || 
                   userData.branch_id ||
                   userData.branch ||
                   null;
        }
      }
      // Branch is now optional - use null if not found

      const product = isCustomProduct 
        ? { id: `custom_${Date.now()}`, name: customName, unit: selectedUnit, category: 'Custom' }
        : PRESET_PRODUCTS.find(p => p.id === selectedProduct);
      
      const payload = {
        branch: branch,
        product: product?.id || `custom_${Date.now()}`,
        quantityAvailable: stock,
        reorderLevel: reorder,
        category: isCustomProduct ? 'Custom' : product?.category || 'General',
      };

      const response = await api.post('/inventory', payload);
      
      if (response.success) {
        Alert.alert('Success', 'Ingredient added successfully!');
        setShowAddModal(false);
        resetAddForm();
        loadIngredients();
      } else {
        Alert.alert('Error', response.message || 'Failed to add ingredient');
      }
    } catch (error: any) {
      console.log('Error adding ingredient:', error);
      Alert.alert('Error', error?.message || 'Failed to add ingredient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditIngredient = async () => {
    if (!editingIngredient) return;
    
    const stock = parseFloat(editStock);
    const reorder = parseFloat(editReorder);
    
    if (isNaN(stock) || stock < 0) {
      Alert.alert('Error', 'Current stock must be 0 or greater');
      return;
    }
    if (isNaN(reorder) || reorder <= 0) {
      Alert.alert('Error', 'Reorder level must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put(`/inventory/${editingIngredient.id}`, {
        quantityAvailable: stock,
        reorderLevel: reorder,
      });
      
      if (response.success) {
        Alert.alert('Success', 'Ingredient updated successfully!');
        setShowEditModal(false);
        setEditingIngredient(null);
        loadIngredients();
      } else {
        Alert.alert('Error', response.message || 'Failed to update ingredient');
      }
    } catch (error: any) {
      console.log('Error updating ingredient:', error);
      Alert.alert('Error', error?.message || 'Failed to update ingredient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    Alert.alert(
      'Delete Ingredient',
      `Are you sure you want to delete "${ingredient.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/inventory/${ingredient.id}`);
              if (response.success) {
                Alert.alert('Success', 'Ingredient deleted successfully!');
                loadIngredients();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete ingredient');
              }
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete ingredient');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setEditStock(ingredient.quantity_available.toString());
    setEditReorder(ingredient.reorder_level.toString());
    setShowEditModal(true);
  };

  const resetAddForm = () => {
    setSelectedProduct(null);
    setCustomName('');
    setCurrentStock('');
    setReorderLevel('');
    setSelectedUnit('kg');
    setIsCustomProduct(false);
  };

  const renderIngredientCard = ({ item }: { item: Ingredient }) => {
    const status = getStockStatus(item);
    const isLow = status.status === 'LOW';
    
    return (
      <View style={styles.ingredientCard}>
        <View style={styles.ingredientHeader}>
          <View style={styles.ingredientNameSection}>
            <Text style={styles.ingredientName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.status === 'LOW' ? '⚠️ LOW STOCK' : status.status === 'APPROACHING' ? '⚡ APPROACHING' : '✓ OK'}
              </Text>
            </View>
          </View>
          <Text style={styles.categoryTag}>{item.category || 'General'}</Text>
        </View>
        
        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <Ionicons name="cube" size={16} color={isLow ? DESIGN.colors.red : DESIGN.colors.green} />
            <Text style={[styles.stockText, isLow && styles.lowStockText]}>
              Current: <Text style={styles.stockValue}>{item.quantity_available} {item.unit}</Text>
            </Text>
          </View>
          <View style={styles.stockRow}>
            <Ionicons name="alert-circle" size={16} color={DESIGN.colors.muted} />
            <Text style={styles.stockText}>
              Reorder: <Text style={styles.stockValue}>{item.reorder_level} {item.unit}</Text>
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.editBtn]} 
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color={DESIGN.colors.blue} />
            <Text style={[styles.actionBtnText, { color: DESIGN.colors.blue }]}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => handleDeleteIngredient(item)}
          >
            <Ionicons name="trash-outline" size={18} color={DESIGN.colors.red} />
            <Text style={[styles.actionBtnText, { color: DESIGN.colors.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredIngredients = getFilteredAndSortedIngredients();
  const lowStockCount = ingredients.filter(i => i.quantity_available <= i.reorder_level).length;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={DESIGN.colors.orange} />
        <Text style={styles.loadingText}>Loading ingredients...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <View style={styles.headerTitleSection}>
          <Text style={styles.headerTitle}>Manage Branch Ingredients</Text>
          <Text style={styles.headerSubtitle}>Add/edit ingredients for your kitchen</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={20} color={DESIGN.colors.red} />
          <Text style={styles.alertText}>
            {lowStockCount} ingredient{lowStockCount > 1 ? 's' : ''} at low stock
          </Text>
          <TouchableOpacity style={styles.alertAction}>
            <Text style={styles.alertActionText}>Request Restock →</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Ingredient Section */}
        <View style={styles.addSection}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <View style={styles.addButtonContent}>
              <Ionicons name="add-circle" size={24} color={DESIGN.colors.white} />
              <Text style={styles.addButtonText}>Add New Ingredient</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={DESIGN.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={DESIGN.colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ingredients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={DESIGN.colors.muted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={DESIGN.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

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
                   `OK (${ingredients.length - lowStockCount})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <TouchableOpacity 
              style={[styles.sortBtn, sortBy === 'lowest' && styles.sortBtnActive]}
              onPress={() => setSortBy('lowest')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'lowest' && styles.sortBtnTextActive]}>Lowest First</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortBtn, sortBy === 'alphabetical' && styles.sortBtnActive]}
              onPress={() => setSortBy('alphabetical')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'alphabetical' && styles.sortBtnTextActive]}>A-Z</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {filter === 'ALL' ? 'All Ingredients' : 
             filter === 'LOW' ? 'Low Stock Ingredients' : 
             'OK Stock Ingredients'}
          </Text>
          
          {filteredIngredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No ingredients found' : 
                 filter === 'LOW' ? 'No low stock items!' : 
                 'No ingredients yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try a different search term' :
                 filter === 'LOW' ? 'All your ingredients are well stocked' :
                 'Tap "Add New Ingredient" to get started'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.ingredientsList} nestedScrollEnabled={true}>
              {filteredIngredients.map((item) => {
                const status = getStockStatus(item);
                const isLow = status.status === 'LOW';
                return (
                  <View key={item.id} style={styles.ingredientCard}>
                    <View style={styles.ingredientHeader}>
                      <View style={styles.ingredientNameSection}>
                        <Text style={styles.ingredientName}>{item.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>
                            {status.status === 'LOW' ? '⚠️ LOW' : status.status === 'APPROACHING' ? '⚡ LOW' : '✓ OK'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.categoryTag}>{item.category || 'General'}</Text>
                    </View>
                    <View style={styles.stockInfo}>
                      <View style={styles.stockRow}>
                        <Ionicons name="cube" size={16} color={isLow ? DESIGN.colors.red : DESIGN.colors.green} />
                        <Text style={[styles.stockText, isLow && styles.lowStockText]}>
                          Current: <Text style={styles.stockValue}>{item.quantity_available} {item.unit}</Text>
                        </Text>
                      </View>
                      <View style={styles.stockRow}>
                        <Ionicons name="alert-circle" size={16} color={DESIGN.colors.muted} />
                        <Text style={styles.stockText}>
                          Reorder: <Text style={styles.stockValue}>{item.reorder_level} {item.unit}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Bottom padding for safe area */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Add Ingredient Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Ingredient</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              {/* Product Selection Toggle */}
              <View style={styles.toggleSection}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, !isCustomProduct && styles.toggleBtnActive]}
                  onPress={() => setIsCustomProduct(false)}
                >
                  <Text style={[styles.toggleBtnText, !isCustomProduct && styles.toggleBtnTextActive]}>Preset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, isCustomProduct && styles.toggleBtnActive]}
                  onPress={() => setIsCustomProduct(true)}
                >
                  <Text style={[styles.toggleBtnText, isCustomProduct && styles.toggleBtnTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {!isCustomProduct ? (
                <>
                  <Text style={styles.inputLabel}>Select Product</Text>
                  <View style={styles.productGrid}>
                    {PRESET_PRODUCTS.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.productOption,
                          selectedProduct === product.id && styles.productOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedProduct(product.id);
                          setSelectedUnit(product.unit);
                        }}
                      >
                        <Text style={[
                          styles.productOptionText,
                          selectedProduct === product.id && styles.productOptionTextSelected
                        ]}>
                          {product.name}
                        </Text>
                        <Text style={styles.productUnit}>{product.unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Product Name</Text>
                  <TextInput
                    style={styles.input}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="Enter product name"
                    placeholderTextColor={DESIGN.colors.muted}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {UNITS.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      selectedUnit === unit && styles.unitOptionSelected
                    ]}
                    onPress={() => setSelectedUnit(unit)}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      selectedUnit === unit && styles.unitOptionTextSelected
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Current Stock</Text>
              <TextInput
                style={styles.input}
                value={currentStock}
                onChangeText={setCurrentStock}
                placeholder="Enter current stock"
                keyboardType="numeric"
                placeholderTextColor={DESIGN.colors.muted}
              />

              <Text style={styles.inputLabel}>Reorder Level</Text>
              <TextInput
                style={styles.input}
                value={reorderLevel}
                onChangeText={setReorderLevel}
                placeholder="Enter reorder level"
                keyboardType="numeric"
                placeholderTextColor={DESIGN.colors.muted}
              />
              <Text style={styles.hintText}>
                Alert will show when stock drops to or below this level
              </Text>

              <TouchableOpacity 
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleAddIngredient}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={DESIGN.colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Add Ingredient</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Ingredient Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Ingredient</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              <View style={styles.editInfoBox}>
                <Text style={styles.editInfoName}>{editingIngredient?.name}</Text>
                <Text style={styles.editInfoUnit}>Unit: {editingIngredient?.unit}</Text>
              </View>

              <Text style={styles.inputLabel}>Current Stock</Text>
              <TextInput
                style={styles.input}
                value={editStock}
                onChangeText={setEditStock}
                placeholder="Enter current stock"
                keyboardType="numeric"
                placeholderTextColor={DESIGN.colors.muted}
              />

              <Text style={styles.inputLabel}>Reorder Level</Text>
              <TextInput
                style={styles.input}
                value={editReorder}
                onChangeText={setEditReorder}
                placeholder="Enter reorder level"
                keyboardType="numeric"
                placeholderTextColor={DESIGN.colors.muted}
              />
              <Text style={styles.hintText}>
                Alert will show when stock drops to or below this level
              </Text>

              <TouchableOpacity 
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleEditIngredient}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={DESIGN.colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Update Ingredient</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.red,
  },
  alertAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: DESIGN.colors.red,
    borderRadius: 6,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN.colors.white,
  },
  addSection: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN.colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN.colors.white,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: DESIGN.colors.orange,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  filterTabTextActive: {
    color: DESIGN.colors.white,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  sortBtnActive: {
    backgroundColor: DESIGN.colors.blue + '20',
  },
  sortBtnText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  sortBtnTextActive: {
    color: DESIGN.colors.blue,
    fontWeight: '600',
  },
  listSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ingredientNameSection: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryTag: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockInfo: {
    gap: 8,
    marginBottom: 16,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  lowStockText: {
    color: DESIGN.colors.red,
    fontWeight: '600',
  },
  stockValue: {
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  editBtn: {
    backgroundColor: DESIGN.colors.blue + '15',
  },
  deleteBtn: {
    backgroundColor: DESIGN.colors.red + '15',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DESIGN.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  toggleSection: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: DESIGN.colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleBtnText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    color: DESIGN.colors.darkText,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: DESIGN.colors.darkText,
    backgroundColor: DESIGN.colors.white,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  productOptionSelected: {
    backgroundColor: DESIGN.colors.orange + '15',
    borderColor: DESIGN.colors.orange,
  },
  productOptionText: {
    fontSize: 13,
    color: DESIGN.colors.darkText,
  },
  productOptionTextSelected: {
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  productUnit: {
    fontSize: 10,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unitOptionSelected: {
    backgroundColor: DESIGN.colors.orange + '15',
    borderColor: DESIGN.colors.orange,
  },
  unitOptionText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  unitOptionTextSelected: {
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: DESIGN.colors.orange,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN.colors.white,
  },
  editInfoBox: {
    backgroundColor: DESIGN.colors.lightBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  editInfoName: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  editInfoUnit: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
});
