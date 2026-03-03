import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../components/api/client';

interface SettingsContextType {
  defaultCurrency: string;
  taxRate: number;
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
  currencySymbol: '$',
  appName: 'Restaurant App',
  isLoading: false,
  refreshSettings: async () => {},
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
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
    currencySymbol: '$',
    appName: 'Restaurant App',
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      // Check if user is authenticated first
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('[Settings] No auth token, skipping settings load');
        setIsLoading(false);
        return;
      }
      
      const response = await api.get('/settings');
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

      // For staff roles (BRANCH_MANAGER, CHEF, WAITER), use assigned branch settings
      const staffRoles = ['BRANCH_MANAGER', 'CHEF', 'WAITER', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER'];
      if (staffRoles.includes(userRole) && branchId) {
        const branchRes = await api.get(`/restaurants/${branchId}`);
        if (branchRes.success && branchRes.data) {
          const branchCurrency = branchRes.data?.currency;
          const branchLanguage = branchRes.data?.language;
          
          // Store branch language in AsyncStorage for LocalizationContext to use
          if (branchLanguage) {
            await AsyncStorage.setItem('branchLanguage', branchLanguage);
          }
          
          // Validate currency - fallback to USD if not supported
          const currency = VALID_CURRENCIES.includes(branchCurrency) ? branchCurrency : (systemSettings?.defaultCurrency || 'USD');
          const symbol = currencySymbols[currency] || '$';

          setSettings({
            defaultCurrency: currency,
            taxRate: systemSettings?.taxRate || 8.5,
            currencySymbol: symbol,
            appName: systemSettings?.appName || 'Restaurant App',
          });
        } else {
          // Fallback to system settings
          const currency = VALID_CURRENCIES.includes(systemSettings?.defaultCurrency) ? systemSettings?.defaultCurrency : 'USD';
          const symbol = currencySymbols[currency] || '$';
          setSettings({
            defaultCurrency: currency,
            taxRate: systemSettings?.taxRate || 8.5,
            currencySymbol: symbol,
            appName: systemSettings?.appName || 'Restaurant App',
          });
        }
      } else {
        const currency = VALID_CURRENCIES.includes(systemSettings?.defaultCurrency) ? systemSettings?.defaultCurrency : 'USD';
        const symbol = currencySymbols[currency] || '$';
        setSettings({
          defaultCurrency: currency,
          taxRate: systemSettings?.taxRate || 8.5,
          currencySymbol: symbol,
          appName: systemSettings?.appName || 'Restaurant App',
        });
      }

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
          taxRate: parsed.taxRate || 8.5,
          currencySymbol: currencySymbols[currency] || '$',
          appName: parsed.appName || 'Restaurant App',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    
    // Set up polling to refresh settings every 30 seconds for real-time sync
    const pollInterval = setInterval(() => {
      loadSettings();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const formatPrice = (price: number): string => {
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

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        isLoading,
        refreshSettings: loadSettings,
        formatPrice,
        calculatePriceWithTax,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
