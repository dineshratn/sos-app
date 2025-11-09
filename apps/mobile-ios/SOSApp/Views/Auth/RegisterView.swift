import SwiftUI

struct RegisterView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phoneNumber = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color.red.opacity(0.8), Color.orange.opacity(0.6)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    VStack(spacing: 10) {
                        Image(systemName: "person.badge.plus.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.white)

                        Text("Create Account")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)

                        Text("Join SOS emergency network")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 20)

                    // Registration Form
                    VStack(spacing: 18) {
                        // Name fields
                        HStack(spacing: 15) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("First Name")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)

                                TextField("", text: $firstName)
                                    .textFieldStyle(RoundedTextFieldStyle())
                                    .textContentType(.givenName)
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Last Name")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)

                                TextField("", text: $lastName)
                                    .textFieldStyle(RoundedTextFieldStyle())
                                    .textContentType(.familyName)
                            }
                        }

                        // Email field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)

                            TextField("", text: $email)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                        }

                        // Phone field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Phone Number")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)

                            TextField("", text: $phoneNumber)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.telephoneNumber)
                                .keyboardType(.phonePad)
                        }

                        // Password field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)

                            SecureField("", text: $password)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.newPassword)
                        }

                        // Confirm password field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Confirm Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)

                            SecureField("", text: $confirmPassword)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.newPassword)
                        }

                        // Password requirements
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Password must contain:")
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.8))

                            HStack(spacing: 4) {
                                Image(systemName: password.count >= 8 ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(password.count >= 8 ? .green : .white.opacity(0.6))
                                    .font(.caption2)
                                Text("At least 8 characters")
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.8))
                            }

                            HStack(spacing: 4) {
                                Image(systemName: password == confirmPassword && !password.isEmpty ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(password == confirmPassword && !password.isEmpty ? .green : .white.opacity(0.6))
                                    .font(.caption2)
                                Text("Passwords match")
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.8))
                            }
                        }
                        .padding(.top, 5)

                        // Register button
                        Button(action: {
                            register()
                        }) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Create Account")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.white.opacity(0.3))
                                    .cornerRadius(12)
                            }
                        }
                        .disabled(isLoading || !isFormValid)
                        .padding(.top, 20)

                        // Terms and conditions
                        Text("By creating an account, you agree to our Terms of Service and Privacy Policy")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.horizontal, 30)

                    Spacer()
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Registration Error", isPresented: $showingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        !phoneNumber.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword
    }

    private func register() {
        isLoading = true

        APIClient.shared.register(
            firstName: firstName,
            lastName: lastName,
            email: email,
            phoneNumber: phoneNumber,
            password: password
        ) { result in
            isLoading = false

            switch result {
            case .success(let authResponse):
                // Save credentials for biometric auth
                KeychainHelper.save(token: email, key: "savedEmail")
                KeychainHelper.save(token: password, key: "savedPassword")

                // Navigate to dashboard
                NotificationCenter.default.post(name: NSNotification.Name("UserLoggedIn"), object: nil)
                presentationMode.wrappedValue.dismiss()
            case .failure(let error):
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}

#Preview {
    RegisterView()
}
