import SwiftUI
import Combine
import MapKit

class ActiveEmergencyViewModel: ObservableObject {
    @Published var emergency: Emergency?
    @Published var currentLocation: LocationPoint?
    @Published var locationTrail: [LocationPoint] = []
    @Published var acknowledgments: [ContactAcknowledgment] = []
    @Published var isActive: Bool = true
    @Published var isConnected: Bool = false
    @Published var elapsedTime: String = "00:00"
    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )

    private let emergencyId: String
    private var webSocketManager: WebSocketManager?
    private var locationService: LocationService?
    private var timer: Timer?
    private var startTime: Date?
    private var cancellables = Set<AnyCancellable>()

    init(emergencyId: String) {
        self.emergencyId = emergencyId
        setupServices()
        fetchEmergencyDetails()
    }

    private func setupServices() {
        webSocketManager = WebSocketManager()
        locationService = LocationService()

        // Observe location updates
        locationService?.objectWillChange
            .sink { [weak self] _ in
                self?.handleLocationUpdate()
            }
            .store(in: &cancellables)
    }

    func connect() {
        webSocketManager?.connect(emergencyId: emergencyId)
        webSocketManager?.onLocationUpdate = { [weak self] location in
            self?.handleRemoteLocationUpdate(location)
        }
        webSocketManager?.onAcknowledgment = { [weak self] ack in
            self?.handleAcknowledgment(ack)
        }
        webSocketManager?.onConnectionChange = { [weak self] connected in
            self?.isConnected = connected
        }

        locationService?.startTracking()
        startTimer()
    }

    func disconnect() {
        webSocketManager?.disconnect()
        locationService?.stopTracking()
        timer?.invalidate()
    }

    private func fetchEmergencyDetails() {
        // Fetch emergency from API
        APIClient.shared.getEmergency(id: emergencyId) { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let emergency):
                self.emergency = emergency
                self.isActive = emergency.status == .active
                self.startTime = emergency.createdAt

                // Center map on emergency location
                if let lat = emergency.location?.latitude,
                   let lng = emergency.location?.longitude {
                    self.mapRegion.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                }
            case .failure(let error):
                print("Failed to fetch emergency: \(error)")
            }
        }

        // Fetch acknowledgments
        fetchAcknowledgments()
    }

    private func fetchAcknowledgments() {
        // Mock data - replace with API call
        acknowledgments = [
            ContactAcknowledgment(
                id: "1",
                contactName: "John Doe",
                acknowledged: true,
                acknowledgedAt: Date().addingTimeInterval(-120)
            ),
            ContactAcknowledgment(
                id: "2",
                contactName: "Jane Smith",
                acknowledged: false,
                acknowledgedAt: nil
            ),
            ContactAcknowledgment(
                id: "3",
                contactName: "Bob Johnson",
                acknowledged: true,
                acknowledgedAt: Date().addingTimeInterval(-60)
            )
        ]
    }

    private func handleLocationUpdate() {
        guard let location = locationService?.currentLocation else { return }

        let locationPoint = LocationPoint(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            accuracy: location.horizontalAccuracy,
            timestamp: Date()
        )

        currentLocation = locationPoint
        locationTrail.append(locationPoint)

        // Update map region
        mapRegion.center = location.coordinate

        // Send to server via WebSocket
        webSocketManager?.sendLocationUpdate(location: locationPoint)
    }

    private func handleRemoteLocationUpdate(_ location: LocationPoint) {
        currentLocation = location
        locationTrail.append(location)

        mapRegion.center = CLLocationCoordinate2D(
            latitude: location.latitude,
            longitude: location.longitude
        )
    }

    private func handleAcknowledgment(_ ack: Any) {
        // Update acknowledgments list
        fetchAcknowledgments()
    }

    private func startTimer() {
        startTime = emergency?.createdAt ?? Date()

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.startTime else { return }

            let elapsed = Date().timeIntervalSince(startTime)
            let minutes = Int(elapsed) / 60
            let seconds = Int(elapsed) % 60

            self.elapsedTime = String(format: "%02d:%02d", minutes, seconds)
        }
    }

    func resolveEmergency() {
        APIClient.shared.resolveEmergency(id: emergencyId) { [weak self] result in
            switch result {
            case .success:
                self?.isActive = false
                self?.disconnect()
            case .failure(let error):
                print("Failed to resolve emergency: \(error)")
            }
        }
    }
}

struct LocationPoint: Identifiable {
    let id = UUID()
    let latitude: Double
    let longitude: Double
    let accuracy: Double
    let timestamp: Date
}
