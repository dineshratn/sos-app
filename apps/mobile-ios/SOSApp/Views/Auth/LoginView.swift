import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @State private var email = ""
    @State private var password = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color.red.opacity(0.8), Color.orange.opacity(0.6)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .edgesIgnoringSafeArea(.all)

                ScrollView {
                    VStack(spacing: 30) {
                        Spacer()
                            .frame(height: 60)

                        // Logo and Title
                        VStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.white)

                            Text("SOS App")
                                .font(.system(size: 40, weight: .bold))
                                .foregroundColor(.white)

                            Text("Emergency Alert System")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.9))
                        }
                        .padding(.bottom, 40)

                        // Login Form
                        VStack(spacing: 20) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)

                                TextField("", text: $email)
                                    .textFieldStyle(RoundedTextFieldStyle())
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .keyboardType(.emailAddress)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)

                                SecureField("", text: $password)
                                    .textFieldStyle(RoundedTextFieldStyle())
                                    .textContentType(.password)
                            }

                            // Biometric login button
                            Button(action: {
                                authenticateWithBiometrics()
                            }) {
                                HStack {
                                    Image(systemName: "faceid")
                                    Text("Login with Face ID")
                                }
                                .font(.subheadline)
                                .foregroundColor(.white)
                            }
                            .padding(.top, 8)

                            // Login button
                            Button(action: {
                                login()
                            }) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Log In")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.white.opacity(0.3))
                                        .cornerRadius(12)
                                }
                            }
                            .disabled(isLoading || email.isEmpty || password.isEmpty)
                            .padding(.top, 20)

                            // Register link
                            NavigationLink(destination: RegisterView()) {
                                HStack {
                                    Text("Don't have an account?")
                                        .foregroundColor(.white.opacity(0.9))
                                    Text("Sign Up")
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                }
                                .font(.subheadline)
                            }
                            .padding(.top, 10)
                        }
                        .padding(.horizontal, 30)

                        Spacer()
                    }
                }
            }
            .alert("Login Error", isPresented: $showingError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func login() {
        isLoading = true

        APIClient.shared.login(email: email, password: password) { result in
            isLoading = false

            switch result {
            case .success(let authResponse):
                // Navigate to dashboard (handled by app state)
                NotificationCenter.default.post(name: NSNotification.Name("UserLoggedIn"), object: nil)
            case .failure(let error):
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }

    private func authenticateWithBiometrics() {
        BiometricAuth.authenticate { success, error in
            if success {
                // Try to load saved credentials from Keychain
                if let savedEmail = KeychainHelper.load(key: "savedEmail"),
                   let savedPassword = KeychainHelper.load(key: "savedPassword") {
                    email = savedEmail
                    password = savedPassword
                    login()
                } else {
                    errorMessage = "No saved credentials found. Please login with email and password first."
                    showingError = true
                }
            } else if let error = error {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}

// Custom TextField Style
struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.white.opacity(0.9))
            .cornerRadius(10)
            .foregroundColor(.black)
    }
}

class LoginViewModel: ObservableObject {
    // Add view model logic as needed
}

#Preview {
    LoginView()
}
