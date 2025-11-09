import SwiftUI

struct HistoryListView: View {
    @StateObject private var viewModel = HistoryViewModel()
    @State private var selectedFilter: EmergencyStatus?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        FilterChip(title: "All", isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }

                        FilterChip(title: "Active", isSelected: selectedFilter == .active) {
                            selectedFilter = .active
                        }

                        FilterChip(title: "Resolved", isSelected: selectedFilter == .resolved) {
                            selectedFilter = .resolved
                        }

                        FilterChip(title: "Cancelled", isSelected: selectedFilter == .cancelled) {
                            selectedFilter = .cancelled
                        }
                    }
                    .padding()
                }
                .background(Color(.systemGroupedBackground))

                // History list
                List(filteredEmergencies) { emergency in
                    NavigationLink(destination: EmergencyDetailView(emergencyId: emergency.id)) {
                        EmergencyHistoryRow(emergency: emergency)
                    }
                }
                .listStyle(.plain)
            }
            .navigationTitle("Emergency History")
            .onAppear {
                viewModel.fetchHistory()
            }
        }
    }

    private var filteredEmergencies: [Emergency] {
        if let filter = selectedFilter {
            return viewModel.emergencies.filter { $0.status == filter }
        }
        return viewModel.emergencies
    }
}

struct EmergencyHistoryRow: View {
    let emergency: Emergency

    var body: some View {
        HStack(spacing: 15) {
            // Type icon
            Text(typeIcon)
                .font(.title2)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(emergency.type.rawValue.capitalized)
                        .font(.headline)

                    statusBadge
                }

                Text(formatDate(emergency.createdAt))
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let resolvedAt = emergency.resolvedAt {
                    Text("Duration: \(formatDuration(from: emergency.createdAt, to: resolvedAt))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 8)
    }

    private var typeIcon: String {
        switch emergency.type {
        case .medical: return "🏥"
        case .accident: return "🚗"
        case .crime: return "🚨"
        case .fire: return "🔥"
        case .naturalDisaster: return "🌪️"
        case .other: return "⚠️"
        }
    }

    private var statusBadge: some View {
        let color: Color
        switch emergency.status {
        case .active:
            color = .red
        case .resolved:
            color = .green
        case .cancelled:
            color = .gray
        }

        return Text(emergency.status.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color)
            .cornerRadius(4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func formatDuration(from start: Date, to end: Date) -> String {
        let duration = end.timeIntervalSince(start)
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return "\(minutes)m \(seconds)s"
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.red : Color(.systemBackground))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.gray.opacity(0.3), lineWidth: isSelected ? 0 : 1)
                )
        }
    }
}

class HistoryViewModel: ObservableObject {
    @Published var emergencies: [Emergency] = []

    func fetchHistory() {
        // Mock data - replace with API call
        emergencies = [
            Emergency(
                id: "1",
                userId: "user1",
                type: .medical,
                status: .resolved,
                location: nil,
                notes: "Chest pain",
                createdAt: Date().addingTimeInterval(-7200),
                updatedAt: Date().addingTimeInterval(-7000),
                resolvedAt: Date().addingTimeInterval(-7000)
            ),
            Emergency(
                id: "2",
                userId: "user1",
                type: .accident,
                status: .resolved,
                location: nil,
                notes: "Car accident",
                createdAt: Date().addingTimeInterval(-86400),
                updatedAt: Date().addingTimeInterval(-86000),
                resolvedAt: Date().addingTimeInterval(-86000)
            )
        ]
    }
}

#Preview {
    HistoryListView()
}
