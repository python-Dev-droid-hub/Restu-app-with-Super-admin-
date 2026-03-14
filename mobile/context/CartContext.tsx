import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  size?: string;
  specialInstructions?: string[];
  image?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartTotal: () => number;
  isLoading: boolean;
  validateCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@cart_items';

const toNumberOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : 0;
};

const toImageString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value.replace(/\\/g, '/');
  if (typeof value === 'object') {
    const maybeUrl = (value as any).url || (value as any).uri || (value as any).path;
    if (typeof maybeUrl === 'string') return maybeUrl.replace(/\\/g, '/');
  }
  return undefined;
};

const normalizeCartItem = (item: any): CartItem => {
  return {
    _id: String(item?._id ?? ''),
    name: String(item?.name ?? ''),
    price: toNumberOrZero(item?.price),
    originalPrice: item?.originalPrice !== undefined ? toNumberOrZero(item?.originalPrice) : undefined,
    quantity: Math.max(1, toNumberOrZero(item?.quantity) || 1),
    size: typeof item?.size === 'string' ? item.size : undefined,
    specialInstructions: Array.isArray(item?.specialInstructions) ? item.specialInstructions : undefined,
    image: toImageString(item?.image),
  };
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from storage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          const normalized = Array.isArray(parsed) ? parsed.map(normalizeCartItem) : [];
          
          // Validate cart immediately after loading
          try {
            const res = await api.get('/menu');
            const categories = res?.data?.data?.categories || res?.data?.categories || [];
            const validIds = new Set<string>();
            categories.forEach((cat: any) => {
              const products = cat.products || cat.items || [];
              products.forEach((p: any) => {
                const productId = p._id || p.id;
                if (productId) validIds.add(String(productId).trim());
              });
            });
            
            // Also get deal IDs
            try {
              const campaignsRes = await api.get('/deals/campaigns/active');
              const campaigns = campaignsRes?.data?.data?.campaigns || campaignsRes?.data?.campaigns || [];
              (Array.isArray(campaigns) ? campaigns : []).forEach((c: any) => {
                const deals = Array.isArray(c?.deals) ? c.deals : [];
                deals.forEach((d: any) => {
                  const dealId = d?._id || d?.id;
                  if (dealId) validIds.add(String(dealId).trim());
                });
              });
            } catch (e) {}
            
            const validItems = normalized.filter(item => validIds.has(String(item._id).trim()));
            if (validItems.length !== normalized.length) {
              console.log('[CartContext] Removed', normalized.length - validItems.length, 'invalid items during load');
            }
            setCartItems(validItems);
            // Save validated cart back to storage
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItems));
          } catch (e) {
            // If validation fails, still load the cart
            setCartItems(normalized);
          }
        }
      } catch (error) {
        console.error('[CartContext] Error loading cart:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCart();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } catch (error) {
        console.error('[CartContext] Error saving cart:', error);
      }
    };
    if (!isLoading) {
      saveCart();
    }
  }, [cartItems, isLoading]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setCartItems((prevItems) => {
      const normalizedItem = normalizeCartItem({ ...item, quantity: 1 });
      const existingItem = prevItems.find(
        (i) => i._id === normalizedItem._id && (i.size || '') === (normalizedItem.size || '')
      );
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map((i) =>
          i._id === normalizedItem._id && (i.size || '') === (normalizedItem.size || '')
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      // Add new item with quantity 1
      return [...prevItems, normalizedItem];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item._id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const line = toNumberOrZero(item.price) * Math.max(1, toNumberOrZero(item.quantity) || 1);
      return total + (Number.isFinite(line) ? line : 0);
    }, 0);
  }, [cartItems]);

  // Validate cart items against current menu (deals are excluded from validation)
  const validateCart = useCallback(async () => {
    try {
      const res = await api.get('/menu');
      const categories = res?.data?.data?.categories || res?.data?.categories || [];
      
      // Get all valid product IDs from menu
      const validIds = new Set<string>();
      categories.forEach((cat: any) => {
        const products = cat.products || cat.items || [];
        products.forEach((p: any) => {
          const productId = p._id || p.id;
          if (productId) validIds.add(String(productId).trim());
        });
      });
      
      // Also get valid deal IDs
      try {
        const campaignsRes = await api.get('/deals/campaigns/active');
        const campaigns = campaignsRes?.data?.data?.campaigns || campaignsRes?.data?.campaigns || [];
        (Array.isArray(campaigns) ? campaigns : []).forEach((c: any) => {
          const deals = Array.isArray(c?.deals) ? c.deals : [];
          deals.forEach((d: any) => {
            const dealId = d?._id || d?.id;
            if (dealId) validIds.add(String(dealId).trim());
          });
        });
      } catch (e) {
        // Deals API might fail, continue without deals
      }
      
      // Filter out invalid cart items using functional update
      setCartItems((prevItems) => {
        const validItems = prevItems.filter(item => validIds.has(String(item._id).trim()));
        if (validItems.length !== prevItems.length) {
          console.log('[CartContext] Removed', prevItems.length - validItems.length, 'invalid items from cart');
        }
        return validItems;
      });
    } catch (error) {
      console.error('[CartContext] Error validating cart:', error);
    }
  }, []); // No dependencies - uses setCartItems functional update

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartTotal,
        isLoading,
        validateCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
