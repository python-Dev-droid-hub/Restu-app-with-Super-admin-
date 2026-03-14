import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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

  const loadUserData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed: UserData = JSON.parse(stored);
        setUserData(parsed);
        
        // Extract role
        setUserRole(parsed.role || '');
        
        // Extract profile image from various possible fields
        const image = parsed.profileImage || parsed.image || parsed.avatar || '';
        console.log('[useUserData] Profile image:', image, 'from fields:', { profileImage: parsed.profileImage, image: parsed.image, avatar: parsed.avatar });
        setProfileImage(image);
        
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
  }, []);

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
