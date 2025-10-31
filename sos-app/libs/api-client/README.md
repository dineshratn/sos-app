# @sos-app/api-client

HTTP API client library for SOS App with Axios integration, request/response interceptors, automatic retry logic, and comprehensive error handling.

## Features

- ✅ **Axios Integration**: Built on top of Axios for reliable HTTP requests
- ✅ **Type Safety**: Full TypeScript support with typed API methods
- ✅ **Interceptors**: Request/response interceptors for auth, logging, and transformations
- ✅ **Error Handling**: Automatic error formatting and retry logic
- ✅ **Authentication**: Built-in token management (Bearer token)
- ✅ **Retry Logic**: Exponential backoff for failed requests
- ✅ **Logging**: Request/response logging with sensitive data redaction
- ✅ **File Upload/Download**: Helper methods for file operations
- ✅ **Typed Endpoints**: Pre-configured API methods for all SOS App endpoints

## Installation

```bash
npm install @sos-app/api-client axios
```

**Note**: Axios is a required peer dependency.

## Usage

### Basic Setup

```typescript
import axios from 'axios';
import { createApiClient, initializeDefaultClient } from '@sos-app/api-client';
import { createLogger } from '@sos-app/shared';

// Create logger (optional)
const logger = createLogger('api-client');

// Initialize default client
initializeDefaultClient(axios, {
  baseURL: 'https://api.sos-app.com/api/v1',
  timeout: 30000,
  enableLogging: true,
});

// Or create a custom client
const apiClient = createApiClient({
  baseURL: 'https://api.sos-app.com/api/v1',
  timeout: 30000,
}, logger);

// Initialize with Axios
apiClient.initializeWithAxios(axios);
```

### Using Typed API Endpoints

```typescript
import { getApiClient, createSosApiClient } from '@sos-app/api-client';

// Get the initialized client
const client = getApiClient();
const api = createSosApiClient(client);

// Authentication
const { data } = await api.auth.login({
  identifier: 'user@example.com',
  password: 'password123',
});

// Set token for subsequent requests
api.setToken(data.accessToken);

// User profile
const profile = await api.user.getProfile();
console.log(profile.data);

// Trigger emergency
const emergency = await api.emergency.triggerEmergency({
  emergencyType: 'MEDICAL',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  },
  message: 'Need immediate help',
});

// Update location
await api.location.updateLocation({
  emergencyId: emergency.data.id,
  latitude: 37.7750,
  longitude: -122.4195,
  accuracy: 8,
});

// Get emergency contacts
const contacts = await api.user.getEmergencyContacts();

// Medical profile
await api.medical.addAllergy({
  allergen: 'Peanuts',
  severity: 'LIFE_THREATENING',
  reaction: 'Anaphylaxis',
});
```

### Direct HTTP Methods

```typescript
import { getApiClient } from '@sos-app/api-client';

const client = getApiClient();

// GET request
const response = await client.get('/users/me');

// POST request
const newUser = await client.post('/users', {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
});

// PUT request
await client.put('/users/123', { firstName: 'Jane' });

// PATCH request
await client.patch('/users/123', { lastName: 'Smith' });

// DELETE request
await client.delete('/users/123');
```

### File Upload

```typescript
const client = getApiClient();

// Upload file
const file = document.getElementById('fileInput').files[0];
const response = await client.upload('/emergency/123/media', file, 'image', {
  description: 'Photo of situation',
});

// Or use the communication API
const api = createSosApiClient(client);
await api.communication.uploadMedia('emergency-id', file);
```

### File Download

```typescript
const client = getApiClient();

// Download file
await client.download('/emergency/123/export?format=pdf', 'emergency-report.pdf');

// Or use the emergency API
const api = createSosApiClient(client);
await api.emergency.exportReport('emergency-id', 'pdf');
```

### Authentication Token Management

```typescript
import { getApiClient } from '@sos-app/api-client';

const client = getApiClient();

// Set token
client.setToken('your-jwt-token');

// Or using the SOS API client
const api = createSosApiClient(client);
api.setToken('your-jwt-token');

// Clear token (logout)
api.clearToken();
```

### Configuration

```typescript
import { createApiClient } from '@sos-app/api-client';

const client = createApiClient({
  // Base URL for API requests
  baseURL: 'https://api.sos-app.com/api/v1',

  // Request timeout in milliseconds
  timeout: 30000,

  // Enable request/response logging
  enableLogging: true,

  // Enable automatic retries
  enableRetry: true,

  // Maximum retry attempts
  maxRetries: 3,

  // Retry delay in milliseconds
  retryDelay: 1000,

  // Custom headers
  headers: {
    'X-App-Version': '1.0.0',
  },

  // Authentication token
  token: 'your-jwt-token',

  // Token type (default: 'Bearer')
  tokenType: 'Bearer',

  // Include credentials (cookies)
  withCredentials: false,
});
```

