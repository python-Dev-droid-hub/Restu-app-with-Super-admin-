import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SvgXml } from 'react-native-svg';
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
  requireSelection?: boolean;
}

// City colors for styled initials
const CITY_COLORS: Record<string, { bg: string; text: string }> = {
  karachi: { bg: '#4A90D9', text: '#FFFFFF' },
  lahore: { bg: '#E85A2B', text: '#FFFFFF' },
  islamabad: { bg: '#2ECC71', text: '#FFFFFF' },
  rawalpindi: { bg: '#9B59B6', text: '#FFFFFF' },
  hyderabad: { bg: '#3498DB', text: '#FFFFFF' },
  multan: { bg: '#F39C12', text: '#FFFFFF' },
  faisalabad: { bg: '#1ABC9C', text: '#FFFFFF' },
  peshawar: { bg: '#E74C3C', text: '#FFFFFF' },
  quetta: { bg: '#34495E', text: '#FFFFFF' },
  gujranwala: { bg: '#16A085', text: '#FFFFFF' },
  sialkot: { bg: '#2980B9', text: '#FFFFFF' },
  bahawalpur: { bg: '#D35400', text: '#FFFFFF' },
  sargodha: { bg: '#27AE60', text: '#FFFFFF' },
  sukkur: { bg: '#8E44AD', text: '#FFFFFF' },
  larkana: { bg: '#C0392B', text: '#FFFFFF' },
  sheikhupura: { bg: '#F39C12', text: '#FFFFFF' },
  jhang: { bg: '#3498DB', text: '#FFFFFF' },
  rahimyarkhan: { bg: '#E85A2B', text: '#FFFFFF' },
  gujrat: { bg: '#1ABC9C', text: '#FFFFFF' },
  sahiwal: { bg: '#9B59B6', text: '#FFFFFF' },
  default: { bg: '#95A5A6', text: '#FFFFFF' },
};

 const CITY_LANDMARK_SVGS: Record<string, string> = {
   lahore: 'https://kababjeesfriedchicken.com/assets/svg/lahore.svg',
 };

 function sanitizeSvgXml(xml: string): string {
   if (!xml) return xml;
   // react-native-svg can fail on some inline style attributes coming from web SVGs.
   // Strip all style="..." and style='...' attributes to improve compatibility.
   return xml
     .replace(/\sstyle=("[^"]*"|'[^']*')/g, '')
     // clipPath often causes SVGs to render blank in react-native-svg depending on the SVG.
     // This SVG uses clip-path for a simple rectangle, so it's safe to remove.
     .replace(/<defs>[\s\S]*?<\/defs>/g, '')
     .replace(/\sclip-path=("[^"]*"|'[^']*')/g, '')
     .trim();
 }

export default function BranchSelector({
  visible,
  onClose,
  onBranchSelected,
  requireSelection = false,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [citySvgXml, setCitySvgXml] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      loadBranchesAndLocation();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const loadSvgs = async () => {
      const entries = Object.entries(CITY_LANDMARK_SVGS);
      if (entries.length === 0) return;

      const results = await Promise.all(
        entries.map(async ([cityKey, url]) => {
          try {
            const res = await fetch(url);
            const text = await res.text();
            return [cityKey, sanitizeSvgXml(text)] as const;
          } catch {
            return [cityKey, ''] as const;
          }
        })
      );

      setCitySvgXml((prev) => {
        const next = { ...prev };
        for (const [k, v] of results) {
          if (v) next[k] = v;
        }
        return next;
      });
    };

    loadSvgs();
  }, [visible]);

  const loadBranchesAndLocation = async () => {
    setLoading(true);
    setPermissionDenied(false);
    setSelectedBranchId(null);
    setBranchDropdownOpen(false);

    // Fetch branches
    const branchData = await fetchBranches();
    setBranches(branchData);

    // If only 1 branch, auto-select it
    if (branchData.length === 1) {
      const singleBranch = branchData[0];
      setSelectedCity(singleBranch.city);
      setSelectedBranchId(singleBranch._id);
      // Auto-confirm selection for single branch
      await saveSelectedBranch(singleBranch._id);
      onBranchSelected(singleBranch);
      setLoading(false);
      return;
    }

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
        setSelectedBranchId(nearest._id);
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

  const handleConfirmSelection = async () => {
    if (!selectedCity) {
      Alert.alert('Select City', 'Please select a city first.');
      return;
    }
    if (!selectedBranchId) {
      Alert.alert('Select Branch', 'Please select a branch first.');
      return;
    }
    const branch = branches.find((b) => b._id === selectedBranchId);
    if (!branch) {
      Alert.alert('Select Branch', 'Please select a valid branch.');
      return;
    }

    await saveSelectedBranch(branch._id);
    onBranchSelected(branch);
    onClose();
  };

  const handleManualCitySelect = (city: string) => {
    setSelectedCity(city);
    setSelectedBranchId(null);
    setBranchDropdownOpen(true);
  };

  // Get unique cities from branches
  const cities = [...new Set(branches.map((b) => b.city))].filter(Boolean);

  // Get branches for selected city
  const cityBranches = branches.filter((b) => b.city === selectedCity);

  const selectedBranch = useMemo(
    () => (selectedBranchId ? branches.find((b) => b._id === selectedBranchId) : null),
    [branches, selectedBranchId]
  );

  const handleImageError = useCallback((city: string) => {
    setImageErrors((prev) => new Set([...prev, city]));
  }, []);

  const renderCityIcon = useCallback((city: string, isSelected: boolean) => {
    const cityKey = city?.toLowerCase() || '';
    const colors = CITY_COLORS[cityKey] || CITY_COLORS.default;
    const initials = city.slice(0, 2).toUpperCase();
    const svgXml = citySvgXml[cityKey];
    const showSvg = Boolean(svgXml) && !imageErrors.has(cityKey);

    if (showSvg) {
      return (
        <View style={[styles.cityIcon, isSelected && styles.cityIconSelected]}>
          <SvgXml xml={svgXml} width={44} height={44} />
        </View>
      );
    }

    return (
      <View style={[
        styles.cityIcon,
        { backgroundColor: colors.bg },
        isSelected && styles.cityIconSelected
      ]}>
        <Text style={[styles.cityInitials, { color: colors.text }]}>
          {initials}
        </Text>
      </View>
    );
  }, [citySvgXml, imageErrors]);

  const handleClose = () => {
    if (requireSelection) return;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Your Location</Text>
            {!requireSelection && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            )}
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
                    return (
                      <TouchableOpacity
                        key={city + index}
                        style={[styles.cityButton, isSelected && styles.cityButtonSelected]}
                        onPress={() => handleManualCitySelect(city)}
                      >
                        {renderCityIcon(city, isSelected)}
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

                    <TouchableOpacity
                      style={styles.branchDropdown}
                      onPress={() => setBranchDropdownOpen((p) => !p)}
                      activeOpacity={0.8}
                    >
                      <Text style={selectedBranch ? styles.branchDropdownText : styles.branchDropdownPlaceholder}>
                        {selectedBranch?.branchName || 'Please select your location'}
                      </Text>
                      <Ionicons name={branchDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray} />
                    </TouchableOpacity>

                    {branchDropdownOpen && (
                      <View style={styles.branchListContainer}>
                        {cityBranches.map((branch) => {
                          const isSelected = selectedBranchId === branch._id;
                          return (
                            <TouchableOpacity
                              key={branch._id}
                              style={[styles.branchCard, isSelected && styles.branchCardSelected]}
                              onPress={() => setSelectedBranchId(branch._id)}
                            >
                              <View style={styles.branchInfo}>
                                <Text style={[styles.branchName, isSelected && styles.branchNameSelected]}>{branch.branchName}</Text>
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
                              {isSelected ? (
                                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                              ) : (
                                <View style={styles.branchRadio} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
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

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.selectButton, (!selectedCity || !selectedBranchId) && styles.selectButtonDisabled]}
              onPress={handleConfirmSelection}
              disabled={!selectedCity || !selectedBranchId || loading}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  selectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  selectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityIconSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cityInitials: {
    fontSize: 16,
    fontWeight: 'bold',
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
  branchDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  branchDropdownPlaceholder: {
    color: COLORS.gray,
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  branchDropdownText: {
    color: COLORS.darkText,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  branchListContainer: {
    marginBottom: 10,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  branchCardSelected: {
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
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
  branchNameSelected: {
    color: COLORS.darkText,
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
  branchRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.gray,
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
