# SOS App - Android Application

Emergency alert system Android application built with Kotlin, Jetpack Compose, and Material Design 3.

## Features

- User authentication with biometric support (fingerprint/face unlock)
- Emergency trigger with countdown
- Real-time location sharing via WebSocket
- Emergency contacts management
- Medical profile management
- Emergency history
- Real-time chat during emergencies
- Background location tracking with foreground service
- Push notifications via Firebase Cloud Messaging
- Offline support with Room Database
- Google Maps integration

## Tech Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Architecture**: MVVM with Clean Architecture
- **Dependency Injection**: Hilt/Dagger
- **Networking**: Retrofit + OkHttp
- **WebSocket**: Socket.IO Client
- **Database**: Room
- **Storage**: DataStore + EncryptedSharedPreferences
- **Location**: Google Play Services Location
- **Maps**: Google Maps Compose
- **Push Notifications**: Firebase Cloud Messaging
- **Image Loading**: Coil

## Project Structure

```
app/src/main/java/com/sosapp/android/
├── data/
│   ├── models/
│   │   └── Models.kt              # Data classes and enums
│   ├── remote/
│   │   ├── ApiClient.kt           # Retrofit API service
│   │   └── WebSocketManager.kt   # Socket.IO WebSocket client
│   ├── local/
│   │   ├── dao/                   # Room DAOs
│   │   ├── database/              # Room database
│   │   └── OfflineQueue.kt        # Offline request queue
│   └── repository/                # Repository pattern implementations
├── domain/
│   ├── usecase/                   # Business logic use cases
│   └── repository/                # Repository interfaces
├── ui/
│   ├── screens/
│   │   ├── LoginScreen.kt         # Login UI
│   │   ├── DashboardScreen.kt     # Main dashboard
│   │   ├── ActiveEmergencyScreen.kt
│   │   ├── ContactsScreen.kt
│   │   ├── MedicalProfileScreen.kt
│   │   ├── HistoryScreen.kt
│   │   ├── ChatScreen.kt
│   │   └── SettingsScreen.kt
│   ├── components/                # Reusable UI components
│   └── theme/
│       ├── Theme.kt               # Material 3 theming
│       └── Type.kt                # Typography
├── services/
│   ├── LocationTrackingService.kt # Foreground location service
│   └── FirebaseMessagingService.kt # FCM push notifications
├── utils/                         # Utility classes
├── di/                            # Dependency injection modules
├── MainActivity.kt                # Main activity
└── SOSApplication.kt              # Application class

## Requirements

- Android 8.0 (API 26) or higher
- Android Studio Hedgehog (2023.1.1) or later
- Kotlin 1.9+
- Gradle 8.0+

## Installation

1. Clone the repository:
```bash
cd apps/mobile-android
```

2. Open the project in Android Studio

3. Create `local.properties` file in the root directory:
```properties
sdk.dir=/path/to/Android/sdk
MAPS_API_KEY=your_google_maps_api_key_here
```

4. Add `google-services.json` for Firebase:
   - Download from Firebase Console
   - Place in `app/` directory

5. Sync Gradle and build the project

## Configuration

Update API endpoints in `ApiClient.kt`:
```kotlin
private const val BASE_URL = "http://10.0.2.2:3000/api/v1/" // For emulator
// Use actual IP for physical device: "http://192.168.x.x:3000/api/v1/"
```

## Dependencies

Key dependencies from `build.gradle.kts`:

```kotlin
// Core
implementation("androidx.core:core-ktx:1.12.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")

// Compose
implementation(platform("androidx.compose:compose-bom:2023.10.01"))
implementation("androidx.compose.material3:material3")

// Networking
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("io.socket:socket.io-client:2.1.0")

// Database
implementation("androidx.room:room-ktx:2.6.0")

// Maps & Location
implementation("com.google.android.gms:play-services-maps:18.2.0")
implementation("com.google.maps.android:maps-compose:4.1.1")

// Firebase
implementation(platform("com.google.firebase:firebase-bom:32.5.0"))
implementation("com.google.firebase:firebase-messaging-ktx")

// Dependency Injection
implementation("com.google.dagger:hilt-android:2.48")
```

## Features Implementation

### Authentication (Tasks 232-234)
- Email/password login and registration
- Biometric authentication (fingerprint/face unlock)
- JWT token storage in EncryptedSharedPreferences
- Auto-refresh token mechanism

### Dashboard (Tasks 235-237)
- Main dashboard with stats cards
- Large circular SOS button with pulse animation
- Haptic feedback on button press
- Quick actions for contacts, medical profile, history

### Emergency Flow (Tasks 238-240)
- 10-second countdown dialog
- Background location tracking via foreground service
- Real-time location updates via WebSocket
- Google Maps integration with location trail

### Contacts Management (Tasks 242-243)
- List contacts with priority badges
- Add/edit/delete contacts
- Swipe-to-delete actions
- Form validation

### Medical Profile (Tasks 244-245)
- Blood type, allergies, medications, conditions
- Quick-add buttons for common conditions
- Privacy controls

### Emergency History (Tasks 246-247)
- List past emergencies with filters
- Detailed emergency view with timeline
- Location trail visualization
- Export functionality (PDF)

### Chat (Task 248)
- Real-time messaging via WebSocket
- Message bubbles with delivery/read status
- Typing indicators
- Quick response buttons

### Background Services (Tasks 249-251)
- Push notifications via FCM with critical alerts
- Background location updates with foreground service
- Bluetooth device pairing for wearables
- Offline queue with Room database

### Testing (Task 254)
- Instrumented tests with Espresso
- Unit tests for ViewModels
- Integration tests for repositories

## Permissions

Required permissions in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

## Build & Run

```bash
# Build debug APK
./gradlew assembleDebug

# Run on connected device/emulator
./gradlew installDebug

# Run tests
./gradlew test
./gradlew connectedAndroidTest
```

## Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Add Android app with package name `com.sosapp.android`
3. Download `google-services.json` and place in `app/` directory
4. Enable Firebase Cloud Messaging in Firebase Console

## Google Maps Setup

1. Get API key from Google Cloud Console
2. Enable Maps SDK for Android
3. Add key to `local.properties`:
   ```
   MAPS_API_KEY=your_api_key_here
   ```

## License

MIT
