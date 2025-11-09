'use client';

import { useState, useEffect } from 'react';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        // Show prompt after 3 seconds
        const timer = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShow(false);

      if (result === 'granted') {
        new Notification('SOS App', {
          body: 'You will now receive emergency notifications',
          icon: '/icon-192.png',
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Store dismissed state in localStorage
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!show || permission !== 'default') return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 p-6 z-50 animate-slide-up">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg
            className="w-10 h-10 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Enable Notifications
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Get instant alerts when emergency contacts trigger an SOS or
            acknowledge your emergencies.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleEnableNotifications}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
