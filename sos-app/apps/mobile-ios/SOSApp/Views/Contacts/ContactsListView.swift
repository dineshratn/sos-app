import SwiftUI

struct ContactsListView: View {
    @StateObject private var viewModel = ContactsViewModel()
    @State private var showingAddContact = false

    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.contacts.isEmpty {
                    // Empty state
                    VStack(spacing: 20) {
                        Image(systemName: "person.2.slash")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("No Emergency Contacts")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Add contacts who will be notified during emergencies")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)

                        Button(action: {
                            showingAddContact = true
                        }) {
                            Label("Add Contact", systemImage: "plus.circle.fill")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.red)
                                .cornerRadius(12)
                        }
                        .padding(.top, 20)
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Info banner
                            HStack(spacing: 12) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundColor(.blue)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Priority Escalation")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)

                                    Text("Primary contacts are notified first. If no response in 2 minutes, secondary contacts are alerted.")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(12)
                            .padding(.horizontal)

                            // Contacts list
                            ForEach(viewModel.contacts) { contact in
                                ContactRow(contact: contact)
                                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                        Button(role: .destructive) {
                                            viewModel.deleteContact(contact)
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }

                                        Button {
                                            viewModel.selectedContact = contact
                                            showingAddContact = true
                                        } label: {
                                            Label("Edit", systemImage: "pencil")
                                        }
                                        .tint(.blue)
                                    }
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .navigationTitle("Emergency Contacts")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        viewModel.selectedContact = nil
                        showingAddContact = true
                    }) {
                        Image(systemName: "plus")
                            .foregroundColor(.red)
                    }
                }
            }
            .sheet(isPresented: $showingAddContact) {
                ContactFormView(
                    contact: viewModel.selectedContact,
                    onSave: { contact in
                        if viewModel.selectedContact != nil {
                            viewModel.updateContact(contact)
                        } else {
                            viewModel.addContact(contact)
                        }
                        showingAddContact = false
                    }
                )
            }
            .onAppear {
                viewModel.fetchContacts()
            }
        }
    }
}

struct ContactRow: View {
    let contact: EmergencyContact

    var body: some View {
        HStack(spacing: 15) {
            // Avatar
            ZStack {
                Circle()
                    .fill(priorityColor.opacity(0.2))
                    .frame(width: 50, height: 50)

                Text(contact.name.prefix(1))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(priorityColor)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(contact.name)
                        .font(.headline)

                    priorityBadge
                }

                Text(contact.phoneNumber)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text(contact.relationship.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private var priorityColor: Color {
        switch contact.priority {
        case .primary:
            return .red
        case .secondary:
            return .orange
        case .tertiary:
            return .blue
        }
    }

    private var priorityBadge: some View {
        Text(contact.priority.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(priorityColor)
            .cornerRadius(4)
    }
}

class ContactsViewModel: ObservableObject {
    @Published var contacts: [EmergencyContact] = []
    @Published var selectedContact: EmergencyContact?

    func fetchContacts() {
        // Mock data - replace with API call
        contacts = [
            EmergencyContact(
                id: "1",
                userId: "user1",
                name: "John Doe",
                phoneNumber: "+1234567890",
                relationship: .spouse,
                priority: .primary,
                createdAt: Date(),
                updatedAt: Date()
            ),
            EmergencyContact(
                id: "2",
                userId: "user1",
                name: "Jane Smith",
                phoneNumber: "+1234567891",
                relationship: .parent,
                priority: .secondary,
                createdAt: Date(),
                updatedAt: Date()
            ),
            EmergencyContact(
                id: "3",
                userId: "user1",
                name: "Bob Johnson",
                phoneNumber: "+1234567892",
                relationship: .friend,
                priority: .tertiary,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
    }

    func addContact(_ contact: EmergencyContact) {
        // API call to add contact
        contacts.append(contact)
    }

    func updateContact(_ contact: EmergencyContact) {
        // API call to update contact
        if let index = contacts.firstIndex(where: { $0.id == contact.id }) {
            contacts[index] = contact
        }
    }

    func deleteContact(_ contact: EmergencyContact) {
        // API call to delete contact
        contacts.removeAll { $0.id == contact.id }
    }
}

#Preview {
    ContactsListView()
}