### Update Configuration at Runtime

```typescript
const client = getApiClient();

client.updateConfig({
  baseURL: 'https://api-staging.sos-app.com/api/v1',
  timeout: 60000,
});
```

## Available API Endpoints

### Authentication (`api.auth`)
- `register(data)` - Register new user
- `login(credentials)` - Login with email/password
- `loginWithSocial(provider, token)` - Social authentication
- `refreshToken(refreshToken)` - Refresh access token
- `logout()` - Logout
- `requestPasswordReset(email)` - Request password reset
- `resetPassword(token, newPassword)` - Reset password
- `changePassword(oldPassword, newPassword)` - Change password

### User (`api.user`)
- `getProfile()` - Get current user profile
- `updateProfile(data)` - Update user profile
- `deleteAccount()` - Delete user account
- `getEmergencyContacts()` - Get emergency contacts
- `addEmergencyContact(contact)` - Add emergency contact
- `updateEmergencyContact(id, data)` - Update contact
- `deleteEmergencyContact(id)` - Delete contact

### Emergency (`api.emergency`)
- `triggerEmergency(data)` - Trigger emergency alert
- `getEmergency(id)` - Get emergency details
- `cancelEmergency(id, reason)` - Cancel emergency
- `resolveEmergency(id, notes)` - Resolve emergency
- `acknowledgeEmergency(id, data)` - Acknowledge as contact
- `getHistory(filters)` - Get emergency history
- `exportReport(id, format)` - Export emergency report

### Location (`api.location`)
- `updateLocation(data)` - Update location
- `getLocationTrail(emergencyId, params)` - Get location trail
- `getCurrentLocation(emergencyId)` - Get current location

### Medical (`api.medical`)
- `getProfile()` - Get medical profile
- `updateProfile(data)` - Update medical profile
- `getProfileByUserId(userId)` - Get profile for authorized user
- `addAllergy(data)` - Add allergy
- `updateAllergy(id, data)` - Update allergy
- `deleteAllergy(id)` - Delete allergy
- `addMedication(data)` - Add medication
- `updateMedication(id, data)` - Update medication
- `deleteMedication(id)` - Delete medication
- `addCondition(data)` - Add medical condition
- `updateCondition(id, data)` - Update condition
- `deleteCondition(id)` - Delete condition

### Device (`api.device`)
- `getDevices()` - Get user devices
- `pairDevice(data)` - Pair new device
- `unpairDevice(id)` - Unpair device
- `updateDeviceSettings(id, settings)` - Update device settings
- `getDeviceStatus(id)` - Get device status

### Communication (`api.communication`)
- `sendMessage(emergencyId, message)` - Send message
- `getMessages(emergencyId, params)` - Get message history
- `uploadMedia(emergencyId, file)` - Upload media

## Error Handling

The API client automatically handles errors and transforms them into a standard format:

```typescript
import { getApiClient, createSosApiClient } from '@sos-app/api-client';

const client = getApiClient();
const api = createSosApiClient(client);

try {
  await api.auth.login({ identifier: 'user@example.com', password: 'wrong' });
} catch (error) {
  // Error is automatically formatted
  console.error(error.message); // "Invalid credentials"
  console.error(error.code); // "AUTHENTICATION_ERROR"
  console.error(error.statusCode); // 401
  console.error(error.response); // Full API error response
}
```

## Retry Logic

Failed requests are automatically retried with exponential backoff:

- **Retryable status codes**: 408, 429, 500, 502, 503, 504
- **Max attempts**: 3
- **Initial delay**: 1 second
- **Max delay**: 10 seconds
- **Backoff multiplier**: 2x

Network errors are also retried automatically.

## Request/Response Logging

When logging is enabled, all requests and responses are logged:

```
[2025-10-29T03:00:00.000Z] [HTTP] [api-client] API Request {
  method: "POST",
  url: "/auth/login",
  params: {},
  headers: { Authorization: "[REDACTED]" }
}

[2025-10-29T03:00:01.000Z] [HTTP] [api-client] API Response {
  method: "POST",
  url: "/auth/login",
  status: 200,
  statusText: "OK"
}
```

Sensitive headers (Authorization, Cookie, X-API-Key) are automatically redacted.

## Best Practices

1. **Initialize once**: Initialize the API client once at app startup
2. **Use typed endpoints**: Use the `SosApiClient` for type safety
3. **Handle errors**: Always wrap API calls in try-catch blocks
4. **Manage tokens**: Set/clear tokens appropriately on login/logout
5. **Use logger**: Pass a logger instance for better debugging

## Dependencies

- **Axios** (^1.6.0) - Required peer dependency
- **@sos-app/shared** (^1.0.0) - Required for types and utilities

## License

MIT
