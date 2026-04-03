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
  let pickupCoords = null;
  
  // Try pickupCoords already extracted
  if (!pickupCoords) pickupCoords = normalizeCoordinates(order.pickupCoords);
  
  // Try pickupLocation various formats
  if (!pickupCoords && order.pickupLocation) {
    pickupCoords = normalizeCoordinates(order.pickupLocation?.location) ||
                   normalizeCoordinates(order.pickupLocation?.coordinates) ||
                   normalizeCoordinates(order.pickupLocation);
  }
  
  // Try branch location - handle various API response formats
  if (!pickupCoords && order.branch) {
    // Format 1: branch.lat and branch.lng (separate fields from API)
    if (typeof order.branch.lat === 'number' && typeof order.branch.lng === 'number') {
      pickupCoords = { 
        latitude: order.branch.lat, 
        longitude: order.branch.lng 
      };
    }
    
    // Format 2: branch.location with lat/lng or latitude/longitude
    if (!pickupCoords) {
      pickupCoords = normalizeCoordinates(order.branch?.location);
    }
    
    // Format 3: branch.location as GeoJSON [lng, lat] array
    if (!pickupCoords && Array.isArray(order.branch?.location?.coordinates)) {
      const coords = order.branch.location.coordinates;
      if (coords.length === 2) {
        pickupCoords = { longitude: coords[0], latitude: coords[1] };
      }
    }
    
    // Format 4: branch with direct lat/lng fields in location object
    if (!pickupCoords && order.branch?.location) {
      pickupCoords = normalizeCoordinates(order.branch.location);
    }
  }
  
  // Try restaurant/pickup location from raw order data
  if (!pickupCoords && order.raw) {
    pickupCoords = normalizeCoordinates(order.raw?.branch?.location) ||
                   normalizeCoordinates(order.raw?.pickupLocation);
  }
  
  // TRY MULTIPLE POSSIBLE LOCATIONS FOR DELIVERY COORDINATES
  let deliveryCoords = null;
  
  // Try already extracted deliveryCoords
  if (!deliveryCoords) deliveryCoords = normalizeCoordinates(order.deliveryCoords);
  
  // Try deliveryLocation (from Order model GeoJSON)
  if (!deliveryCoords && order.deliveryLocation) {
    // GeoJSON format [lng, lat]
    if (Array.isArray(order.deliveryLocation.coordinates) && order.deliveryLocation.coordinates.length === 2) {
      deliveryCoords = { 
        longitude: order.deliveryLocation.coordinates[0], 
        latitude: order.deliveryLocation.coordinates[1] 
      };
    } else {
      deliveryCoords = normalizeCoordinates(order.deliveryLocation);
    }
  }
  
  // Try deliveryAddress various formats
  if (!deliveryCoords && order.deliveryAddress) {
    deliveryCoords = normalizeCoordinates(order.deliveryAddress?.location) ||
                     normalizeCoordinates(order.deliveryAddress?.coordinates) ||
                     normalizeCoordinates(order.deliveryAddress?.coords) ||
                     normalizeCoordinates(order.deliveryAddress);
  }
  
  // Try delivery object
  if (!deliveryCoords && order.delivery) {
    deliveryCoords = normalizeCoordinates(order.delivery?.location) ||
                     normalizeCoordinates(order.delivery?.coordinates);
  }
  
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
    order: order._id || order.id,
    pickup: pickupCoords ? `✅ Found (${pickupCoords.latitude}, ${pickupCoords.longitude})` : '❌ Not found',
    delivery: deliveryCoords ? `✅ Found (${deliveryCoords.latitude}, ${deliveryCoords.longitude})` : '❌ Not found',
    branchData: order.branch ? JSON.stringify({ 
      id: order.branch._id || order.branch.id,
      branchName: order.branch.branchName,
      addressLine: order.branch.addressLine,
      city: order.branch.city,
      state: order.branch.state,
      country: order.branch.country,
      lat: order.branch.lat,
      lng: order.branch.lng,
      hasLocation: !!order.branch?.location,
      locationType: order.branch?.location?.type,
      locationCoords: order.branch?.location?.coordinates
    }) : 'no branch'
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
