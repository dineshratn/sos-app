import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel: ChatViewModel
    @State private var messageText = ""

    init(emergencyId: String) {
        _viewModel = StateObject(wrappedValue: ChatViewModel(emergencyId: emergencyId))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message, isCurrentUser: message.senderId == viewModel.currentUserId)
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) { _ in
                    scrollToBottom(proxy: proxy)
                }
            }

            // Typing indicator
            if !viewModel.typingUsers.isEmpty {
                HStack {
                    Text("\(viewModel.typingUsers.joined(separator: ", ")) \(viewModel.typingUsers.count == 1 ? "is" : "are") typing...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)

                    Spacer()
                }
                .padding(.vertical, 4)
            }

            // Input bar
            HStack(spacing: 12) {
                TextField("Type a message...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                    .onChange(of: messageText) { _ in
                        if !messageText.isEmpty {
                            viewModel.startTyping()
                        } else {
                            viewModel.stopTyping()
                        }
                    }

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(messageText.isEmpty ? .gray : .blue)
                }
                .disabled(messageText.isEmpty)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle("Emergency Chat")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.connect()
        }
        .onDisappear {
            viewModel.disconnect()
        }
    }

    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        viewModel.sendMessage(messageText)
        messageText = ""
        viewModel.stopTyping()
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        if let lastMessage = viewModel.messages.last {
            withAnimation {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message
    let isCurrentUser: Bool

    var body: some View {
        HStack {
            if isCurrentUser {
                Spacer()
            }

            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                if !isCurrentUser {
                    Text(message.senderName ?? "Unknown")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Text(message.text)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isCurrentUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(isCurrentUser ? .white : .primary)
                    .cornerRadius(18)

                HStack(spacing: 4) {
                    Text(formatTime(message.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    if isCurrentUser {
                        if message.readAt != nil {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption2)
                                .foregroundColor(.blue)
                        } else if message.deliveredAt != nil {
                            Image(systemName: "checkmark.circle")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            .frame(maxWidth: 280, alignment: isCurrentUser ? .trailing : .leading)

            if !isCurrentUser {
                Spacer()
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var typingUsers: [String] = []
    @Published var isConnected: Bool = false

    let currentUserId = "user1" // Replace with actual user ID
    private let emergencyId: String
    private var webSocketManager: WebSocketManager?
    private var typingTimer: Timer?

    init(emergencyId: String) {
        self.emergencyId = emergencyId
    }

    func connect() {
        webSocketManager = WebSocketManager()
        webSocketManager?.connect(emergencyId: emergencyId)

        webSocketManager?.onChatMessage = { [weak self] message in
            self?.messages.append(message)
        }

        webSocketManager?.onConnectionChange = { [weak self] connected in
            self?.isConnected = connected
        }

        // Fetch existing messages
        fetchMessages()
    }

    func disconnect() {
        webSocketManager?.disconnect()
    }

    func sendMessage(_ text: String) {
        webSocketManager?.sendChatMessage(text: text)

        // Optimistically add message to list
        let message = Message(
            id: UUID().uuidString,
            emergencyId: emergencyId,
            senderId: currentUserId,
            senderName: "You",
            text: text,
            createdAt: Date(),
            deliveredAt: nil,
            readAt: nil
        )
        messages.append(message)
    }

    func startTyping() {
        webSocketManager?.sendTypingIndicator(isTyping: true)

        // Auto-stop typing after 3 seconds
        typingTimer?.invalidate()
        typingTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
            self?.stopTyping()
        }
    }

    func stopTyping() {
        webSocketManager?.sendTypingIndicator(isTyping: false)
        typingTimer?.invalidate()
    }

    private func fetchMessages() {
        // Mock data - replace with API call
        messages = [
            Message(
                id: "1",
                emergencyId: emergencyId,
                senderId: "user2",
                senderName: "John Doe",
                text: "Are you okay? I'm on my way!",
                createdAt: Date().addingTimeInterval(-300),
                deliveredAt: Date().addingTimeInterval(-290),
                readAt: Date().addingTimeInterval(-280)
            ),
            Message(
                id: "2",
                emergencyId: emergencyId,
                senderId: currentUserId,
                senderName: "You",
                text: "Yes, I'm at the hospital now.",
                createdAt: Date().addingTimeInterval(-120),
                deliveredAt: Date().addingTimeInterval(-110),
                readAt: Date().addingTimeInterval(-100)
            )
        ]
    }
}

#Preview {
    NavigationView {
        ChatView(emergencyId: "123")
    }
}
