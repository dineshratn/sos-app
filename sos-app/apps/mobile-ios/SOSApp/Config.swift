import Foundation

struct Config {
    static let apiURL = "http://localhost:3000/api/v1"
    static let wsURL = "ws://localhost:3000"
    static let googleMapsAPIKey = "YOUR_GOOGLE_MAPS_API_KEY"

    // Countdown timer duration in seconds
    static let emergencyCountdownDuration = 10

    // Location tracking settings
    static let locationUpdateInterval: TimeInterval = 10.0
    static let locationAccuracyThreshold: Double = 50.0 // meters

    // Offline queue settings
    static let maxOfflineQueueSize = 100
    static let syncRetryAttempts = 3

    // Push notification settings
    static let enableCriticalAlerts = true
}
