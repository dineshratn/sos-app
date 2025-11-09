import SwiftUI
import MapKit

struct EmergencyDetailView: View {
    @StateObject private var viewModel: EmergencyDetailViewModel

    init(emergencyId: String) {
        _viewModel = StateObject(wrappedValue: EmergencyDetailViewModel(emergencyId: emergencyId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Map with location trail
                if let currentLocation = viewModel.currentLocation {
                    LocationMapView(
                        currentLocation: currentLocation,
                        locationTrail: viewModel.locationTrail,
                        region: .constant(MKCoordinateRegion(
                            center: CLLocationCoordinate2D(
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude
                            ),
                            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                        ))
                    )
                    .frame(height: 250)
                    .cornerRadius(12)
                    .padding(.horizontal)
                }

                // Emergency Summary
                VStack(spacing: 15) {
                    SummaryCard(title: "Duration", value: viewModel.duration, icon: "clock.fill", color: .blue)
                    SummaryCard(title: "Contacts Notified", value: "\(viewModel.contactsNotified)", icon: "person.2.fill", color: .orange)
                    SummaryCard(title: "Location Updates", value: "\(viewModel.locationTrail.count)", icon: "location.fill", color: .green)
                }
                .padding(.horizontal)

                // Timeline
                VStack(alignment: .leading, spacing: 0) {
                    Text("Timeline")
                        .font(.headline)
                        .padding(.horizontal)
                        .padding(.bottom, 10)

                    ForEach(viewModel.timelineEvents) { event in
                        TimelineEventRow(event: event, isLast: event.id == viewModel.timelineEvents.last?.id)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.05), radius: 5)
                .padding(.horizontal)

                // Export Button
                Button(action: {
                    viewModel.exportToPDF()
                }) {
                    Label("Export to PDF", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .navigationTitle("Emergency Details")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.fetchDetails()
        }
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 44, height: 44)
                .background(color.opacity(0.1))
                .cornerRadius(8)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.title3)
                    .fontWeight(.semibold)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5)
    }
}

struct TimelineEventRow: View {
    let event: TimelineEvent
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            VStack {
                Circle()
                    .fill(event.color)
                    .frame(width: 12, height: 12)

                if !isLast {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 2)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: event.icon)
                        .foregroundColor(event.color)
                    Text(event.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }

                Text(event.description)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(formatTime(event.timestamp))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(.bottom, isLast ? 0 : 20)
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct TimelineEvent: Identifiable {
    let id = UUID()
    let timestamp: Date
    let title: String
    let description: String
    let icon: String
    let color: Color
}

class EmergencyDetailViewModel: ObservableObject {
    @Published var emergency: Emergency?
    @Published var currentLocation: LocationPoint?
    @Published var locationTrail: [LocationPoint] = []
    @Published var timelineEvents: [TimelineEvent] = []
    @Published var duration: String = ""
    @Published var contactsNotified: Int = 0

    private let emergencyId: String

    init(emergencyId: String) {
        self.emergencyId = emergencyId
    }

    func fetchDetails() {
        // Mock data - replace with API call
        let createdAt = Date().addingTimeInterval(-3600)
        let resolvedAt = Date().addingTimeInterval(-3000)

        emergency = Emergency(
            id: emergencyId,
            userId: "user1",
            type: .medical,
            status: .resolved,
            location: nil,
            notes: "Emergency details",
            createdAt: createdAt,
            updatedAt: resolvedAt,
            resolvedAt: resolvedAt
        )

        currentLocation = LocationPoint(
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10.0,
            timestamp: Date()
        )

        locationTrail = [
            LocationPoint(latitude: 37.7749, longitude: -122.4194, accuracy: 10.0, timestamp: createdAt),
            LocationPoint(latitude: 37.7750, longitude: -122.4195, accuracy: 10.0, timestamp: createdAt.addingTimeInterval(60)),
            LocationPoint(latitude: 37.7751, longitude: -122.4196, accuracy: 10.0, timestamp: createdAt.addingTimeInterval(120))
        ]

        timelineEvents = [
            TimelineEvent(
                timestamp: createdAt,
                title: "Emergency Triggered",
                description: "Medical emergency initiated",
                icon: "exclamationmark.triangle.fill",
                color: .red
            ),
            TimelineEvent(
                timestamp: createdAt.addingTimeInterval(5),
                title: "Contacts Notified",
                description: "3 emergency contacts alerted",
                icon: "bell.fill",
                color: .orange
            ),
            TimelineEvent(
                timestamp: createdAt.addingTimeInterval(120),
                title: "Contact Acknowledged",
                description: "John Doe acknowledged emergency",
                icon: "checkmark.circle.fill",
                color: .green
            ),
            TimelineEvent(
                timestamp: resolvedAt,
                title: "Emergency Resolved",
                description: "Emergency marked as resolved",
                icon: "checkmark.seal.fill",
                color: .blue
            )
        ]

        // Calculate duration
        let interval = resolvedAt.timeIntervalSince(createdAt)
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        duration = "\(minutes)m \(seconds)s"

        contactsNotified = 3
    }

    func exportToPDF() {
        // Implement PDF export using PDFKit
        print("Exporting to PDF...")
    }
}

#Preview {
    EmergencyDetailView(emergencyId: "123")
}
