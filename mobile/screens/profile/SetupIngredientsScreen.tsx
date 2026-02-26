import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';

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

// Preset ingredients with default values
const PRESET_INGREDIENTS = [
  { id: 'chicken', name: 'Chicken', unit: 'kg', category: 'Meat', defaultStock: 0, defaultReorder: 10 },
  { id: 'beef', name: 'Beef', unit: 'kg', category: 'Meat', defaultStock: 0, defaultReorder: 10 },
  { id: 'pork', name: 'Pork', unit: 'kg', category: 'Meat', defaultStock: 0, defaultReorder: 10 },
  { id: 'fish', name: 'Fish', unit: 'kg', category: 'Meat', defaultStock: 0, defaultReorder: 10 },
  { id: 'tomatoes', name: 'Tomatoes', unit: 'kg', category: 'Vegetables', defaultStock: 0, defaultReorder: 5 },
  { id: 'lettuce', name: 'Lettuce', unit: 'kg', category: 'Vegetables', defaultStock: 0, defaultReorder: 5 },
  { id: 'onions', name: 'Onions', unit: 'kg', category: 'Vegetables', defaultStock: 0, defaultReorder: 5 },
  { id: 'garlic', name: 'Garlic', unit: 'kg', category: 'Vegetables', defaultStock: 0, defaultReorder: 3 },
  { id: 'olive_oil', name: 'Olive Oil', unit: 'L', category: 'Oils', defaultStock: 0, defaultReorder: 5 },
  { id: 'vegetable_oil', name: 'Vegetable Oil', unit: 'L', category: 'Oils', defaultStock: 0, defaultReorder: 5 },
  { id: 'salt', name: 'Salt', unit: 'kg', category: 'Spices', defaultStock: 0, defaultReorder: 2 },
  { id: 'pepper', name: 'Pepper', unit: 'kg', category: 'Spices', defaultStock: 0, defaultReorder: 1 },
  { id: 'flour', name: 'Flour', unit: 'kg', category: 'Grains', defaultStock: 0, defaultReorder: 10 },
  { id: 'sugar', name: 'Sugar', unit: 'kg', category: 'Grains', defaultStock: 0, defaultReorder: 5 },
  { id: 'butter', name: 'Butter', unit: 'kg', category: 'Dairy', defaultStock: 0, defaultReorder: 3 },
  { id: 'eggs', name: 'Eggs', unit: 'pieces', category: 'Dairy', defaultStock: 0, defaultReorder: 30 },
  { id: 'milk', name: 'Milk', unit: 'L', category: 'Dairy', defaultStock: 0, defaultReorder: 10 },
  { id: 'cheese', name: 'Cheese', unit: 'kg', category: 'Dairy', defaultStock: 0, defaultReorder: 5 },
  { id: 'bread', name: 'Bread', unit: 'pieces', category: 'Bakery', defaultStock: 0, defaultReorder: 20 },
  { id: 'rice', name: 'Rice', unit: 'kg', category: 'Grains', defaultStock: 0, defaultReorder: 10 },
  { id: 'pasta', name: 'Pasta', unit: 'kg', category: 'Grains', defaultStock: 0, defaultReorder: 5 },
];

interface SetupIngredientsScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
  branchId?: string;
}

