import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../components/api/client';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
  city: string;
  addressLine: string;
  lat?: number;
  lng?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
}

function getBranchCoordinates(branch: Branch): { lat: number; lng: number } | null {
  const lat =
    typeof branch.lat === 'number'
      ? branch.lat
      : (typeof branch.location?.latitude === 'number' ? branch.location.latitude : undefined);
  const lng =
    typeof branch.lng === 'number'
      ? branch.lng
      : (typeof branch.location?.longitude === 'number' ? branch.location.longitude : undefined);
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

/**
 * Request location permissions and get current location
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Fetch all available branches
 */
export async function fetchBranches(): Promise<Branch[]> {
  try {
    const response = await api.get('/branches');
    if (response.success && response.data) {
      return response.data.branches || response.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}

/**
 * Find the nearest branch to the given coordinates
 */
export function findNearestBranch(
  userLocation: Coordinates,
  branches: Branch[]
): Branch | null {
  if (!branches.length) return null;

  let nearest = branches[0];
  let minDistance = Infinity;

  for (const branch of branches) {
    const coords = getBranchCoordinates(branch);
    if (!coords) continue;

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      coords.lat,
      coords.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...branch, distance };
    }
  }

  return nearest;
}

/**
 * Calculate distances for all branches from user location
 */
export function calculateBranchDistances(
  userLocation: Coordinates,
  branches: Branch[]
): Branch[] {
  return branches
    .map((branch) => {
      const coords = getBranchCoordinates(branch);
      if (!coords) {
        return { ...branch, distance: Infinity };
      }
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        coords.lat,
        coords.lng
      );
      return { ...branch, distance };
    })
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
}

/**
 * Save selected branch to AsyncStorage
 */
export async function saveSelectedBranch(branchId: string): Promise<void> {
  await AsyncStorage.setItem('selectedBranchId', branchId);
}

/**
 * Get saved branch from AsyncStorage
 */
export async function getSavedBranch(): Promise<string | null> {
  return await AsyncStorage.getItem('selectedBranchId');
}

/**
 * Get current location with reverse geocoding to get city name
 */
export async function getCurrentLocationWithCity(): Promise<(Coordinates & { city?: string }) | null> {
  try {
    const location = await getCurrentLocation();
    if (!location) return null;

    // Reverse geocode to get city
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    const city = geocode?.city || geocode?.subregion || geocode?.region || 'Unknown Location';
    
    return {
      ...location,
      city,
    };
  } catch (error) {
    console.error('Error getting location with city:', error);
    return null;
  }
}

/**
 * Get city name from coordinates
 */
export async function getCityFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    return geocode?.city || geocode?.subregion || geocode?.region || null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}
