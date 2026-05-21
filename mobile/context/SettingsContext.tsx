import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../components/api/client';

interface SettingsContextType {
  defaultCurrency: string;
  taxRate: number;
  deliveryFee: number;
  currencySymbol: string;
  appName: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  formatPrice: (price: number) => string;
  calculatePriceWithTax: (price: number) => { subtotal: number; tax: number; total: number };
}

const defaultSettings: SettingsContextType = {
  defaultCurrency: 'USD',
  taxRate: 8.5,
  deliveryFee: 50,
  currencySymbol: '$',
  appName: 'Restaurant App',
  isLoading: false,
  refreshSettings: async () => {},
  formatPrice: (price: number) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '$0.00';
    }
    return `$${price.toFixed(2)}`;
  },
  calculatePriceWithTax: (price: number) => ({
    subtotal: price,
    tax: price * 0.085,
    total: price * 1.085,
  }),
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
  children: ReactNode;
}

// Only functional currencies supported by backend
const VALID_CURRENCIES = ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR'];

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', SAR: '﷼', AED: 'د.إ',
  PKR: '₨', INR: '₹'
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState({
    defaultCurrency: 'USD',
    taxRate: 8.5,
    deliveryFee: 50,
    currencySymbol: '$',
    appName: 'Restaurant App',
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadInFlightRef = useRef(false);
  const lastLoadKeyRef = useRef<string>('');

  const loadSettings = useCallback(async (forceRefresh: boolean = false) => {
    if (loadInFlightRef.current) return;
    try {
      loadInFlightRef.current = true;
      // Check if user is authenticated first
      const { getAccessToken } = await import('../utils/secureAuthStorage');
      const token = await getAccessToken();
      const settingsPath = token ? '/settings' : '/settings/public';
      if (!token) {
        console.log('[Settings] No auth token, loading public settings');
      }

      const selectedBranchId = await AsyncStorage.getItem('selectedBranchId');
      const loadKey = `${settingsPath}|${selectedBranchId || ''}`;
      // Skip cache check if force refresh is requested or if already loaded this key
      if (!forceRefresh && lastLoadKeyRef.current === loadKey) {
        loadInFlightRef.current = false;
        return;
      }
      lastLoadKeyRef.current = loadKey;

      let response = await api.get(settingsPath);
      if (!response.success && settingsPath === '/settings') {
        response = await api.get('/settings/public');
      }
      const systemSettings = response.success && response.data ? response.data : null;

      const storedUserData = await AsyncStorage.getItem('userData');
      const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;
      const userRole = parsedUserData?.role;
      const branchId =
        parsedUserData?.assignedBranch?._id ||
        parsedUserData?.assignedBranch ||
        parsedUserData?.branch?._id ||
        parsedUserData?.branch ||
        parsedUserData?.branchId;

      // For all users including CUSTOMER, fetch branch settings if there's a selected branch
      const userBranchId = branchId || selectedBranchId;
      
      // If there is a branch selected (or assigned), always prefer branch-specific settings.
      // This is critical for guest customers where userRole may be missing.
      if (userBranchId) {
        try {
          const branchRes = await api.get(`/restaurants/${userBranchId}`);
          if (branchRes.success && branchRes.data) {
            const branchCurrency = branchRes.data?.currency;
            const branchLanguage = branchRes.data?.language;
            const branchTaxRate = branchRes.data?.taxRate !== undefined ? parseFloat(branchRes.data.taxRate) : systemSettings?.taxRate;
            const branchDeliveryFee = branchRes.data?.deliveryFee !== undefined ? parseFloat(branchRes.data.deliveryFee) : systemSettings?.deliveryFee;
            
            // Store branch language in AsyncStorage for LocalizationContext to use
            if (branchLanguage) {
              await AsyncStorage.setItem('branchLanguage', branchLanguage);
            }
            
            // Validate currency - fallback to system settings if not supported
            const currency = VALID_CURRENCIES.includes(branchCurrency) ? branchCurrency : (systemSettings?.defaultCurrency || 'USD');
            const symbol = currencySymbols[currency] || '$';

            const resolvedTaxRateRaw =
              typeof branchTaxRate === 'number'
                ? branchTaxRate
                : (typeof branchTaxRate === 'string' ? parseFloat(branchTaxRate) : undefined);

            const resolvedTaxRate =
              typeof resolvedTaxRateRaw === 'number' && !Number.isNaN(resolvedTaxRateRaw)
                ? resolvedTaxRateRaw
                : (typeof systemSettings?.taxRate === 'number' ? systemSettings?.taxRate : 8.5);

            const branchDeliveryFeeRaw =
              typeof branchRes.data?.deliveryFee === 'number'
                ? branchRes.data.deliveryFee
                : (typeof branchRes.data?.deliveryFee === 'string' ? parseFloat(branchRes.data.deliveryFee) : undefined);

            const resolvedDeliveryFee =
              typeof branchDeliveryFeeRaw === 'number' && !Number.isNaN(branchDeliveryFeeRaw)
                ? branchDeliveryFeeRaw
                : (typeof systemSettings?.deliveryFee === 'number' ? systemSettings?.deliveryFee : 50);

            setSettings({
              defaultCurrency: currency,
              taxRate: resolvedTaxRate,
              deliveryFee: resolvedDeliveryFee,
              currencySymbol: symbol,
              appName: systemSettings?.appName || 'Restaurant App',
            });
            console.log('[SettingsContext] Loaded branch settings for', userRole, '- Currency:', currency, 'Tax:', branchTaxRate, 'DeliveryFee:', resolvedDeliveryFee);
            return;
          }
        } catch (branchError) {
          console.error('[SettingsContext] Error loading branch settings:', branchError);
          // Continue to fallback
        }
      }
      
      // Fallback to system settings if no branch settings or error occurred
      const currency = VALID_CURRENCIES.includes(systemSettings?.defaultCurrency) ? systemSettings?.defaultCurrency : 'USD';
      const symbol = currencySymbols[currency] || '$';
      setSettings({
        defaultCurrency: currency,
        taxRate: (systemSettings?.taxRate ?? 8.5),
        deliveryFee: (systemSettings?.deliveryFee ?? 50),
        currencySymbol: symbol,
        appName: systemSettings?.appName || 'Restaurant App',
      });

      if (systemSettings) {
        await AsyncStorage.setItem('appSettings', JSON.stringify(systemSettings));
      }
    } catch (error) {
      const cachedSettings = await AsyncStorage.getItem('appSettings');
      if (cachedSettings) {
        const parsed = JSON.parse(cachedSettings);
        const currency = VALID_CURRENCIES.includes(parsed.defaultCurrency) ? parsed.defaultCurrency : 'USD';
        setSettings({
          defaultCurrency: currency,
          taxRate: (parsed.taxRate ?? 8.5),
          deliveryFee: (parsed.deliveryFee ?? 50),
          currencySymbol: currencySymbols[currency] || '$',
          appName: parsed.appName || 'Restaurant App',
        });
      }
    } finally {
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    return;
  }, []);

  const formatPrice = (price: number): string => {
    if (price === undefined || price === null || isNaN(price)) {
      return `${settings.currencySymbol}0.00`;
    }
    return `${settings.currencySymbol}${price.toFixed(2)}`;
  };

  const calculatePriceWithTax = (price: number) => {
    const tax = price * (settings.taxRate / 100);
    return {
      subtotal: price,
      tax,
      total: price + tax,
    };
  };

  const refreshSettings = useCallback(() => loadSettings(true), [loadSettings]);

  const contextValue = useMemo(
    () => ({
      ...settings,
      isLoading,
      refreshSettings,
      formatPrice,
      calculatePriceWithTax,
    }),
    [settings, isLoading, refreshSettings, formatPrice, calculatePriceWithTax]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};