export default function SetupIngredientsScreen({ onComplete, onSkip, branchId }: SetupIngredientsScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [ingredientSettings, setIngredientSettings] = useState<Record<string, { stock: string; reorder: string }>>(
    PRESET_INGREDIENTS.reduce((acc, ing) => ({
      ...acc,
      [ing.id]: { stock: ing.defaultStock.toString(), reorder: ing.defaultReorder.toString() }
    }), {})
  );
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Meat', 'Vegetables']));
  
  // Custom ingredient
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('kg');
  const [customStock, setCustomStock] = useState('0');
  const [customReorder, setCustomReorder] = useState('10');

  const categories = [...new Set(PRESET_INGREDIENTS.map(i => i.category))];

  const toggleIngredient = (id: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIngredients(newSelected);
  };

  const selectAll = () => {
    setSelectedIngredients(new Set(PRESET_INGREDIENTS.map(i => i.id)));
  };

  const clearAll = () => {
    setSelectedIngredients(new Set());
  };

  const updateIngredientSetting = (id: string, field: 'stock' | 'reorder', value: string) => {
    setIngredientSettings(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const addCustomIngredient = () => {
    if (!customName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    
    const newId = `custom_${Date.now()}`;
    const newIngredient = {
      id: newId,
      name: customName,
      unit: customUnit,
      category: 'Custom',
      defaultStock: parseInt(customStock) || 0,
      defaultReorder: parseInt(customReorder) || 10,
    };
    
    // Add to preset list
    PRESET_INGREDIENTS.push(newIngredient);
    setIngredientSettings(prev => ({
      ...prev,
      [newId]: { stock: customStock, reorder: customReorder }
    }));
    
    // Auto-select it
    setSelectedIngredients(prev => new Set([...prev, newId]));
    
    // Reset form
    setCustomName('');
    setCustomStock('0');
    setCustomReorder('10');
    setShowCustomForm(false);
    
    Alert.alert('Success', 'Custom ingredient added!');
  };

  const handleSubmit = async () => {
    if (selectedIngredients.size === 0) {
      Alert.alert('No Ingredients Selected', 'Please select at least one ingredient to add to your kitchen.');
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

      const itemsToAdd = Array.from(selectedIngredients).map(id => {
        const preset = PRESET_INGREDIENTS.find(i => i.id === id);
        const settings = ingredientSettings[id];
        return {
          branch: branch,
          product: id, // Using id as product reference (could be product ObjectId in real scenario)
          product_name: preset?.name || id,
          quantityAvailable: parseInt(settings.stock) || 0,
          reorderLevel: parseInt(settings.reorder) || 10,
          unit: preset?.unit || 'kg',
          category: preset?.category || 'General',
        };
      });

      const response = await api.post('/inventory/bulk-add', {
        items: itemsToAdd,
      });

      if (response.success) {
        Alert.alert(
          'Success!',
          `${selectedIngredients.size} ingredients added to your kitchen.`,
          [{ text: 'Continue', onPress: onComplete }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to add ingredients');
      }
    } catch (error: any) {
      console.log('Error adding ingredients:', error);
      Alert.alert('Error', error?.message || 'Failed to add ingredients');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Setup Initial Ingredients</Text>
          <Text style={styles.headerSubtitle}>
            Select ingredients for your kitchen to get started
          </Text>
        </View>
        {onSkip && (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={DESIGN.colors.blue} />
          <Text style={styles.infoText}>
            Select the ingredients you commonly use in your kitchen. You can always add more later.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Count */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {selectedIngredients.size} ingredients selected
          </Text>
        </View>

        {/* Categories */}
        {categories.map(category => {
          const categoryIngredients = PRESET_INGREDIENTS.filter(i => i.category === category);
          const isExpanded = expandedCategories.has(category);
          const selectedCount = categoryIngredients.filter(i => selectedIngredients.has(i.id)).length;

          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity 
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryTitleRow}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {selectedCount > 0 && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{selectedCount}</Text>
                    </View>
                  )}
                </View>
                <Ionicons 
                  name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                  size={20} 
                  color={DESIGN.colors.muted} 
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.ingredientsList}>
                  {categoryIngredients.map(ingredient => {
                    const isSelected = selectedIngredients.has(ingredient.id);
                    const settings = ingredientSettings[ingredient.id];

                    return (
                      <View key={ingredient.id} style={styles.ingredientRow}>
                        <TouchableOpacity 
                          style={styles.checkboxRow}
                          onPress={() => toggleIngredient(ingredient.id)}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Ionicons name="checkmark" size={16} color={DESIGN.colors.white} />}
                          </View>
                          <View style={styles.ingredientInfo}>
                            <Text style={styles.ingredientName}>{ingredient.name}</Text>
                            <Text style={styles.ingredientUnit}>Unit: {ingredient.unit}</Text>
                          </View>
                        </TouchableOpacity>

                        {isSelected && (
                          <View style={styles.settingsRow}>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Stock</Text>
                              <TextInput
                                style={styles.smallInput}
                                value={settings.stock}
                                onChangeText={(text) => updateIngredientSetting(ingredient.id, 'stock', text)}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Reorder</Text>
                              <TextInput
                                style={styles.smallInput}
                                value={settings.reorder}
                                onChangeText={(text) => updateIngredientSetting(ingredient.id, 'reorder', text)}
                                keyboardType="numeric"
                                placeholder="10"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Custom Ingredient Section */}
        <View style={styles.customSection}>
          {!showCustomForm ? (
            <TouchableOpacity 
              style={styles.addCustomBtn}
              onPress={() => setShowCustomForm(true)}
            >
              <Ionicons name="add-circle" size={20} color={DESIGN.colors.orange} />
              <Text style={styles.addCustomText}>Add Custom Ingredient</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customForm}>
              <Text style={styles.customFormTitle}>Add Custom Ingredient</Text>
              
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Enter product name"
                placeholderTextColor={DESIGN.colors.muted}
              />

              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {['kg', 'L', 'pieces', 'g', 'ml'].map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitBtn, customUnit === unit && styles.unitBtnActive]}
                    onPress={() => setCustomUnit(unit)}
                  >
                    <Text style={[styles.unitBtnText, customUnit === unit && styles.unitBtnTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customInputsRow}>
                <View style={styles.customInputGroup}>
                  <Text style={styles.inputLabel}>Current Stock</Text>
                  <TextInput
                    style={styles.input}
                    value={customStock}
                    onChangeText={setCustomStock}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.customInputGroup}>
                  <Text style={styles.inputLabel}>Reorder Level</Text>
                  <TextInput
                    style={styles.input}
                    value={customReorder}
                    onChangeText={setCustomReorder}
                    keyboardType="numeric"
                    placeholder="10"
                  />
                </View>
              </View>

              <View style={styles.customFormButtons}>
                <TouchableOpacity 
                  style={styles.cancelCustomBtn}
                  onPress={() => setShowCustomForm(false)}
                >
                  <Text style={styles.cancelCustomText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveCustomBtn}
                  onPress={addCustomIngredient}
                >
                  <Text style={styles.saveCustomText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, (submitting || selectedIngredients.size === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || selectedIngredients.size === 0}
        >
          {submitting ? (
            <ActivityIndicator color={DESIGN.colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={DESIGN.colors.white} />
              <Text style={styles.submitBtnText}>
                Add {selectedIngredients.size} Ingredients
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.blue + '10',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: DESIGN.colors.darkText,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  selectAllBtn: {
    flex: 1,
    backgroundColor: DESIGN.colors.green + '15',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.green,
  },
  clearAllBtn: {
    flex: 1,
    backgroundColor: DESIGN.colors.muted + '15',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  countBadge: {
    alignItems: 'center',
    marginTop: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.orange,
    backgroundColor: DESIGN.colors.orange + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categorySection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: DESIGN.colors.lightBg,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  categoryBadge: {
    backgroundColor: DESIGN.colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN.colors.white,
  },
  ingredientsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ingredientRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  checkboxRow: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: DESIGN.colors.orange,
    borderColor: DESIGN.colors.orange,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  ingredientUnit: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 36,
    marginTop: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginBottom: 4,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: DESIGN.colors.darkText,
    backgroundColor: DESIGN.colors.white,
  },
  customSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: DESIGN.colors.orange,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.orange,
  },
  customForm: {
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
  customFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DESIGN.colors.darkText,
    backgroundColor: DESIGN.colors.lightBg,
    marginBottom: 12,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.lightBg,
  },
  unitBtnActive: {
    backgroundColor: DESIGN.colors.orange + '15',
  },
  unitBtnText: {
    fontSize: 13,
    color: DESIGN.colors.darkText,
  },
  unitBtnTextActive: {
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  customInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInputGroup: {
    flex: 1,
  },
  customFormButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelCustomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: DESIGN.colors.muted + '15',
    alignItems: 'center',
  },
  cancelCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  saveCustomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: DESIGN.colors.orange,
    alignItems: 'center',
  },
  saveCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DESIGN.colors.white,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN.colors.orange,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.white,
  },
});
