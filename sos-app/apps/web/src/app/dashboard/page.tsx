'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import EmergencyButton from '@/components/EmergencyButton';
import CountdownModal from '@/components/CountdownModal';
import { apiClient } from '@/lib/api-client';
import { EmergencyType } from '@/types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showCountdown, setShowCountdown] = useState(false);
  const [triggeringEmergency, setTriggeringEmergency] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEmergencies: 0,
    totalContacts: 0,
    profileComplete: 75,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load active emergency
      const activeEmergencyData = await apiClient.getActiveEmergency();
      if (activeEmergencyData.emergency) {
        setActiveEmergency(activeEmergencyData.emergency);
      }

      // Load contacts
      const contactsData = await apiClient.getContacts();
      setContacts(contactsData.contacts || []);

      // Load emergency history for stats
      const historyData = await apiClient.getEmergencyHistory({ limit: 100 });
      setStats((prev) => ({
        ...prev,
        totalEmergencies: historyData.total || 0,
        totalContacts: contactsData.contacts?.length || 0,
      }));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleEmergencyClick = () => {
    setShowCountdown(true);
  };

  const handleCancelCountdown = () => {
    setShowCountdown(false);
  };

  const handleTriggerEmergency = async () => {
    try {
      setTriggeringEmergency(true);
      setShowCountdown(false);

      // Get current location
      const location = await getCurrentLocation();

      // Trigger emergency
      const response = await apiClient.triggerEmergency({
        type: EmergencyType.OTHER,
        description: 'Emergency triggered from web dashboard',
        location,
      });

      setActiveEmergency(response.emergency);
      router.push(`/emergency/${response.emergency.id}`);
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
      alert('Failed to trigger emergency. Please try again.');
    } finally {
      setTriggeringEmergency(false);
    }
  };

  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Resolve with dummy coordinates if location access denied
          resolve({ latitude: 0, longitude: 0 });
        }
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-primary-500">SOS</span> Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.firstName}
              </span>
              <button
                onClick={() => router.push('/settings')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Emergency Alert */}
        {activeEmergency && (
          <div className="mb-8 bg-primary-50 border-2 border-primary-500 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary-900">
                    Active Emergency
                  </h3>
                  <p className="text-sm text-primary-700">
                    Emergency contacts have been notified
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/emergency/${activeEmergency.id}`)}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Emergency Contacts
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalContacts}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <button
              onClick={() => router.push('/contacts')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage Contacts →
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Past Emergencies
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalEmergencies}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <button
              onClick={() => router.push('/history')}
              className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View History →
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Profile Complete
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.profileComplete}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <button
              onClick={() => router.push('/medical')}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Complete Profile →
            </button>
          </div>
        </div>

        {/* Main Emergency Button */}
        <div className="bg-white rounded-2xl p-12 shadow-xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Emergency Alert
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Press the SOS button below to immediately alert your emergency
            contacts. They will receive your location and can communicate with
            you in real-time.
          </p>

          <div className="flex justify-center mb-8">
            <EmergencyButton
              onClick={handleEmergencyClick}
              disabled={!!activeEmergency || triggeringEmergency}
            />
          </div>

          {activeEmergency && (
            <p className="text-sm text-gray-500">
              You already have an active emergency. Resolve it before triggering
              a new one.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push('/contacts')}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Emergency Contacts
                </h3>
                <p className="text-sm text-gray-600">
                  Manage your emergency contact list
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/medical')}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Medical Profile</h3>
                <p className="text-sm text-gray-600">
                  Update your medical information
                </p>
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Countdown Modal */}
      <CountdownModal
        isOpen={showCountdown}
        onCancel={handleCancelCountdown}
        onComplete={handleTriggerEmergency}
        countdown={10}
      />
    </div>
  );
}
