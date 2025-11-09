import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showCountdown = false

    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 20) {
                    // Header
                    Text("SOS Dashboard")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    // Stats Cards
                    HStack(spacing: 15) {
                        StatCard(title: "Contacts", value: "\(viewModel.contactCount)", icon: "person.2.fill", color: .blue)
                        StatCard(title: "Emergencies", value: "\(viewModel.emergencyCount)", icon: "exclamationmark.triangle.fill", color: .red)
                    }
                    .padding(.horizontal)

                    Spacer()

                    // Emergency Button
                    Button(action: {
                        showCountdown = true
                        Haptics.impact(.heavy)
                    }) {
                        ZStack {
                            Circle()
                                .fill(Color.red)
                                .frame(width: 200, height: 200)
                                .shadow(color: .red.opacity(0.5), radius: 20)

                            VStack {
                                Text("SOS")
                                    .font(.system(size: 48, weight: .black))
                                    .foregroundColor(.white)
                                Text("Tap to Alert")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }
                    }
                    .scaleEffect(viewModel.buttonScale)
                    .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: viewModel.buttonScale)

                    Spacer()

                    // Quick Actions
                    VStack(spacing: 12) {
                        NavigationLink(destination: ContactsListView()) {
                            QuickActionButton(title: "Emergency Contacts", icon: "person.2.fill", color: .blue)
                        }

                        NavigationLink(destination: MedicalProfileView()) {
                            QuickActionButton(title: "Medical Profile", icon: "heart.text.square.fill", color: .green)
                        }

                        NavigationLink(destination: HistoryListView()) {
                            QuickActionButton(title: "Emergency History", icon: "clock.fill", color: .orange)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding()

                // Countdown Modal
                if showCountdown {
                    CountdownModalView(isPresented: $showCountdown, onComplete: {
                        viewModel.triggerEmergency()
                    })
                }
            }
            .onAppear {
                viewModel.loadData()
                viewModel.startPulseAnimation()
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Spacer()
            }
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 30)
            Text(title)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

class DashboardViewModel: ObservableObject {
    @Published var contactCount = 0
    @Published var emergencyCount = 0
    @Published var buttonScale: CGFloat = 1.0

    func loadData() {
        // Load contacts count
        APIClient.shared.getContacts { result in
            if case .success(let contacts) = result {
                DispatchQueue.main.async {
                    self.contactCount = contacts.count
                }
            }
        }
    }

    func startPulseAnimation() {
        buttonScale = 1.05
    }

    func triggerEmergency() {
        LocationService.shared.getCurrentLocation { location in
            APIClient.shared.triggerEmergency(
                type: .other,
                description: "Emergency triggered from iOS app",
                location: location
            ) { result in
                switch result {
                case .success(let emergency):
                    print("Emergency triggered: \(emergency.id)")
                case .failure(let error):
                    print("Failed to trigger emergency: \(error)")
                }
            }
        }
    }
}

struct Haptics {
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
}
