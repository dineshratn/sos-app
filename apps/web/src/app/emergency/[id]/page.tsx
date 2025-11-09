'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocationSocket } from '@/hooks/useLocationSocket';
import { useChatSocket } from '@/hooks/useChatSocket';
import LocationMap from '@/components/LocationMap';
import { apiClient } from '@/lib/api-client';
import { Emergency, EmergencyContact, LocationPoint } from '@/types';

export default function ActiveEmergencyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const emergencyId = params.id as string;

  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<any[]>([]);
  const [locationTrail, setLocationTrail] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const {
    connected: locationConnected,
    currentLocation,
    sendLocationUpdate,
  } = useLocationSocket(emergencyId);

  const {
    connected: chatConnected,
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
  } = useChatSocket(emergencyId);

  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    loadEmergencyData();
    startLocationTracking();
  }, [emergencyId]);

  const loadEmergencyData = async () => {
    try {
      const emergencyData = await apiClient.getEmergencyById(emergencyId);
      setEmergency(emergencyData.emergency);

      const contactsData = await apiClient.getContacts();
      setContacts(contactsData.contacts || []);

      const trailData = await apiClient.getLocationTrail(emergencyId);
      setLocationTrail(trailData.trail || []);

      // Load acknowledgments (would need API endpoint)
      // setAcknowledgments(acknowledgmentsData);
    } catch (error) {
      console.error('Failed to load emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    // Send location updates every 10 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          sendLocationUpdate(location);
          apiClient.updateLocation(emergencyId, location);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }, 10000);

    return () => clearInterval(intervalId);
  };

  const handleResolveEmergency = async () => {
    if (!confirm('Are you sure you want to resolve this emergency?')) return;

    try {
      setResolving(true);
      await apiClient.resolveEmergency(emergencyId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to resolve emergency:', error);
      alert('Failed to resolve emergency. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessage(messageInput);
    setMessageInput('');
    stopTyping();
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Emergency Not Found
          </h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Active Emergency
                </h1>
                <p className="text-sm text-gray-600">
                  Status:{' '}
                  <span className="font-semibold text-primary-600">
                    {emergency.status}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleResolveEmergency}
              disabled={resolving}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {resolving ? 'Resolving...' : 'Resolve Emergency'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                locationConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              Location {locationConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                chatConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              Chat {chatConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Map and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Map */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Location
                </h2>
                {currentLocation && (
                  <p className="text-sm text-gray-600 mt-1">
                    Lat: {currentLocation.latitude.toFixed(6)}, Lng:{' '}
                    {currentLocation.longitude.toFixed(6)}
                  </p>
                )}
              </div>
              <LocationMap
                currentLocation={currentLocation || undefined}
                locationTrail={locationTrail}
                height="500px"
                zoom={15}
              />
            </div>

            {/* Emergency Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Emergency Details
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Type:
                  </span>
                  <span className="ml-2 text-sm text-gray-900">
                    {emergency.type}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Triggered At:
                  </span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(emergency.triggeredAt).toLocaleString()}
                  </span>
                </div>
                {emergency.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      Description:
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {emergency.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Contacts and Chat */}
          <div className="space-y-6">
            {/* Emergency Contacts */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Emergency Contacts
              </h2>
              <div className="space-y-3">
                {contacts.slice(0, 5).map((contact) => {
                  const acknowledged = acknowledgments.some(
                    (ack) => ack.contactId === contact.id
                  );
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {contact.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {contact.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {contact.relationship}
                          </p>
                        </div>
                      </div>
                      {acknowledged ? (
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Section */}
            <div className="bg-white rounded-xl shadow-md flex flex-col h-96">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Emergency Chat
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm">
                    No messages yet. Start the conversation.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.id
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-lg p-3 ${
                          message.senderId === user?.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1">
                          {message.senderName}
                        </p>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg px-4 py-2">
                      <p className="text-sm text-gray-600 italic">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-200"
              >
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={!chatConnected}
                  />
                  <button
                    type="submit"
                    disabled={!chatConnected || !messageInput.trim()}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
