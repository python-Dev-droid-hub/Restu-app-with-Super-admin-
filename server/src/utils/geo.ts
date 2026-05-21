export type LatLng = { latitude: number; longitude: number };

/** Haversine distance in meters. */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinRangeMeters(
  from: LatLng,
  to: LatLng,
  rangeMeters: number
): boolean {
  const d = calculateDistanceMeters(from.latitude, from.longitude, to.latitude, to.longitude);
  return d <= rangeMeters;
}

export function extractBranchCoordinates(branch: any): LatLng | null {
  if (!branch) return null;
  if (typeof branch.lat === 'number' && typeof branch.lng === 'number') {
    return { latitude: branch.lat, longitude: branch.lng };
  }
  const coords = branch.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    return { latitude: coords[1], longitude: coords[0] };
  }
  return null;
}

export function extractDeliveryCoordinates(order: any): LatLng | null {
  const dl = order?.deliveryLocation;
  if (dl?.coordinates && Array.isArray(dl.coordinates) && dl.coordinates.length >= 2) {
    return { latitude: dl.coordinates[1], longitude: dl.coordinates[0] };
  }
  const addr = order?.deliveryAddress;
  if (addr?.coordinates) {
    const c = addr.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      return { latitude: c[1], longitude: c[0] };
    }
    if (typeof c.lat === 'number' && typeof c.lng === 'number') {
      return { latitude: c.lat, longitude: c.lng };
    }
  }
  return null;
}
