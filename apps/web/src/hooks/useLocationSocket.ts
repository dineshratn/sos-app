'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Location } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

interface LocationUpdateEvent {
  userId: string;
  location: Location;
  timestamp: string;
}

export function useLocationSocket(emergencyId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!emergencyId) return;

    const token = Cookies.get('auth_token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    // Create socket connection
    const newSocket = io(`${WS_URL}/location`, {
      path: '/ws/location',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Location WebSocket connected');
      setConnected(true);
      setError(null);

      // Join emergency room
      newSocket.emit('join-emergency', { emergencyId });
    });

    newSocket.on('disconnect', () => {
      console.log('Location WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Location WebSocket error:', err);
      setError('Failed to connect to location service');
      setConnected(false);
    });

    newSocket.on('location-update', (data: LocationUpdateEvent) => {
      console.log('Location update received:', data);
      setCurrentLocation(data.location);
    });

    newSocket.on('error', (err) => {
      console.error('Location socket error:', err);
      setError(err.message || 'Location service error');
    });

    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-emergency', { emergencyId });
        socketRef.current.disconnect();
      }
    };
  }, [emergencyId]);

  const sendLocationUpdate = useCallback(
    (location: Location) => {
      if (socket && connected && emergencyId) {
        socket.emit('location-update', {
          emergencyId,
          ...location,
        });
      }
    },
    [socket, connected, emergencyId]
  );

  return {
    connected,
    currentLocation,
    sendLocationUpdate,
    error,
  };
}
