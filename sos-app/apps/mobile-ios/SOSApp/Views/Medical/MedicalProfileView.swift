import SwiftUI

struct MedicalProfileView: View {
    @StateObject private var viewModel = MedicalProfileViewModel()
    @State private var showingAddMedication = false
    @State private var newMedication = ""
    @State private var newAllergy = ""

    var body: some View {
        NavigationView {
            Form {
                // Privacy Warning
                Section {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.shield.fill")
                            .foregroundColor(.orange)
                            .font(.title2)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Privacy Notice")
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            Text("This information will be shared with emergency responders and your emergency contacts")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Blood Type
                Section(header: Text("Blood Type")) {
                    Picker("Blood Type", selection: $viewModel.bloodType) {
                        Text("Not Set").tag(nil as String?)
                        ForEach(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], id: \.self) { type in
                            Text(type).tag(type as String?)
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Allergies
                Section(header: Text("Allergies")) {
                    ForEach(viewModel.allergies, id: \.self) { allergy in
                        HStack {
                            Text(allergy)
                            Spacer()
                            Button(action: {
                                viewModel.removeAllergy(allergy)
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }

                    HStack {
                        TextField("Add allergy", text: $newAllergy)
                            .textInputAutocapitalization(.words)

                        Button(action: {
                            if !newAllergy.isEmpty {
                                viewModel.addAllergy(newAllergy)
                                newAllergy = ""
                            }
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                        }
                        .disabled(newAllergy.isEmpty)
                    }
                }

                // Medications
                Section(header: Text("Medications")) {
                    ForEach(viewModel.medications, id: \.name) { medication in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(medication.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            HStack {
                                Text(medication.dosage)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text("•")
                                    .foregroundColor(.secondary)
                                Text(medication.frequency)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                viewModel.removeMedication(medication)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }

                    Button(action: {
                        showingAddMedication = true
                    }) {
                        Label("Add Medication", systemImage: "plus.circle")
                    }
                }

                // Medical Conditions
                Section(header: Text("Medical Conditions")) {
                    ForEach(viewModel.conditions, id: \.self) { condition in
                        HStack {
                            Text(condition)
                            Spacer()
                            Button(action: {
                                viewModel.removeCondition(condition)
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }

                    // Quick add buttons for common conditions
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Quick Add:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        FlowLayout(spacing: 8) {
                            ForEach(["Diabetes", "Hypertension", "Asthma", "Heart Disease", "Epilepsy", "Arthritis"], id: \.self) { condition in
                                if !viewModel.conditions.contains(condition) {
                                    Button(action: {
                                        viewModel.addCondition(condition)
                                    }) {
                                        Text(condition)
                                            .font(.caption)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.blue.opacity(0.1))
                                            .foregroundColor(.blue)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                        }
                    }
                }

                // Additional Notes
                Section(header: Text("Additional Notes")) {
                    TextEditor(text: $viewModel.notes)
                        .frame(minHeight: 100)
                }
            }
            .navigationTitle("Medical Profile")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        viewModel.save()
                    }
                }
            }
            .sheet(isPresented: $showingAddMedication) {
                MedicationFormView(onSave: { medication in
                    viewModel.addMedication(medication)
                    showingAddMedication = false
                })
            }
            .onAppear {
                viewModel.fetchProfile()
            }
        }
    }
}

struct MedicationFormView: View {
    @Environment(\.presentationMode) var presentationMode
    let onSave: (Medication) -> Void

    @State private var name = ""
    @State private var dosage = ""
    @State private var frequency = ""

    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Medication Name", text: $name)
                    TextField("Dosage (e.g., 500mg)", text: $dosage)
                    TextField("Frequency (e.g., Twice daily)", text: $frequency)
                }
            }
            .navigationTitle("Add Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        let medication = Medication(
                            id: UUID().uuidString,
                            name: name,
                            dosage: dosage,
                            frequency: frequency
                        )
                        onSave(medication)
                    }
                    .disabled(name.isEmpty || dosage.isEmpty || frequency.isEmpty)
                }
            }
        }
    }
}

// Custom FlowLayout for wrapping buttons
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.frames[index].minX, y: bounds.minY + result.frames[index].minY), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var frames: [CGRect] = []
        var size: CGSize = .zero

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))

                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}

class MedicalProfileViewModel: ObservableObject {
    @Published var bloodType: String?
    @Published var allergies: [String] = []
    @Published var medications: [Medication] = []
    @Published var conditions: [String] = []
    @Published var notes: String = ""

    func fetchProfile() {
        // Mock data - replace with API call
        bloodType = "O+"
        allergies = ["Penicillin", "Peanuts"]
        medications = [
            Medication(id: "1", name: "Aspirin", dosage: "100mg", frequency: "Daily")
        ]
        conditions = ["Diabetes", "Hypertension"]
        notes = "No additional notes"
    }

    func save() {
        // API call to save profile
        print("Saving medical profile...")
    }

    func addAllergy(_ allergy: String) {
        allergies.append(allergy)
    }

    func removeAllergy(_ allergy: String) {
        allergies.removeAll { $0 == allergy }
    }

    func addMedication(_ medication: Medication) {
        medications.append(medication)
    }

    func removeMedication(_ medication: Medication) {
        medications.removeAll { $0.id == medication.id }
    }

    func addCondition(_ condition: String) {
        conditions.append(condition)
    }

    func removeCondition(_ condition: String) {
        conditions.removeAll { $0 == condition }
    }
}

struct Medication: Codable, Hashable {
    let id: String
    let name: String
    let dosage: String
    let frequency: String
}

#Preview {
    MedicalProfileView()
}
