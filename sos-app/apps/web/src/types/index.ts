// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

// Emergency types
export enum EmergencyType {
  MEDICAL = 'MEDICAL',
  ACCIDENT = 'ACCIDENT',
  CRIME = 'CRIME',
  FIRE = 'FIRE',
  NATURAL_DISASTER = 'NATURAL_DISASTER',
  OTHER = 'OTHER',
}

export enum EmergencyStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export interface Emergency {
  id: string;
  userId: string;
  type: EmergencyType;
  status: EmergencyStatus;
  description?: string;
  triggeredAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
  location?: Location;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface LocationPoint {
  emergencyId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

// Contact types
export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactAcknowledgment {
  contactId: string;
  contactName: string;
  acknowledgedAt: string;
}

// Medical profile types
export interface MedicalProfile {
  id: string;
  userId: string;
  bloodType?: string;
  allergies?: string[];
  medications?: Medication[];
  conditions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency?: string;
}

// Message types
export interface Message {
  id: string;
  emergencyId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  delivered: boolean;
  read: boolean;
}

// WebSocket event types
export interface LocationUpdateEvent {
  emergencyId: string;
  userId: string;
  location: Location;
}

export interface MessageEvent {
  emergencyId: string;
  message: Message;
}

export interface TypingEvent {
  emergencyId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
