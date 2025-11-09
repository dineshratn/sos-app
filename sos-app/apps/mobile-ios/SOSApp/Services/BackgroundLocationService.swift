import Foundation
import CoreLocation

class BackgroundLocationService: NSObject, ObservableObject {
    static let shared = BackgroundLocationService()

    private let locationManager = CLLocationManager()
    @Published var isTracking = false

    var onLocationUpdate: ((CLLocation) -> Void)?

    private override init() {
        super.init()
        setupLocationManager()
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10 // Update every 10 meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
    }

    func startBackgroundTracking() {
        guard CLLocationManager.locationServicesEnabled() else {
            print("Location services not enabled")
            return
        }

        let status = CLLocationManager.authorizationStatus()
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            locationManager.startUpdatingLocation()
            locationManager.startMonitoringSignificantLocationChanges()
            isTracking = true
        } else {
            locationManager.requestAlwaysAuthorization()
        }
    }

    func stopBackgroundTracking() {
        locationManager.stopUpdatingLocation()
        locationManager.stopMonitoringSignificantLocationChanges()
        isTracking = false
    }
}

extension BackgroundLocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        print("Background location update: \(location.coordinate.latitude), \(location.coordinate.longitude)")

        // Call callback
        onLocationUpdate?(location)

        // Send to server or queue if offline
        sendLocationUpdate(location)
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            startBackgroundTracking()
        case .denied, .restricted:
            print("Location access denied")
            stopBackgroundTracking()
        case .notDetermined:
            manager.requestAlwaysAuthorization()
        @unknown default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager error: \(error.localizedDescription)")
    }

    private func sendLocationUpdate(_ location: CLLocation) {
        let locationPoint = LocationPoint(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            accuracy: location.horizontalAccuracy,
            timestamp: location.timestamp
        )

        // Try to send via WebSocket or queue for later
        // WebSocketManager.shared.sendLocationUpdate(location: locationPoint)
        // If offline, use OfflineQueue
    }
}
