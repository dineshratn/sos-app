import SwiftUI
import MapKit

struct ActiveEmergencyView: View {
    @StateObject private var viewModel: ActiveEmergencyViewModel
    @Environment(\.presentationMode) var presentationMode

    init(emergencyId: String) {
        _viewModel = StateObject(wrappedValue: ActiveEmergencyViewModel(emergencyId: emergencyId))
    }

    var body: some View {
        ZStack {
            // Map View
            LocationMapView(
                currentLocation: viewModel.currentLocation,
                locationTrail: viewModel.locationTrail,
                region: $viewModel.mapRegion
            )
            .edgesIgnoringSafeArea(.all)

            VStack {
                // Status Banner
                HStack {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 12, height: 12)
                        .opacity(viewModel.isActive ? 1.0 : 0.3)
                        .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: viewModel.isActive)

                    Text(viewModel.isActive ? "Emergency Active" : "Emergency Resolved")
                        .font(.headline)
                        .foregroundColor(.white)

                    Spacer()

                    Text(viewModel.elapsedTime)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding()
                .background(viewModel.isActive ? Color.red : Color.gray)

                Spacer()

                // Bottom Info Card
                VStack(spacing: 0) {
                    // Handle
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 40, height: 5)
                        .padding(.top, 8)

                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Emergency Info
                            VStack(alignment: .leading, spacing: 10) {
                                Label("Emergency Details", systemImage: "exclamationmark.triangle.fill")
                                    .font(.headline)
                                    .foregroundColor(.red)

                                HStack {
                                    Text("Type:")
                                        .fontWeight(.semibold)
                                    Text(viewModel.emergency?.type.rawValue.capitalized ?? "Unknown")
                                        .foregroundColor(.secondary)
                                }

                                HStack {
                                    Text("Status:")
                                        .fontWeight(.semibold)
                                    Text(viewModel.emergency?.status.rawValue.capitalized ?? "Unknown")
                                        .foregroundColor(.secondary)
                                }

                                if let notes = viewModel.emergency?.notes, !notes.isEmpty {
                                    Text("Notes:")
                                        .fontWeight(.semibold)
                                    Text(notes)
                                        .foregroundColor(.secondary)
                                        .font(.subheadline)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)

                            // Contact Acknowledgments
                            VStack(alignment: .leading, spacing: 10) {
                                Label("Emergency Contacts", systemImage: "person.2.fill")
                                    .font(.headline)

                                ForEach(viewModel.acknowledgments) { ack in
                                    HStack {
                                        Image(systemName: ack.acknowledged ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(ack.acknowledged ? .green : .gray)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(ack.contactName)
                                                .fontWeight(.semibold)
                                            if let time = ack.acknowledgedAt {
                                                Text("Acknowledged at \(formatTime(time))")
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                            } else {
                                                Text("Waiting for response...")
                                                    .font(.caption)
                                                    .foregroundColor(.orange)
                                            }
                                        }

                                        Spacer()
                                    }
                                    .padding(.vertical, 8)
                                    .padding(.horizontal)
                                    .background(Color(.secondarySystemBackground))
                                    .cornerRadius(8)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)

                            // Location Info
                            VStack(alignment: .leading, spacing: 10) {
                                Label("Location Updates", systemImage: "location.fill")
                                    .font(.headline)

                                HStack {
                                    Text("Accuracy:")
                                        .fontWeight(.semibold)
                                    Text(String(format: "±%.0fm", viewModel.currentLocation?.accuracy ?? 0))
                                        .foregroundColor(.secondary)
                                }

                                HStack {
                                    Text("Updates:")
                                        .fontWeight(.semibold)
                                    Text("\(viewModel.locationTrail.count)")
                                        .foregroundColor(.secondary)
                                }

                                HStack {
                                    Text("Connected:")
                                        .fontWeight(.semibold)
                                    HStack(spacing: 4) {
                                        Circle()
                                            .fill(viewModel.isConnected ? Color.green : Color.red)
                                            .frame(width: 8, height: 8)
                                        Text(viewModel.isConnected ? "Yes" : "No")
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)

                            // Resolve Button
                            if viewModel.isActive {
                                Button(action: {
                                    viewModel.resolveEmergency()
                                }) {
                                    HStack {
                                        Image(systemName: "checkmark.circle.fill")
                                        Text("Resolve Emergency")
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.green)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                }
                            } else {
                                Button(action: {
                                    presentationMode.wrappedValue.dismiss()
                                }) {
                                    HStack {
                                        Image(systemName: "arrow.left.circle.fill")
                                        Text("Back to Dashboard")
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding()
                    }
                }
                .frame(maxHeight: UIScreen.main.bounds.height * 0.5)
                .background(Color(.systemGroupedBackground))
                .cornerRadius(20, corners: [.topLeft, .topRight])
                .shadow(radius: 10)
            }
        }
        .onAppear {
            viewModel.connect()
        }
        .onDisappear {
            viewModel.disconnect()
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// Custom corner radius modifier
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

struct ContactAcknowledgment: Identifiable {
    let id: String
    let contactName: String
    let acknowledged: Bool
    let acknowledgedAt: Date?
}

#Preview {
    ActiveEmergencyView(emergencyId: "123")
}
