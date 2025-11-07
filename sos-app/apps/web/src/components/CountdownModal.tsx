'use client';

import { useEffect, useState } from 'react';

interface CountdownModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onComplete: () => void;
  countdown?: number;
}

export default function CountdownModal({
  isOpen,
  onCancel,
  onComplete,
  countdown = 10,
}: CountdownModalProps) {
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdown);
      return;
    }

    if (timeLeft === 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, countdown, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="text-primary-500 text-6xl font-black animate-countdown">
          {timeLeft}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Emergency Alert Activating
          </h2>
          <p className="text-gray-600">
            Your emergency contacts will be notified in {timeLeft} seconds
          </p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-500 h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${((countdown - timeLeft) / countdown) * 100}%`,
            }}
          />
        </div>

        <button
          onClick={onCancel}
          className="w-full py-4 px-6 bg-gray-800 hover:bg-gray-900 text-white font-bold text-lg rounded-xl transition-colors"
        >
          Cancel Emergency
        </button>

        <p className="text-sm text-gray-500">
          Accidentally triggered? Click cancel to stop the alert.
        </p>
      </div>
    </div>
  );
}
