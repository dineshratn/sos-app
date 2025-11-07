import Foundation
import Alamofire

class APIClient {
    static let shared = APIClient()
    private let baseURL = "http://localhost:3000/api/v1"
    private var accessToken: String?

    private init() {}

    // MARK: - Authentication
    func login(email: String, password: String, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
        let parameters: [String: Any] = [
            "email": email,
            "password": password
        ]

        AF.request("\(baseURL)/auth/login",
                   method: .post,
                   parameters: parameters,
                   encoding: JSONEncoding.default)
            .validate()
            .responseDecodable(of: AuthResponse.self) { response in
                switch response.result {
                case .success(let authResponse):
                    self.accessToken = authResponse.tokens.accessToken
                    KeychainHelper.save(token: authResponse.tokens.accessToken, key: "accessToken")
                    KeychainHelper.save(token: authResponse.tokens.refreshToken, key: "refreshToken")
                    completion(.success(authResponse))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
    }

    func register(userData: RegisterData, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
        AF.request("\(baseURL)/auth/register",
                   method: .post,
                   parameters: userData,
                   encoder: JSONParameterEncoder.default)
            .validate()
            .responseDecodable(of: AuthResponse.self) { response in
                switch response.result {
                case .success(let authResponse):
                    self.accessToken = authResponse.tokens.accessToken
                    KeychainHelper.save(token: authResponse.tokens.accessToken, key: "accessToken")
                    completion(.success(authResponse))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
    }

    // MARK: - Emergency
    func triggerEmergency(type: EmergencyType, description: String?, location: LocationData?, completion: @escaping (Result<Emergency, Error>) -> Void) {
        guard let token = accessToken ?? KeychainHelper.load(key: "accessToken") else {
            completion(.failure(APIError.unauthorized))
            return
        }

        var parameters: [String: Any] = ["type": type.rawValue]
        if let desc = description { parameters["description"] = desc }
        if let loc = location {
            parameters["location"] = [
                "latitude": loc.latitude,
                "longitude": loc.longitude
            ]
        }

        let headers: HTTPHeaders = ["Authorization": "Bearer \(token)"]

        AF.request("\(baseURL)/emergency/trigger",
                   method: .post,
                   parameters: parameters,
                   encoding: JSONEncoding.default,
                   headers: headers)
            .validate()
            .responseDecodable(of: EmergencyResponse.self) { response in
                switch response.result {
                case .success(let emergencyResponse):
                    completion(.success(emergencyResponse.emergency))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
    }

    func resolveEmergency(emergencyId: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let token = accessToken ?? KeychainHelper.load(key: "accessToken") else {
            completion(.failure(APIError.unauthorized))
            return
        }

        let headers: HTTPHeaders = ["Authorization": "Bearer \(token)"]

        AF.request("\(baseURL)/emergency/\(emergencyId)/resolve",
                   method: .post,
                   headers: headers)
            .validate()
            .response { response in
                if let error = response.error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
    }

    // MARK: - Contacts
    func getContacts(completion: @escaping (Result<[EmergencyContact], Error>) -> Void) {
        guard let token = accessToken ?? KeychainHelper.load(key: "accessToken") else {
            completion(.failure(APIError.unauthorized))
            return
        }

        let headers: HTTPHeaders = ["Authorization": "Bearer \(token)"]

        AF.request("\(baseURL)/contacts",
                   method: .get,
                   headers: headers)
            .validate()
            .responseDecodable(of: ContactsResponse.self) { response in
                switch response.result {
                case .success(let contactsResponse):
                    completion(.success(contactsResponse.contacts))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
    }
}

enum APIError: Error {
    case unauthorized
    case invalidResponse
}
