/**
 * Location tracking and geospatial type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, Location, LocationProvider } from './common';

/**
 * Location update request
 */
export interface LocationUpdate {
  /** Emergency ID being tracked */
  emergencyId: UUID;
  /** User ID */
  userId: UUID;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters (optional) */
  altitude?: number;
  /** Speed in meters per second (optional) */
  speed?: number;
  /** Heading in degrees (optional) */
  heading?: number;
  /** Location provider */
  provider: LocationProvider;
  /** Timestamp of location capture */
  timestamp: Timestamp;
  /** Device battery level (optional) */
  batteryLevel?: number;
}

/**
 * Stored location point (time-series data)
 */
export interface StoredLocationPoint {
  /** Location point ID */
  id: string;
  /** Emergency ID */
  emergencyId: UUID;
  /** User ID */
  userId: UUID;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters */
  altitude?: number;
  /** Speed in m/s */
  speed?: number;
  /** Heading in degrees */
  heading?: number;
  /** Location provider */
  provider: LocationProvider;
  /** Reverse geocoded address */
  address?: string;
  /** Timestamp */
  timestamp: Timestamp;
  /** Battery level */
  batteryLevel?: number;
}

/**
 * Location trail request parameters
 */
export interface LocationTrailParams {
  /** Emergency ID */
  emergencyId: UUID;
  /** Duration to retrieve (e.g., "30 minutes", "1 hour") */
  duration?: string;
  /** Start time */
  startTime?: Timestamp;
  /** End time */
  endTime?: Timestamp;
  /** Maximum number of points */
  limit?: number;
}

/**
 * Location trail response
 */
export interface LocationTrail {
  /** Emergency ID */
  emergencyId: UUID;
  /** Array of location points */
  points: StoredLocationPoint[];
  /** Total distance traveled (meters) */
  totalDistance: number;
  /** Average speed (m/s) */
  averageSpeed: number;
  /** Duration of trail */
  duration: number;
  /** Start time */
  startTime: Timestamp;
  /** End time */
  endTime: Timestamp;
}

/**
 * Location statistics for an emergency
 */
export interface LocationStats {
  /** Emergency ID */
  emergencyId: UUID;
  /** Total location points */
  totalPoints: number;
  /** Average accuracy (meters) */
  averageAccuracy: number;
  /** Minimum accuracy (meters) */
  minAccuracy: number;
  /** Maximum accuracy (meters) */
  maxAccuracy: number;
  /** Distance traveled (meters) */
  distanceTraveled: number;
  /** Average speed (m/s) */
  averageSpeed: number;
  /** Provider breakdown */
  providerBreakdown: Record<LocationProvider, number>;
}

/**
 * Geofence definition
 */
