import SwiftUI

struct ContactFormView: View {
    @Environment(\.presentationMode) var presentationMode
    let contact: EmergencyContact?
    let onSave: (EmergencyContact) -> Void

    @State private var name: String
    @State private var phoneNumber: String
    @State private var relationship: ContactRelationship
    @State private var priority: ContactPriority
    @State private var showingError = false
    @State private var errorMessage = ""

    init(contact: EmergencyContact?, onSave: @escaping (EmergencyContact) -> Void) {
        self.contact = contact
        self.onSave = onSave

        _name = State(initialValue: contact?.name ?? "")
        _phoneNumber = State(initialValue: contact?.phoneNumber ?? "")
        _relationship = State(initialValue: contact?.relationship ?? .friend)
        _priority = State(initialValue: contact?.priority ?? .primary)
    }

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Contact Information")) {
                    TextField("Full Name", text: $name)
                        .textContentType(.name)

                    TextField("Phone Number", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                Section(header: Text("Relationship")) {
                    Picker("Relationship", selection: $relationship) {
                        ForEach(ContactRelationship.allCases, id: \.self) { rel in
                            Text(rel.rawValue.capitalized).tag(rel)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section(header: Text("Priority")) {
                    Picker("Priority", selection: $priority) {
                        ForEach(ContactPriority.allCases, id: \.self) { pri in
                            HStack {
                                Text(pri.rawValue.capitalized)
                                Spacer()
                                priorityBadge(for: pri)
                            }
                            .tag(pri)
                        }
                    }
                    .pickerStyle(.inline)

                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(Color.red)
                                .frame(width: 8, height: 8)
                            Text("Primary: Notified immediately")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        HStack(spacing: 8) {
                            Circle()
                                .fill(Color.orange)
                                .frame(width: 8, height: 8)
                            Text("Secondary: Notified after 2 min")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        HStack(spacing: 8) {
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 8, height: 8)
                            Text("Tertiary: Notified after 5 min")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle(contact == nil ? "Add Contact" : "Edit Contact")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveContact()
                    }
                    .disabled(!isFormValid)
                }
            }
            .alert("Validation Error", isPresented: $showingError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private var isFormValid: Bool {
        !name.isEmpty && !phoneNumber.isEmpty
    }

    private func priorityBadge(for priority: ContactPriority) -> some View {
        let color: Color
        switch priority {
        case .primary:
            color = .red
        case .secondary:
            color = .orange
        case .tertiary:
            color = .blue
        }

        return Text(priority.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color)
            .cornerRadius(4)
    }

    private func saveContact() {
        // Validate phone number format
        let phoneRegex = #"^\+?[0-9]{10,15}$"#
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)

        if !phonePredicate.evaluate(with: phoneNumber.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "-", with: "")) {
            errorMessage = "Please enter a valid phone number"
            showingError = true
            return
        }

        let newContact = EmergencyContact(
            id: contact?.id ?? UUID().uuidString,
            userId: contact?.userId ?? "user1",
            name: name,
            phoneNumber: phoneNumber,
            relationship: relationship,
            priority: priority,
            createdAt: contact?.createdAt ?? Date(),
            updatedAt: Date()
        )

        onSave(newContact)
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    ContactFormView(contact: nil) { contact in
        print("Saved: \(contact.name)")
    }
}
