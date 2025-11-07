import Foundation
import Starscream

class WebSocketManager: WebSocketDelegate {
    private var socket: WebSocket?
    private var emergencyId: String?

    var onLocationUpdate: ((LocationPoint) -> Void)?
    var onChatMessage: ((Message) -> Void)?
    var onAcknowledgment: ((Any) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    func connect(emergencyId: String) {
        self.emergencyId = emergencyId

        guard let token = KeychainHelper.load(key: "accessToken") else {
            print("No access token found")
            return
        }

        var request = URLRequest(url: URL(string: "\(Config.wsURL)/socket.io/?EIO=4&transport=websocket")!)
        request.timeoutInterval = 5
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        socket = WebSocket(request: request)
        socket?.delegate = self
        socket?.connect()
    }

    func disconnect() {
        socket?.disconnect()
        socket = nil
    }

    func sendLocationUpdate(location: LocationPoint) {
        guard let emergencyId = emergencyId else { return }

        let payload: [String: Any] = [
            "emergencyId": emergencyId,
            "location": [
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "timestamp": ISO8601DateFormatter().string(from: location.timestamp)
            ]
        ]

        sendEvent(event: "location-update", data: payload)
    }

    func sendChatMessage(text: String) {
        guard let emergencyId = emergencyId else { return }

        let payload: [String: Any] = [
            "emergencyId": emergencyId,
            "text": text,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]

        sendEvent(event: "chat-message", data: payload)
    }

    func sendTypingIndicator(isTyping: Bool) {
        guard let emergencyId = emergencyId else { return }

        let event = isTyping ? "typing-start" : "typing-stop"
        let payload: [String: Any] = ["roomId": emergencyId]

        sendEvent(event: event, data: payload)
    }

    private func sendEvent(event: String, data: [String: Any]) {
        guard let socket = socket, socket.isConnected else {
            print("Socket not connected")
            return
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            let message = "42[\"\(event)\",\(String(data: jsonData, encoding: .utf8) ?? "{}")]"
            socket.write(string: message)
        } catch {
            print("Failed to serialize message: \(error)")
        }
    }

    // MARK: - WebSocketDelegate

    func didReceive(event: WebSocketEvent, client: WebSocketClient) {
        switch event {
        case .connected(let headers):
            print("WebSocket connected: \(headers)")
            onConnectionChange?(true)

            // Join emergency room
            if let emergencyId = emergencyId {
                sendEvent(event: "join-room", data: ["roomId": emergencyId])
            }

        case .disconnected(let reason, let code):
            print("WebSocket disconnected: \(reason) with code: \(code)")
            onConnectionChange?(false)

        case .text(let text):
            handleMessage(text)

        case .binary(let data):
            print("Received binary data: \(data.count) bytes")

        case .ping:
            break

        case .pong:
            break

        case .viabilityChanged(let isViable):
            print("WebSocket viability changed: \(isViable)")

        case .reconnectSuggested(let shouldReconnect):
            if shouldReconnect {
                print("WebSocket reconnect suggested")
            }

        case .cancelled:
            print("WebSocket cancelled")
            onConnectionChange?(false)

        case .error(let error):
            print("WebSocket error: \(error?.localizedDescription ?? "Unknown error")")
            onConnectionChange?(false)

        case .peerClosed:
            print("WebSocket peer closed")
            onConnectionChange?(false)
        }
    }

    private func handleMessage(_ text: String) {
        // Socket.IO protocol parsing
        // Format: 42["event-name",{data}]

        guard text.hasPrefix("42[") else { return }

        let content = String(text.dropFirst(3).dropLast(1))
        let components = content.split(separator: ",", maxSplits: 1)

        guard components.count == 2 else { return }

        let eventName = String(components[0]).replacingOccurrences(of: "\"", with: "")
        let jsonString = String(components[1])

        guard let data = jsonString.data(using: .utf8) else { return }

        do {
            switch eventName {
            case "location-update":
                let locationData = try JSONDecoder().decode(LocationUpdateData.self, from: data)
                let location = LocationPoint(
                    latitude: locationData.location.latitude,
                    longitude: locationData.location.longitude,
                    accuracy: locationData.location.accuracy,
                    timestamp: ISO8601DateFormatter().date(from: locationData.location.timestamp) ?? Date()
                )
                onLocationUpdate?(location)

            case "chat-message":
                let message = try JSONDecoder().decode(Message.self, from: data)
                onChatMessage?(message)

            case "contact-acknowledged":
                let ack = try JSONDecoder().decode([String: Any].self, from: data)
                onAcknowledgment?(ack)

            default:
                print("Unknown event: \(eventName)")
            }
        } catch {
            print("Failed to decode message: \(error)")
        }
    }
}

// Helper structures
struct LocationUpdateData: Codable {
    let emergencyId: String
    let location: LocationData
}

struct LocationData: Codable {
    let latitude: Double
    let longitude: Double
    let accuracy: Double
    let timestamp: String
}

extension JSONDecoder {
    func decode<T>(_ type: [String: Any].Type, from data: Data) throws -> [String: Any] {
        guard let dictionary = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw DecodingError.dataCorrupted(DecodingError.Context(
                codingPath: [],
                debugDescription: "Failed to decode dictionary"
            ))
        }
        return dictionary
    }
}
