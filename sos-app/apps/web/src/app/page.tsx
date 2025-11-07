import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold text-gray-900">
          <span className="text-primary-500">SOS</span> App
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Emergency alert system with real-time location sharing and instant notifications
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-8 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Register
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🚨</div>
            <h3 className="text-xl font-bold mb-2">Quick Alert</h3>
            <p className="text-gray-600">
              Trigger emergency alerts with a single button press
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-bold mb-2">Real-time Location</h3>
            <p className="text-gray-600">
              Share your location automatically with emergency contacts
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2">Instant Chat</h3>
            <p className="text-gray-600">
              Communicate with contacts during emergencies
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
