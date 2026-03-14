import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface SettingsContextType {
  defaultCurrency: string;
  currencySymbol: string;
  taxRate: number;
  deliveryFee: number;
  appName: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  formatPrice: (price: number) => string;
}

const defaultSettings: SettingsContextType = {
  defaultCurrency: 'USD',
  currencySymbol: '$',
  taxRate: 8.5,
  deliveryFee: 50,
  appName: 'Restaurant App',
  isLoading: false,
  refreshSettings: async () => {},
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
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
    currencySymbol: '$',
    taxRate: 8.5,
    deliveryFee: 50,
    appName: 'Restaurant App',
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('[Settings] No auth token, skipping settings load');
        setIsLoading(false);
        return;
      }

      // Get user data to check role and assigned branch
      const storedUserData = localStorage.getItem('userData');
      const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;
      const userRole = parsedUserData?.role;
      const branchId =
        parsedUserData?.assignedBranch?._id ||
        parsedUserData?.assignedBranch ||
        parsedUserData?.branch?._id ||
        parsedUserData?.branch ||
        parsedUserData?.branchId;

      // For all users including CUSTOMER, fetch branch settings if there's a selected branch
      const selectedBranchId = localStorage.getItem('selectedBranchId');
      const userBranchId = branchId || selectedBranchId;
      
      console.log('[SettingsContext] User data:', { userRole, branchId, selectedBranchId, userBranchId });

      // For staff roles OR customers with a selected branch, use branch-specific settings
      const staffRoles = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CHEF', 'WAITER', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER'];
      if ((staffRoles.includes(userRole) || userRole === 'CUSTOMER') && userBranchId) {
        try {
          const branchRes: any = await api.getBranchById(userBranchId);
          if (branchRes?.success && branchRes.data) {
            const branchCurrency = branchRes.data?.currency;
            const branchTaxRate = branchRes.data?.taxRate !== undefined ? branchRes.data.taxRate : 8.5;

            // Validate currency - fallback to system settings if not supported
            const currency = VALID_CURRENCIES.includes(branchCurrency) ? branchCurrency : 'USD';
            const symbol = currencySymbols[currency] || '$';

            setSettings({
              defaultCurrency: currency,
              taxRate: branchTaxRate,
              deliveryFee: branchRes.data?.deliveryFee || 50,
              currencySymbol: symbol,
              appName: 'Restaurant App',
            });
            console.log('[SettingsContext] Loaded branch settings for', userRole, '- Currency:', currency, 'Symbol:', symbol);
            setIsLoading(false);
            return;
          }
        } catch (branchError) {
          console.error('[SettingsContext] Error loading branch settings:', branchError);
          // Continue to fallback
        }
      }

      // Fallback to system settings
      const response: any = await api.getSettings();
      const systemSettings = response?.success && response.data ? response.data : null;

      const currency = VALID_CURRENCIES.includes(systemSettings?.defaultCurrency) ? systemSettings?.defaultCurrency : 'USD';
      const symbol = currencySymbols[currency] || '$';
      setSettings({
        defaultCurrency: currency,
        taxRate: systemSettings?.taxRate || 8.5,
        deliveryFee: systemSettings?.deliveryFee || 50,
        currencySymbol: symbol,
        appName: systemSettings?.appName || 'Restaurant App',
      });
      console.log('[SettingsContext] Loaded system settings - Currency:', currency, 'Symbol:', symbol);
    } catch (error) {
      console.error('[SettingsContext] Error loading settings:', error);
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    
    // Listen for storage changes (login/logout/branch change)
    const handleStorageChange = () => {
      console.log('[SettingsContext] Storage changed, reloading settings...');
      loadSettings();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const formatPrice = (price: number): string => {
    return `${settings.currencySymbol}${price.toFixed(2)}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        isLoading,
        refreshSettings: loadSettings,
        formatPrice,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
