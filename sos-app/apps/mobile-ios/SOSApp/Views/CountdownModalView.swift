import SwiftUI

struct CountdownModalView: View {
    @Binding var isPresented: Bool
    let onComplete: () -> Void

    @State private var timeRemaining = 10
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .edgesIgnoringSafeArea(.all)

            VStack(spacing: 30) {
                Text("\(timeRemaining)")
                    .font(.system(size: 100, weight: .bold))
                    .foregroundColor(.red)
                    .scaleEffect(animationScale)
                    .animation(.easeInOut(duration: 0.5), value: timeRemaining)

                VStack(spacing: 10) {
                    Text("Emergency Alert Activating")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("Your emergency contacts will be notified in \(timeRemaining) seconds")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Progress Circle
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                        .frame(width: 60, height: 60)

                    Circle()
                        .trim(from: 0, to: CGFloat(10 - timeRemaining) / 10)
                        .stroke(Color.red, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 60, height: 60)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear, value: timeRemaining)
                }

                Button(action: {
                    cancelCountdown()
                }) {
                    Text("Cancel Emergency")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
                .padding(.top, 20)

                Text("Accidentally triggered? Tap cancel to stop the alert.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(30)
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(radius: 20)
            .padding(40)
        }
        .onAppear {
            startCountdown()
        }
    }

    private var animationScale: CGFloat {
        timeRemaining > 0 ? 1.0 : 0.8
    }

    private func startCountdown() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if timeRemaining > 0 {
                timeRemaining -= 1
                Haptics.impact(.light)
            } else {
                completeCountdown()
            }
        }
    }

    private func cancelCountdown() {
        timer?.invalidate()
        timer = nil
        isPresented = false
    }

    private func completeCountdown() {
        timer?.invalidate()
        timer = nil
        isPresented = false
        onComplete()
    }
}
