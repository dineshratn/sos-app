import Foundation

// MARK: - User & Authentication
struct User: Codable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let phoneNumber: String
    let createdAt: String
}

struct AuthTokens: Codable {
    let accessToken: String
    let refreshToken: String
}

struct AuthResponse: Codable {
    let user: User
    let tokens: AuthTokens
}

struct RegisterData: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let phoneNumber: String
}

// MARK: - Emergency
enum EmergencyType: String, Codable, CaseIterable {
    case medical = "MEDICAL"
    case accident = "ACCIDENT"
    case crime = "CRIME"
    case fire = "FIRE"
    case naturalDisaster = "NATURAL_DISASTER"
    case other = "OTHER"
}

enum EmergencyStatus: String, Codable {
    case pending = "PENDING"
    case active = "ACTIVE"
    case resolved = "RESOLVED"
    case cancelled = "CANCELLED"
}

struct Emergency: Codable, Identifiable {
    let id: String
    let userId: String
    let type: EmergencyType
    let status: EmergencyStatus
    let description: String?
    let triggeredAt: String
    let resolvedAt: String?
    let cancelledAt: String?
}

struct EmergencyResponse: Codable {
    let emergency: Emergency
}

struct LocationData: Codable {
    let latitude: Double
    let longitude: Double
    let accuracy: Double?
}

// MARK: - Contacts
struct EmergencyContact: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let phoneNumber: String
    let email: String?
    let relationship: String
    let priority: Int
    let createdAt: String
}

struct ContactsResponse: Codable {
    let contacts: [EmergencyContact]
}

// MARK: - Medical Profile
struct MedicalProfile: Codable {
    let id: String
    let userId: String
    let bloodType: String?
    let allergies: [String]?
    let medications: [Medication]?
    let conditions: [String]?
}

struct Medication: Codable {
    let name: String
    let dosage: String
    let frequency: String?
}

// MARK: - Messages
struct Message: Codable, Identifiable {
    let id: String
    let emergencyId: String
    let senderId: String
    let senderName: String
    let content: String
    let timestamp: String
    let delivered: Bool
    let read: Bool
}