export interface Geofence {
  /** Geofence ID */
  id: UUID;
  /** Name/label */
  name: string;
  /** Description */
  description?: string;
  /** Center point */
  center: Location;
  /** Radius in meters */
  radius: number;
  /** Created by user ID */
  createdBy: UUID;
  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * Geofence event types
 */
export enum GeofenceEventType {
  ENTER = 'ENTER',
  EXIT = 'EXIT',
  DWELL = 'DWELL',
}

/**
 * Geofence event
 */
export interface GeofenceEvent {
  /** Event ID */
  id: UUID;
  /** Geofence ID */
  geofenceId: UUID;
  /** User ID */
  userId: UUID;
  /** Emergency ID (if applicable) */
  emergencyId?: UUID;
  /** Event type */
  eventType: GeofenceEventType;
  /** Location when event occurred */
  location: Location;
  /** Event timestamp */
  timestamp: Timestamp;
}

/**
 * Reverse geocoding request
 */
export interface ReverseGeocodeRequest {
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Language for address */
  language?: string;
}

/**
 * Reverse geocoding response
 */
export interface ReverseGeocodeResponse {
  /** Formatted address */
  formattedAddress: string;
  /** Street address */
  streetAddress?: string;
  /** City */
  city?: string;
  /** State/province */
  state?: string;
  /** Country */
  country?: string;
  /** Postal code */
  postalCode?: string;
  /** Place ID (from provider) */
  placeId?: string;
}

/**
 * Proximity search request
 */
export interface ProximitySearchRequest {
  /** Center location */
  center: Location;
  /** Search radius in meters */
  radius: number;
  /** Type of places to search for */
  type?: PlaceType[];
  /** Maximum results */
  limit?: number;
}

/**
 * Place types for proximity search
 */
export enum PlaceType {
  HOSPITAL = 'HOSPITAL',
  POLICE_STATION = 'POLICE_STATION',
  FIRE_STATION = 'FIRE_STATION',
  PHARMACY = 'PHARMACY',
  EMERGENCY_SERVICES = 'EMERGENCY_SERVICES',
}

/**
 * Nearby place result
 */
export interface NearbyPlace {
  /** Place ID */
  id: string;
  /** Place name */
  name: string;
  /** Place type */
  type: PlaceType;
  /** Location */
  location: Location;
  /** Distance from search center (meters) */
  distance: number;
  /** Address */
  address: string;
  /** Phone number */
  phoneNumber?: string;
  /** Rating (1-5) */
  rating?: number;
  /** Is currently open */
  isOpen?: boolean;
}

/**
 * Route calculation request
 */
export interface RouteRequest {
  /** Starting location */
  origin: Location;
  /** Destination location */
  destination: Location;
  /** Travel mode */
  mode?: TravelMode;
  /** Avoid tolls */
  avoidTolls?: boolean;
  /** Avoid highways */
  avoidHighways?: boolean;
}

/**
 * Travel modes
 */
export enum TravelMode {
  DRIVING = 'DRIVING',
  WALKING = 'WALKING',
  BICYCLING = 'BICYCLING',
  TRANSIT = 'TRANSIT',
}

/**
 * Route response
 */
export interface Route {
  /** Route summary */
  summary: string;
  /** Total distance in meters */
  distance: number;
  /** Estimated duration in seconds */
  duration: number;
  /** Polyline encoded route */
  polyline: string;
  /** Route legs/steps */
  legs: RouteLeg[];
  /** Start location */
  startLocation: Location;
  /** End location */
  endLocation: Location;
}

/**
 * Route leg (segment of a route)
 */
export interface RouteLeg {
  /** Distance in meters */
  distance: number;
  /** Duration in seconds */
  duration: number;
  /** Start location */
  startLocation: Location;
  /** End location */
  endLocation: Location;
  /** Step-by-step instructions */
  steps: RouteStep[];
}

/**
 * Route step (individual instruction)
 */
export interface RouteStep {
  /** Distance in meters */
  distance: number;
  /** Duration in seconds */
  duration: number;
  /** HTML formatted instruction */
  instruction: string;
  /** Travel mode for this step */
  travelMode: TravelMode;
  /** Start location */
  startLocation: Location;
  /** End location */
  endLocation: Location;
}

/**
 * Location sharing session
 */
export interface LocationSharingSession {
  /** Session ID */
  id: UUID;
  /** User ID sharing location */
  userId: UUID;
  /** Emergency ID (if applicable) */
  emergencyId?: UUID;
  /** Session status */
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  /** Update interval in seconds */
  updateInterval: number;
  /** Session started timestamp */
  startedAt: Timestamp;
  /** Session ended timestamp */
  endedAt?: Timestamp;
}

/**
 * Location accuracy levels
 */
export enum LocationAccuracy {
  HIGH = 'HIGH',       // < 10 meters
  MEDIUM = 'MEDIUM',   // 10-50 meters
  LOW = 'LOW',         // > 50 meters
}

/**
 * Location validation result
 */
export interface LocationValidation {
  /** Is valid */
  valid: boolean;
  /** Accuracy level */
  accuracyLevel: LocationAccuracy;
  /** Validation errors */
  errors?: string[];
  /** Warnings */
  warnings?: string[];
}
