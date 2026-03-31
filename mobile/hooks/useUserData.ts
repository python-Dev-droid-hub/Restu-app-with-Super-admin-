import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../components/api/client';

interface UserData {
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
  profileImage?: string;
  avatar?: string;
  role?: string;
  branchId?: string;
  branch?: {
    _id?: string;
    branchId?: string;
    name?: string;
    branchName?: string;
    code?: string;
    branchCode?: string;
  };
  assignedBranch?: {
    _id?: string;
    branchId?: string;
    name?: string;
    branchName?: string;
    code?: string;
    branchCode?: string;
  };
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [assignedBranch, setAssignedBranch] = useState<{
    _id?: string;
    name?: string;
    code?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  // Normalize media URL to full URL if it's a relative path
  const normalizeMediaUrl = useCallback((uri?: string): string => {
    if (!uri) return '';
    const value = String(uri);
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }
    // Some stored values may come without a leading slash (e.g. "uploads/..."), normalize them
    const normalizedPath = value.startsWith('/')
      ? value
      : (value.startsWith('uploads/') || value.startsWith('src/uploads/'))
          ? `/${value.replace(/^src\//, '')}`
          : value;

    // If it still doesn't look like a path, return as-is
    if (!normalizedPath.startsWith('/')) return normalizedPath;
    // Convert relative path to full URL
    const base = api.getBaseURL();
    const host = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${host}${normalizedPath}`;
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed: UserData = JSON.parse(stored);
        setUserData(parsed);
        
        // Extract role
        setUserRole(parsed.role || '');
        
        // Extract profile image from various possible fields and normalize URL
        const rawImage = parsed.profileImage || parsed.image || parsed.avatar || '';
        const normalizedImage = normalizeMediaUrl(rawImage);
        console.log('[useUserData] Profile image:', normalizedImage, 'from raw:', rawImage);
        setProfileImage(normalizedImage);
        
        // Extract branch info
        const branchData = parsed.assignedBranch || parsed.branch;
        if (branchData) {
          setAssignedBranch({
            _id: branchData._id || branchData.branchId || parsed.branchId,
            name: branchData.name || branchData.branchName || 'My Branch',
            code: branchData.code || branchData.branchCode || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [normalizeMediaUrl]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Reload user data when screen comes into focus (for 3-dot menu navigation)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  return {
    userData,
    userRole,
    profileImage,
    assignedBranch,
    loading,
    refresh: loadUserData
  };
}
