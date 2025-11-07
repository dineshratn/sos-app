import Foundation
import CoreLocation

class LocationService: NSObject, ObservableObject {
    static let shared = LocationService()

    private let locationManager = CLLocationManager()
    @Published var currentLocation: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10
    }

    func requestPermission() {
        locationManager.requestAlwaysAuthorization()
    }

    func startTracking() {
        locationManager.startUpdatingLocation()
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
    }

    func stopTracking() {
        locationManager.stopUpdatingLocation()
    }

    func getCurrentLocation(completion: @escaping (LocationData?) -> Void) {
        guard let location = currentLocation else {
            locationManager.requestLocation()
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                if let loc = self.currentLocation {
                    completion(LocationData(
                        latitude: loc.coordinate.latitude,
                        longitude: loc.coordinate.longitude,
                        accuracy: loc.horizontalAccuracy
                    ))
                } else {
                    completion(nil)
                }
            }
            return
        }

        completion(LocationData(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            accuracy: location.horizontalAccuracy
        ))
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        DispatchQueue.main.async {
            self.currentLocation = location
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async {
            self.authorizationStatus = manager.authorizationStatus
        }
    }
}
