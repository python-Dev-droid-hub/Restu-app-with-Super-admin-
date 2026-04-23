import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);

  const loadSettings = async () => {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
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

      if (!socketRef.current) {
        const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
        const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

        const normalizeHost = (value?: string): string => {
          const v = (value || '').trim();
          if (!v) return '';
          return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
        };

        const socketUrl = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl) || 'http://localhost:3101';

        socketRef.current = io(socketUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          auth: token ? { token } : undefined,
        });

        socketRef.current.on('settings_context:data', (payload: any) => {
          const currencyRaw = payload?.defaultCurrency || payload?.currency;
          const currency = VALID_CURRENCIES.includes(currencyRaw) ? currencyRaw : 'USD';
          const symbol = currencySymbols[currency] || '$';

          setSettings({
            defaultCurrency: currency,
            taxRate: typeof payload?.taxRate === 'number' ? payload.taxRate : 8.5,
            deliveryFee: typeof payload?.deliveryFee === 'number' ? payload.deliveryFee : 50,
            currencySymbol: symbol,
            appName: payload?.appName || 'Restaurant App',
          });
          setIsLoading(false);
        });

        socketRef.current.on('connect_error', () => {
          setIsLoading(false);
        });
      }

      const request = () => {
        setIsLoading(true);
        socketRef.current?.emit('settings_context:get', { branchId: userBranchId || undefined });
      };

      if (socketRef.current.connected) request();
      else socketRef.current.once('connect', request);
    } catch (error) {
      console.error('[SettingsContext] Error loading settings:', error);
      // Keep defaults on error
    } finally {
      // setIsLoading is driven by socket response
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
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
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
