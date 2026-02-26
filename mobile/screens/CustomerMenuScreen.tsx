import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;
const FOOTER_MARGIN = Platform.OS === 'android' ? 20 : 10;

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category: {
    _id: string;
    name: string;
  };
}

interface Category {
  _id: string;
  name: string;
  products: Product[];
}

export default function CustomerMenuScreen() {
  console.log('🚀 CUSTOMER MENU SCREEN LOADED');
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      console.log('🔍 [MENU DEBUG] Loading menu data...');

      // Load categories with products
      const response = await api.get('/menu');
      console.log('🔍 [MENU DEBUG] API Response:', response);
      console.log('🔍 [MENU DEBUG] Response success:', response.success);
      console.log('🔍 [MENU DEBUG] Response data:', JSON.stringify(response.data, null, 2));

      if (response.success && response.data) {
        const categoriesData = response.data.categories || response.data || [];
        console.log('🔍 [MENU DEBUG] Raw categories data:', JSON.stringify(categoriesData, null, 2));
        console.log('🔍 [MENU DEBUG] Categories data type:', typeof categoriesData);
        console.log('🔍 [MENU DEBUG] Categories data length:', Array.isArray(categoriesData) ? categoriesData.length : 'not array');
        
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          console.log('🔍 [MENU DEBUG] First category structure:', {
            id: categoriesData[0]._id,
            name: categoriesData[0].name,
            products: categoriesData[0].products?.length || 0,
            hasProducts: !!categoriesData[0].products
          });
        }

        // Set first category as selected if none selected
        if (!selectedCategory) {
          setSelectedCategory(categoriesData[0]._id);
          console.log('🔍 [MENU DEBUG] Selected first category:', categoriesData[0]._id);
        }

        setCategories(categoriesData);
      } else {
        console.log('🔍 [MENU DEBUG] No categories data in response');
        Alert.alert('Error', 'Failed to load menu');
      }
    } catch (error) {
      console.error('🔍 [MENU DEBUG] Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenuData();
    setRefreshing(false);
  };

  const getSelectedCategoryProducts = () => {
    const category = categories.find(cat => cat._id === selectedCategory);
    return category?.products || [];
  };

  const addToCart = (product: Product) => {
    // TODO: Implement cart functionality
    Alert.alert('Added to Cart', `${product.name} added to cart!`);
  };

  const renderProduct = (product: Product) => (
    <TouchableOpacity key={product._id} style={styles.productCard} onPress={() => addToCart(product)}>
      <View style={styles.productImageContainer}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color="#ccc" />
          </View>
        )}
        {!product.isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>
        <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, !product.isAvailable && styles.addButtonDisabled]}
        onPress={() => addToCart(product)}
        disabled={!product.isAvailable}
      >
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { marginTop: HEADER_MARGIN }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Categories Tabs */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category._id && styles.categoryTabSelected,
                ]}
                onPress={() => setSelectedCategory(category._id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category._id && styles.categoryTabTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products */}
        <View style={styles.productsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
          ) : getSelectedCategoryProducts().length > 0 ? (
            getSelectedCategoryProducts().map(renderProduct)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products available</Text>
              <Text style={styles.emptySubtext}>Check back later for new items</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { bottom: FOOTER_MARGIN, left: 10, right: 10, borderRadius: 16, elevation: 5 }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home-outline" size={24} color="#999" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="restaurant" size={24} color="#e87e35" />
          <Text style={[styles.navText, styles.navTextActive]}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="receipt-outline" size={24} color="#999" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="heart-outline" size={24} color="#999" />
          <Text style={styles.navText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#999" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryTabSelected: {
    backgroundColor: '#E87E35',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  productsContainer: {
    padding: 20,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E87E35',
  },
  addButton: {
    backgroundColor: '#E87E35',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  navTextActive: {
    color: '#e87e35',
    fontWeight: '600',
  },
});
