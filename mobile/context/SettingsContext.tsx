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

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', SAR: '﷼', AED: 'د.إ',
  PKR: '₨', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥',
  CNY: '¥', RUB: '₽', BRL: 'R$', MXN: '$', ZAR: 'R',
  CHF: 'Fr', SEK: 'kr', NZD: 'NZ$', SGD: 'S$', HKD: 'HK$',
  NOK: 'kr', DKK: 'kr', PLN: 'zł', THB: '฿', IDR: 'Rp',
  MYR: 'RM', PHP: '₱', VND: '₫', KRW: '₩', TWD: 'NT$',
  TRY: '₺', ILS: '₪', EGP: 'E£', NGN: '₦', KES: 'KSh',
  GHS: '₵', UAH: '₴',
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
      const response = await api.get('/settings');
      const systemSettings = response.success && response.data ? response.data : null;

      const storedUserData = await AsyncStorage.getItem('userData');
      const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;
      const userRole = parsedUserData?.role;
      const branchId =
        parsedUserData?.assignedBranch?._id ||
        parsedUserData?.branch?._id ||
        parsedUserData?.branchId;

      // If BRANCH_MANAGER, use assigned branch currency/language when available
      if (userRole === 'BRANCH_MANAGER' && branchId) {
        const branchRes = await api.get(`/restaurants/${branchId}`);
        const branchCurrency = branchRes.success ? branchRes.data?.currency : undefined;
        const currency = branchCurrency || systemSettings?.defaultCurrency || 'USD';
        const symbol = currencySymbols[currency] || currency;

        setSettings({
          defaultCurrency: currency,
          taxRate: systemSettings?.taxRate || 8.5,
          currencySymbol: symbol,
          appName: systemSettings?.appName || 'Restaurant App',
        });
      } else {
        const currency = systemSettings?.defaultCurrency || 'USD';
        const symbol = currencySymbols[currency] || currency;
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
        const currency = parsed.defaultCurrency || 'USD';
        setSettings({
          defaultCurrency: currency,
          taxRate: parsed.taxRate || 8.5,
          currencySymbol: currencySymbols[currency] || currency,
          appName: parsed.appName || 'Restaurant App',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
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
