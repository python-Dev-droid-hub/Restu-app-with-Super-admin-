import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  white: '#FFFFFF',
  gray: '#95A5A6',
};

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LiveMapProps {
  pickupLocation?: Coordinate;
  deliveryLocation?: Coordinate;
  onLocationUpdate?: (location: Coordinate) => void;
  style?: any;
}

const LiveMap: React.FC<LiveMapProps> = ({
  pickupLocation,
  deliveryLocation,
  onLocationUpdate,
  style,
}) => {
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Default region (will be updated with current location)
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
  });

  // Get current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied');
          setLoading(false);
          return;
        }

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentLocation(newLocation);
        setRegion({
          ...newLocation,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        });

        onLocationUpdate?.(newLocation);
        setLoading(false);

        // Start watching location for live updates
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 5000, // Or every 5 seconds
          },
          (newLocation) => {
            const updatedLocation = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            setCurrentLocation(updatedLocation);
            onLocationUpdate?.(updatedLocation);
          }
        );
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Failed to get location');
        setLoading(false);
      }
    })();

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Fetch directions when locations change
  useEffect(() => {
    if (currentLocation && deliveryLocation) {
      fetchDirections();
    }
  }, [currentLocation, pickupLocation, deliveryLocation]);

  // Fetch directions from Google Directions API
  const fetchDirections = async () => {
    if (!currentLocation || !deliveryLocation) return;

    try {
      // Determine the origin (pickup or current location)
      const origin = pickupLocation || currentLocation;
      
      // Use Google Directions API
      const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${deliveryLocation.latitude},${deliveryLocation.longitude}&mode=driving&key=${apiKey}`;

      // For now, use a simplified straight-line route
      // In production, you would call the actual API
      const simplifiedRoute = [
        origin,
        deliveryLocation,
      ];

      // Calculate distance and duration
      const distanceMeters = calculateDistance(origin, deliveryLocation);
      const distanceKm = (distanceMeters / 1000).toFixed(1);
      const estimatedMinutes = Math.ceil(distanceMeters / 500); // Rough estimate: 500m per minute

      setRouteCoordinates(simplifiedRoute);
      setDistance(`${distanceKm} km`);
      setDuration(`${estimatedMinutes} min`);

      // Fit map to show all markers
      fitMapToCoordinates(simplifiedRoute);
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Fit map to show all coordinates
  const fitMapToCoordinates = (coordinates: Coordinate[]) => {
    if (mapRef.current && coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: 100,
          left: 50,
        },
        animated: true,
      });
    }
  };

  // Center map on current location
  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...currentLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  // Open in external maps app for turn-by-turn navigation
  const openInMaps = async () => {
    if (!deliveryLocation) {
      Alert.alert('Error', 'No delivery location set');
      return;
    }

    const { latitude, longitude } = deliveryLocation;
    
    try {
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
        android: `google.navigation:q=${latitude},${longitude}`,
      });

      if (!url) {
        Alert.alert('Error', 'Unable to create navigation URL');
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open maps application');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Failed to open navigation');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="location-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        onMapReady={() => {
          if (routeCoordinates.length > 0) {
            fitMapToCoordinates(routeCoordinates);
          }
        }}
      >
        {/* Current Location Marker (handled by showsUserLocation) */}

        {/* Pickup Location Marker */}
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup"
            description="Restaurant location"
            identifier="pickup"
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, styles.pickupMarker]}>
                <Ionicons name="restaurant" size={20} color={COLORS.white} />
              </View>
            </View>
          </Marker>
        )}

        {/* Delivery Location Marker */}
        {deliveryLocation && (
          <Marker
            coordinate={deliveryLocation}
            title="Delivery"
            description="Customer location"
            identifier="delivery"
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, styles.deliveryMarker]}>
                <Ionicons name="location" size={24} color={COLORS.white} />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnCurrentLocation}
        >
          <Ionicons name="locate" size={24} color={COLORS.darkText} />
        </TouchableOpacity>

        {/* Open in Maps Button */}
        {deliveryLocation && (
          <TouchableOpacity style={styles.controlButton} onPress={openInMaps}>
            <Ionicons name="navigate" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Trip Info Overlay */}
      {(distance || duration) && (
        <View style={styles.tripInfo}>
          <View style={styles.tripInfoItem}>
            <Ionicons name="navigate" size={16} color={COLORS.primary} />
            <Text style={styles.tripInfoText}>{distance}</Text>
          </View>
          <View style={styles.tripInfoDivider} />
          <View style={styles.tripInfoItem}>
            <Ionicons name="time" size={16} color={COLORS.warning} />
            <Text style={styles.tripInfoText}>{duration}</Text>
          </View>
        </View>
      )}

      {/* Live Indicator */}
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.gray,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: COLORS.primary,
  },
  deliveryMarker: {
    backgroundColor: COLORS.success,
  },
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tripInfo: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tripInfoDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.gray,
    opacity: 0.3,
  },
  tripInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default LiveMap;
