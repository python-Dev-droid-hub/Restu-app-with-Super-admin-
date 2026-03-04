import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentLocation,
  fetchBranches,
  calculateBranchDistances,
  findNearestBranch,
  saveSelectedBranch,
  Branch,
  Coordinates,
} from '../../../services/locationService';

const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E85A2B',
  success: '#2ECC71',
  darkText: '#2C3E50',
  white: '#FFFFFF',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
  background: '#F5F5F5',
};

interface BranchSelectorProps {
  visible: boolean;
  onClose: () => void;
  onBranchSelected: (branch: Branch) => void;
}

// City icons mapping (using Ionicons as fallback for landmarks)
const CITY_ICONS: Record<string, string> = {
  karachi: 'business',
  lahore: 'flag',
  islamabad: 'home',
  rawalpindi: 'build',
  faisalabad: 'construct',
  multan: 'cube',
  peshawar: 'shield',
  quetta: 'locate',
  hyderabad: 'water',
  gujranwala: 'people',
  sialkot: 'football',
  bahawalpur: 'sunny',
  sargodha: 'leaf',
  sukkur: 'boat',
  larkana: 'pin',
  sheikhupura: 'star',
  jhang: 'flame',
  rahimyarkhan: 'compass',
  default: 'location',
};

export default function BranchSelector({
  visible,
  onClose,
  onBranchSelected,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBranchesAndLocation();
    }
  }, [visible]);

  const loadBranchesAndLocation = async () => {
    setLoading(true);
    setPermissionDenied(false);

    // Fetch branches
    const branchData = await fetchBranches();
    setBranches(branchData);

    // Try to get location
    const location = await getCurrentLocation();
    
    if (location) {
      setUserLocation(location);
      // Calculate distances and sort branches
      const branchesWithDistance = calculateBranchDistances(location, branchData);
      setBranches(branchesWithDistance);
      
      // Auto-select nearest city
      if (branchesWithDistance.length > 0 && branchesWithDistance[0].distance) {
        setSelectedCity(branchesWithDistance[0].city);
      }
    } else {
      setPermissionDenied(true);
    }

    setLoading(false);
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    const location = await getCurrentLocation();
    
    if (location) {
      setUserLocation(location);
      setPermissionDenied(false);
      
      // Find nearest branch
      const branchesWithDistance = calculateBranchDistances(location, branches);
      setBranches(branchesWithDistance);
      
      const nearest = findNearestBranch(location, branches);
      if (nearest) {
        setSelectedCity(nearest.city);
        
        // Auto-select if within reasonable distance (e.g., 50km)
        if (nearest.distance && nearest.distance <= 50) {
          handleSelectBranch(nearest);
          return;
        }
      }
    } else {
      Alert.alert(
        'Location Required',
        'Please enable location services to find the nearest branch.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: handleUseCurrentLocation },
        ]
      );
    }
    setLoading(false);
  };

  const handleSelectBranch = async (branch: Branch) => {
    await saveSelectedBranch(branch._id);
    onBranchSelected(branch);
    onClose();
  };

  const handleManualCitySelect = (city: string) => {
    setSelectedCity(city);
  };

  // Get unique cities from branches
  const cities = [...new Set(branches.map((b) => b.city))].filter(Boolean);

  // Get branches for selected city
  const cityBranches = branches.filter((b) => b.city === selectedCity);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Your Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.darkText} />
            </TouchableOpacity>
          </View>

          {/* Use Current Location Button */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            <Ionicons name="locate" size={20} color={COLORS.white} />
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </TouchableOpacity>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Finding nearest branch...</Text>
              </View>
            ) : permissionDenied ? (
              <View style={styles.permissionContainer}>
                <Ionicons name="location-outline" size={48} color={COLORS.gray} />
                <Text style={styles.permissionTitle}>Location Access Needed</Text>
                <Text style={styles.permissionText}>
                  Please enable location services or select a city manually
                </Text>
              </View>
            ) : (
              <>
                {/* Cities Grid */}
                <Text style={styles.sectionTitle}>Select City</Text>
                <View style={styles.citiesGrid}>
                  {cities.map((city, index) => {
                    const isSelected = selectedCity === city;
                    const iconName =
                      CITY_ICONS[city?.toLowerCase() || ''] || CITY_ICONS.default;
                    
                    return (
                      <TouchableOpacity
                        key={city + index}
                        style={[styles.cityButton, isSelected && styles.cityButtonSelected]}
                        onPress={() => handleManualCitySelect(city)}
                      >
                        <View
                          style={[
                            styles.cityIcon,
                            isSelected && styles.cityIconSelected,
                          ]}
                        >
                          <Ionicons
                            name={iconName as any}
                            size={24}
                            color={isSelected ? COLORS.primary : COLORS.gray}
                          />
                        </View>
                        <Text
                          style={[
                            styles.cityText,
                            isSelected && styles.cityTextSelected,
                          ]}
                        >
                          {city}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Branch Selection */}
                {selectedCity && cityBranches.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Select Branch in {selectedCity}</Text>
                    {cityBranches.map((branch) => (
                      <TouchableOpacity
                        key={branch._id}
                        style={styles.branchCard}
                        onPress={() => handleSelectBranch(branch)}
                      >
                        <View style={styles.branchInfo}>
                          <Text style={styles.branchName}>{branch.branchName}</Text>
                          <Text style={styles.branchAddress} numberOfLines={2}>
                            {branch.addressLine}
                          </Text>
                          {branch.distance !== undefined && (
                            <Text style={styles.branchDistance}>
                              {branch.distance < 1
                                ? `${(branch.distance * 1000).toFixed(0)} m away`
                                : `${branch.distance.toFixed(1)} km away`}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* No Branches Message */}
                {selectedCity && cityBranches.length === 0 && (
                  <View style={styles.noBranchesContainer}>
                    <Text style={styles.noBranchesText}>
                      No branches available in {selectedCity}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  closeButton: {
    padding: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  permissionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 16,
    marginBottom: 12,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cityButton: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cityButtonSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  cityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityIconSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  cityText: {
    fontSize: 12,
    color: COLORS.darkText,
    textAlign: 'center',
  },
  cityTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  branchDistance: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noBranchesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBranchesText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
});
