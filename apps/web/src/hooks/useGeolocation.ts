'use client';

import { useState, useEffect, useCallback } from 'react';
import { Location } from '@/types';

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (!navigator.permissions) {
      setPermission('granted'); // Assume granted if API not available
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as any });
      setPermission(result.state);

      result.addEventListener('change', () => {
        setPermission(result.state);
      });
    } catch (err) {
      console.error('Failed to check geolocation permission:', err);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return false;
    }

    setLoading(true);
    setError(null);

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setPermission('granted');
          setLoading(false);
          resolve(true);
        },
        (err) => {
          setError(err.message);
          setPermission('denied');
          setLoading(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<Location | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const watchLocation = useCallback((callback: (location: Location) => void) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(loc);
        callback(loc);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return watchId;
  }, []);

  const stopWatching = useCallback((watchId: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  return {
    location,
    error,
    loading,
    permission,
    requestPermission,
    getCurrentLocation,
    watchLocation,
    stopWatching,
  };
}
