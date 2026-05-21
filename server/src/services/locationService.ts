import { createError } from '@/utils/errorHandler';
import {
  calculateDistanceMeters,
  extractBranchCoordinates,
  extractDeliveryCoordinates,
  isWithinRangeMeters,
  type LatLng,
} from '@/utils/geo';
import {
  getRiderLocation,
  isLocationFresh,
  isPlausibleMovement,
  setRiderLocation,
} from '@/services/riderLocationStore';

export const PICKUP_RANGE_METERS = 100;
export const DELIVERY_RANGE_METERS = 200;
export const LOCATION_MAX_AGE_MS = 30_000;

export function updateRiderLocation(
  riderId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) {
  if (!isPlausibleMovement(riderId, latitude, longitude)) {
    throw createError('Location update rejected (unrealistic movement)', 400);
  }
  return setRiderLocation(riderId, latitude, longitude, accuracy);
}

export function getRiderLocationSnapshot(riderId: string) {
  return getRiderLocation(riderId);
}

export function validateRiderStatusChange(options: {
  riderId: string;
  order: any;
  newStatus: string;
  requestCoords?: LatLng | null;
  skipValidation?: boolean;
}): { ok: true; distanceMeters?: number } | { ok: false; message: string; distanceMeters?: number } {
  const { riderId, order, newStatus, requestCoords, skipValidation } = options;
  const status = String(newStatus || '').toUpperCase();

  if (skipValidation) return { ok: true };

  if (!['PICKED_UP', 'DELIVERED'].includes(status)) {
    return { ok: true };
  }

  const stored = getRiderLocation(riderId);
  const coords =
    requestCoords ||
    (stored ? { latitude: stored.latitude, longitude: stored.longitude } : null);

  if (!coords) {
    return { ok: false, message: 'GPS location required. Enable location and wait for sync.' };
  }

  if (!isLocationFresh(riderId, LOCATION_MAX_AGE_MS) && !requestCoords) {
    return {
      ok: false,
      message: 'Location data is stale. Wait for GPS update (max 30 seconds old).',
    };
  }

  if (status === 'PICKED_UP') {
    if (String(order.status).toUpperCase() !== 'RIDER_ASSIGNED') {
      return { ok: false, message: 'Order must be assigned before pickup.' };
    }
    const branch = extractBranchCoordinates(order.branch);
    if (!branch) {
      return { ok: false, message: 'Branch location not configured.' };
    }
    const distanceMeters = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      branch.latitude,
      branch.longitude
    );
    if (!isWithinRangeMeters(coords, branch, PICKUP_RANGE_METERS)) {
      return {
        ok: false,
        message: `Reach branch to pick up (${Math.round(distanceMeters)}m away, need within ${PICKUP_RANGE_METERS}m)`,
        distanceMeters,
      };
    }
    return { ok: true, distanceMeters };
  }

  if (status === 'DELIVERED') {
    if (String(order.status).toUpperCase() !== 'OUT_FOR_DELIVERY') {
      return { ok: false, message: 'Order must be out for delivery before marking delivered.' };
    }
    const delivery = extractDeliveryCoordinates(order);
    if (!delivery) {
      return { ok: false, message: 'Customer delivery location not available.' };
    }
    const distanceMeters = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      delivery.latitude,
      delivery.longitude
    );
    if (!isWithinRangeMeters(coords, delivery, DELIVERY_RANGE_METERS)) {
      return {
        ok: false,
        message: `Reach customer to deliver (${Math.round(distanceMeters)}m away, need within ${DELIVERY_RANGE_METERS}m)`,
        distanceMeters,
      };
    }
    return { ok: true, distanceMeters };
  }

  return { ok: true };
}

export function getOrderProximityForRider(riderId: string, order: any) {
  const stored = getRiderLocation(riderId);
  const rider = stored
    ? { latitude: stored.latitude, longitude: stored.longitude, fresh: isLocationFresh(riderId) }
    : null;

  const branch = extractBranchCoordinates(order.branch);
  const delivery = extractDeliveryCoordinates(order);

  let branchDistanceMeters: number | null = null;
  let deliveryDistanceMeters: number | null = null;

  if (rider && branch) {
    branchDistanceMeters = calculateDistanceMeters(
      rider.latitude,
      rider.longitude,
      branch.latitude,
      branch.longitude
    );
  }
  if (rider && delivery) {
    deliveryDistanceMeters = calculateDistanceMeters(
      rider.latitude,
      rider.longitude,
      delivery.latitude,
      delivery.longitude
    );
  }

  const status = String(order.status || '').toUpperCase();
  return {
    rider,
    branch,
    delivery,
    branchDistanceMeters,
    deliveryDistanceMeters,
    canPickUp:
      status === 'RIDER_ASSIGNED' &&
      branchDistanceMeters !== null &&
      branchDistanceMeters <= PICKUP_RANGE_METERS &&
      isLocationFresh(riderId),
    canDeliver:
      status === 'OUT_FOR_DELIVERY' &&
      deliveryDistanceMeters !== null &&
      deliveryDistanceMeters <= DELIVERY_RANGE_METERS &&
      isLocationFresh(riderId),
    pickupRangeMeters: PICKUP_RANGE_METERS,
    deliveryRangeMeters: DELIVERY_RANGE_METERS,
  };
}
