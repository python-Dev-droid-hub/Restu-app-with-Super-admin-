/**
 * Universal coordinate extractor
 * Handles all possible backend coordinate field formats
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ExtractedCoordinates {
  pickup: Coordinates | null;
  delivery: Coordinates | null;
  pickupName?: string;
  deliveryName?: string;
}

/**
 * Normalize any coordinate format to {latitude, longitude}
 */
const normalizeCoordinates = (data: any): Coordinates | null => {
  if (!data) return null;
  
  try {
    // Format 1: Direct latitude/longitude fields
    if (
      typeof data.latitude === 'number' && 
      typeof data.longitude === 'number'
    ) {
      return {
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
    
    // Format 2: lat/lng shorthand
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      return {
        latitude: data.lat,
        longitude: data.lng
      };
    }
    
    // Format 3: GeoJSON [longitude, latitude] array
    if (
      Array.isArray(data.coordinates) && 
      data.coordinates.length === 2 &&
      typeof data.coordinates[0] === 'number' &&
      typeof data.coordinates[1] === 'number'
    ) {
      return {
        latitude: data.coordinates[1],    // Second element
        longitude: data.coordinates[0]    // First element
      };
    }
    
    // Format 4: Nested coordinates object
    if (data.coordinates) {
      const coords = normalizeCoordinates(data.coordinates);
      if (coords) return coords;
    }
    
    // Format 5: coords object (different spelling)
    if (data.coords) {
      const coords = normalizeCoordinates(data.coords);
      if (coords) return coords;
    }
    
    return null;
  } catch (error) {
    console.error('[CoordinateExtractor] Error normalizing:', error);
    return null;
  }
};

/**
 * Extract coordinates from delivery/order object
 * Tries multiple possible field locations
 */
export const extractDeliveryCoordinates = (order: any): ExtractedCoordinates => {
  if (!order) {
    console.warn('[CoordinateExtractor] Order is null/undefined');
    return { pickup: null, delivery: null };
  }
  
  // TRY MULTIPLE POSSIBLE LOCATIONS FOR PICKUP COORDINATES
  const pickupCoords =
    // Location 1: pickupLocation.location
    normalizeCoordinates(order.pickupLocation?.location) ||
    // Location 2: pickupLocation.coordinates
    normalizeCoordinates(order.pickupLocation?.coordinates) ||
    // Location 3: pickupLocation direct
    normalizeCoordinates(order.pickupLocation) ||
    // Location 4: branch.location (fallback)
    normalizeCoordinates(order.branch?.location) ||
    // Location 5: branch.coordinates
    normalizeCoordinates(order.branch?.coordinates);
  
  // TRY MULTIPLE POSSIBLE LOCATIONS FOR DELIVERY COORDINATES
  const deliveryCoords =
    // Location 1: deliveryAddress.location
    normalizeCoordinates(order.deliveryAddress?.location) ||
    // Location 2: deliveryAddress.coordinates
    normalizeCoordinates(order.deliveryAddress?.coordinates) ||
    // Location 3: deliveryAddress.coords
    normalizeCoordinates(order.deliveryAddress?.coords) ||
    // Location 4: delivery.location
    normalizeCoordinates(order.delivery?.location) ||
    // Location 5: delivery.coordinates
    normalizeCoordinates(order.delivery?.coordinates);
  
  // Get friendly names
  const pickupName = 
    order.pickupLocation?.name || 
    order.branch?.name || 
    'Pickup Location';
  
  const deliveryName = 
    order.deliveryAddress?.address || 
    order.deliveryAddress?.name || 
    'Delivery Location';
  
  console.log('[CoordinateExtractor] Result:', {
    order: order._id,
    pickup: pickupCoords ? '✅ Found' : '❌ Not found',
    delivery: deliveryCoords ? '✅ Found' : '❌ Not found'
  });
  
  return {
    pickup: pickupCoords,
    delivery: deliveryCoords,
    pickupName,
    deliveryName
  };
};

/**
 * Validate if coordinates are sufficient for map display
 */
export const hasValidCoordinates = (order: any): boolean => {
  const coords = extractDeliveryCoordinates(order);
  return !!(coords.pickup && coords.delivery);
};

export type { Coordinates, ExtractedCoordinates };
export default extractDeliveryCoordinates;
