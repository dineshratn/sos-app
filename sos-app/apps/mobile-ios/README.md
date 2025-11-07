# SOS App - iOS Application

Emergency alert system iOS application built with SwiftUI and Swift.

## Features

- User authentication with biometric support
- Emergency trigger with countdown
- Real-time location sharing via WebSocket
- Emergency contacts management
- Medical profile management
- Emergency history
- Real-time chat during emergencies
- Background location tracking
- Push notifications
- Offline support with Core Data

## Tech Stack

- **Language**: Swift 5.9
- **UI Framework**: SwiftUI
- **Networking**: Alamofire
- **WebSocket**: Starscream
- **Location**: CoreLocation
- **Storage**: Core Data, Keychain
- **Push Notifications**: APNs
- **Bluetooth**: CoreBluetooth
- **Maps**: MapKit

## Project Structure

```
SOSApp/
├── Networking/
│   └── APIClient.swift          # HTTP client with Alamofire
├── Services/
│   ├── AuthenticationService.swift
│   ├── LocationService.swift     # CoreLocation integration
│   ├── PushNotificationService.swift
│   ├── BluetoothService.swift
│   ├── BackgroundLocationService.swift
│   ├── WebSocketManager.swift    # Starscream WebSocket
│   └── KeychainHelper.swift     # Secure token storage
├── Views/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   ├── Dashboard/
│   │   └── DashboardView.swift  # Main dashboard with SOS button
│   ├── Emergency/
│   │   ├── CountdownModalView.swift
│   │   └── ActiveEmergencyView.swift
│   ├── Contacts/
│   │   ├── ContactsListView.swift
│   │   └── ContactFormView.swift
│   ├── Medical/
│   │   └── MedicalProfileView.swift
│   ├── History/
│   │   ├── HistoryListView.swift
│   │   └── EmergencyDetailView.swift
│   ├── Chat/
│   │   └── ChatView.swift
│   ├── Components/
│   │   ├── SOSButton.swift
│   │   └── LocationMapView.swift  # MapKit integration
│   └── Devices/
│       └── DeviceListView.swift
├── Models/
│   └── Models.swift             # All data models
├── Persistence/
│   └── OfflineQueue.swift       # Core Data offline queue
└── Widgets/
    └── MedicalInfoWidget.swift  # WidgetKit for lock screen
```

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+
- CocoaPods

## Installation

1. Install dependencies:
```bash
cd apps/mobile-ios
pod install
```

2. Open workspace:
```bash
open SOSApp.xcworkspace
```

3. Configure signing in Xcode:
- Select SOSApp target
- Update Bundle Identifier
- Select your development team

4. Update Info.plist with required permissions:
- Location (Always and When In Use)
- Bluetooth
- Notifications
- Camera (for future features)

## Configuration

Create `Config.swift`:
```swift
struct Config {
    static let apiURL = "http://localhost:3000/api/v1"
    static let wsURL = "ws://localhost:3000"
    static let googleMapsAPIKey = "YOUR_API_KEY"
}
```

## Dependencies (Podfile)

```ruby
platform :ios, '16.0'

target 'SOSApp' do
  use_frameworks!

  # Networking
  pod 'Alamofire', '~> 5.8'

  # WebSocket
  pod 'Starscream', '~> 4.0'

  # Maps
  pod 'GoogleMaps'
  pod 'GooglePlaces'
end
```

## Features Implementation

### Authentication (Tasks 209-211)
- Email/password login and registration
- Face ID / Touch ID biometric authentication
- JWT token storage in Keychain
- Auto-refresh token mechanism

### Dashboard (Task 212-214)
- Main dashboard with stats cards
- Large circular SOS button with pulse animation
- Haptic feedback on button press
- Quick actions for contacts, medical profile, history

### Emergency Flow (Task 215-217)
- 10-second countdown with visual timer
- Background location tracking during emergency
- Real-time location updates via WebSocket
- MapKit integration with location trail

### Contacts Management (Tasks 219-220)
- List contacts with priority badges
- Add/edit/delete contacts
- Swipe actions for quick edit/delete
- Form validation

### Medical Profile (Tasks 221-222)
- Blood type, allergies, medications, conditions
- WidgetKit integration for lock screen display
- Privacy controls

### Emergency History (Tasks 223-224)
- List past emergencies with filters
- Detailed emergency view with timeline
- Location trail visualization
- Export functionality

### Chat (Task 225)
- Real-time messaging via WebSocket
- Message bubbles with sender identification
- Typing indicators
- Quick response buttons

### Background Services (Tasks 226-228)
- Push notifications via APNs with critical alerts
- Background location updates
- Bluetooth device pairing for wearables
- Offline queue with Core Data

### Testing (Task 231)
- UI tests with XCTest
- Unit tests for services
- Integration tests for networking

## Permissions Required

Add to Info.plist:
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SOS App needs access to your location to share it during emergencies</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>SOS App needs access to your location to share it during emergencies</string>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>SOS App needs Bluetooth to connect to emergency devices</string>

<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>remote-notification</string>
</array>
```

## Build & Run

```bash
# Build
xcodebuild -workspace SOSApp.xcworkspace -scheme SOSApp -configuration Debug

# Run tests
xcodebuild test -workspace SOSApp.xcworkspace -scheme SOSApp -destination 'platform=iOS Simulator,name=iPhone 15'
```

## License

MIT
