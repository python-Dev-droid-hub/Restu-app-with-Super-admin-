import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../components/api/client';
import { useSettings } from './SettingsContext';

export type SelectedBranchId = 'all' | string;

export interface Branch {
  _id: string;
  name: string;
  code?: string;
}

interface BranchContextValue {
  branches: Branch[];
  selectedBranchId: SelectedBranchId;
  selectedBranchName: string;
  canSelectBranch: boolean;
  isReady: boolean;
  branchRevision: number;
  setSelectedBranch: (branchId: SelectedBranchId) => Promise<void>;
  refreshBranches: () => Promise<void>;
  appendBranchQuery: (path: string) => string;
  getApiBranchParam: () => string | undefined;
}

const STORAGE_KEY = 'selectedBranchId';

const defaultValue: BranchContextValue = {
  branches: [],
  selectedBranchId: 'all',
  selectedBranchName: 'All Branches',
  canSelectBranch: false,
  isReady: false,
  branchRevision: 0,
  setSelectedBranch: async () => {},
  refreshBranches: async () => {},
  appendBranchQuery: (path) => path,
  getApiBranchParam: () => undefined,
};

const BranchContext = createContext<BranchContextValue>(defaultValue);

export const useBranch = () => useContext(BranchContext);

function resolveAssignedBranchId(parsed: Record<string, unknown>): string | undefined {
  const branchData = (parsed.assignedBranch || parsed.branch) as Record<string, unknown> | undefined;
  if (!branchData) {
    return typeof parsed.branchId === 'string' ? parsed.branchId : undefined;
  }
  return (
    (branchData._id as string) ||
    (branchData.branchId as string) ||
    (typeof parsed.branchId === 'string' ? parsed.branchId : undefined)
  );
}

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { refreshSettings } = useSettings();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<SelectedBranchId>('all');
  const [canSelectBranch, setCanSelectBranch] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [branchRevision, setBranchRevision] = useState(0);
  const managerBranchIdRef = useRef<string | undefined>(undefined);
  const [managerBranchName, setManagerBranchName] = useState('My Branch');

  const refreshBranches = useCallback(async () => {
    try {
      const response: any = await api.get('/branches');
      if (response?.success) {
        const rawList =
          response?.data?.branches ||
          response?.data?.data?.branches ||
          response?.data?.data?.restaurants ||
          response?.data ||
          [];
        const normalized = (Array.isArray(rawList) ? rawList : [])
          .map((b: any) => ({
            _id: b?._id || b?.id,
            name: b?.name || b?.branchName || b?.restaurantName,
            code: b?.code || b?.branchCode,
          }))
          .filter((b: Branch) => !!b._id && !!b.name);
        setBranches(normalized);
      } else {
        setBranches([]);
      }
    } catch {
      setBranches([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem('userData');
        if (!stored) {
          if (!cancelled) setIsReady(true);
          return;
        }

        const parsed = JSON.parse(stored) as Record<string, unknown>;
        const role = String(parsed.role || '').toUpperCase();
        const isManager = role === 'BRANCH_MANAGER';
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'; // legacy SUPER_ADMIN → admin

        if (isManager) {
          const assignedId = resolveAssignedBranchId(parsed);
          const branchData = (parsed.assignedBranch || parsed.branch) as Record<string, unknown> | undefined;
          managerBranchIdRef.current = assignedId;
          if (branchData && !cancelled) {
            setManagerBranchName(
              String(branchData.name || branchData.branchName || 'My Branch')
            );
          }
          if (assignedId && !cancelled) {
            setSelectedBranchId(assignedId);
          }
          setCanSelectBranch(false);
        } else if (isAdmin) {
          setCanSelectBranch(true);
          await refreshBranches();
          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          if (saved && !cancelled) {
            setSelectedBranchId(saved);
          }
        }
      } catch (error) {
        console.error('[BranchContext] init error:', error);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [refreshBranches]);

  const getApiBranchParam = useCallback((): string | undefined => {
    if (managerBranchIdRef.current) {
      return managerBranchIdRef.current;
    }
    if (selectedBranchId === 'all') return undefined;
    return selectedBranchId;
  }, [selectedBranchId]);

  const appendBranchQuery = useCallback(
    (path: string): string => {
      const branchId = getApiBranchParam();
      if (!branchId) return path;
      const sep = path.includes('?') ? '&' : '?';
      return `${path}${sep}activationBranchId=${encodeURIComponent(branchId)}`;
    },
    [getApiBranchParam]
  );

  const setSelectedBranch = useCallback(
    async (branchId: SelectedBranchId) => {
      if (!canSelectBranch) return;

      if (branchId === 'all') {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, branchId);
      }

      setSelectedBranchId(branchId);
      setBranchRevision((r) => r + 1);
      await refreshSettings();
    },
    [canSelectBranch, refreshSettings]
  );

  const selectedBranchName = useMemo(() => {
    if (managerBranchIdRef.current) {
      return managerBranchName;
    }
    if (selectedBranchId === 'all') return 'All Branches';
    const branch = branches.find((b) => b._id === selectedBranchId);
    return branch?.name || 'Select Branch';
  }, [branches, selectedBranchId, branchRevision, managerBranchName]);

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      selectedBranchName,
      canSelectBranch,
      isReady,
      branchRevision,
      setSelectedBranch,
      refreshBranches,
      appendBranchQuery,
      getApiBranchParam,
    }),
    [
      branches,
      selectedBranchId,
      selectedBranchName,
      canSelectBranch,
      isReady,
      branchRevision,
      setSelectedBranch,
      refreshBranches,
      appendBranchQuery,
      getApiBranchParam,
    ]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};
