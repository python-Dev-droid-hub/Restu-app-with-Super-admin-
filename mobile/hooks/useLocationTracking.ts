import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api } from '../components/api/client';

const UPDATE_INTERVAL_MS = 10_000;

export function useLocationTracking(enabled: boolean) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
      setError(null);

      await api.put('/users/rider/location', { latitude, longitude });
      return { latitude, longitude };
    } catch (e: any) {
      setError(e?.message || 'GPS unavailable');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    void pushLocation();
    intervalRef.current = setInterval(() => {
      void pushLocation();
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pushLocation]);

  return { coords, permission, error, refreshLocation: pushLocation };
}
