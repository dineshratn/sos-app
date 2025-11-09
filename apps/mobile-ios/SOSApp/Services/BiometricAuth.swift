import LocalAuthentication

class BiometricAuth {
    static func authenticate(completion: @escaping (Bool, Error?) -> Void) {
        let context = LAContext()
        var error: NSError?

        // Check if biometric authentication is available
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, error)
            return
        }

        // Perform biometric authentication
        let reason = "Authenticate to access your SOS App account"

        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        ) { success, authenticationError in
            DispatchQueue.main.async {
                completion(success, authenticationError)
            }
        }
    }

    static func biometricType() -> String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)

        switch context.biometryType {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .none:
            return "None"
        @unknown default:
            return "Unknown"
        }
    }
}
