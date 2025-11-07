'use client';

import { useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import { Location, LocationPoint } from '@/types';

interface LocationMapProps {
  currentLocation?: Location;
  locationTrail?: LocationPoint[];
  height?: string;
  zoom?: number;
}

const mapContainerStyle = {
  width: '100%',
};

const defaultCenter = {
  lat: 37.7749, // San Francisco default
  lng: -122.4194,
};

export default function LocationMap({
  currentLocation,
  locationTrail = [],
  height = '400px',
  zoom = 15,
}: LocationMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : defaultCenter;

  const trailPath = locationTrail.map((point) => ({
    lat: point.latitude,
    lng: point.longitude,
  }));

  useEffect(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.panTo({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
    }
  }, [currentLocation]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className="bg-gray-200 flex items-center justify-center text-gray-600"
        style={{ height }}
      >
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p>Google Maps API key not configured</p>
          <p className="text-sm mt-2">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={center}
        zoom={zoom}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            position={{
              lat: currentLocation.latitude,
              lng: currentLocation.longitude,
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="Current Location"
          />
        )}

        {/* Location trail */}
        {trailPath.length > 1 && (
          <Polyline
            path={trailPath}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        )}

        {/* Trail start marker */}
        {trailPath.length > 0 && (
          <Marker
            position={trailPath[0]}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="Start Location"
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
}
