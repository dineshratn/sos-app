'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LocationMap from '@/components/LocationMap';
import { apiClient } from '@/lib/api-client';
import { exportEmergencyReport } from '@/utils/pdfExport';
import { Emergency, LocationPoint } from '@/types';
import { format } from 'date-fns';

export default function EmergencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const emergencyId = params.id as string;

  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [locationTrail, setLocationTrail] = useState<LocationPoint[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && emergencyId) {
      loadEmergencyDetails();
    }
  }, [user, emergencyId]);

  const loadEmergencyDetails = async () => {
    try {
      const emergencyData = await apiClient.getEmergencyById(emergencyId);
      setEmergency(emergencyData.emergency);

      const trailData = await apiClient.getLocationTrail(emergencyId);
      setLocationTrail(trailData.trail || []);

      // Load acknowledgments (would need API endpoint)
      // setAcknowledgments(ackData);
    } catch (error) {
      console.error('Failed to load emergency details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!emergency) return;

    try {
      setExporting(true);
      await exportEmergencyReport(emergency, locationTrail, acknowledgments);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
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
            onClick={() => router.push('/history')}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/history')}
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
                  Emergency Details
                </h1>
                <p className="text-sm text-gray-600">
                  {emergency.type} - {emergency.status}
                </p>
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Map */}
            {locationTrail.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Location Trail
                  </h2>
                  <p className="text-sm text-gray-600">
                    {locationTrail.length} location points tracked
                  </p>
                </div>
                <LocationMap
                  currentLocation={
                    locationTrail[locationTrail.length - 1]
                      ? {
                          latitude:
                            locationTrail[locationTrail.length - 1].latitude,
                          longitude:
                            locationTrail[locationTrail.length - 1].longitude,
                        }
                      : undefined
                  }
                  locationTrail={locationTrail}
                  height="400px"
                  zoom={14}
                />
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Emergency Timeline
              </h2>

              <div className="space-y-6">
                {/* Triggered */}
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Emergency Triggered
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(
                        new Date(emergency.triggeredAt),
                        'MMM d, yyyy h:mm:ss a'
                      )}
                    </p>
                    {emergency.description && (
                      <p className="text-sm text-gray-700 mt-2">
                        {emergency.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acknowledgments */}
                {acknowledgments.map((ack, index) => (
                  <div key={index} className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Contact Acknowledged
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(ack.acknowledgedAt),
                          'MMM d, yyyy h:mm:ss a'
                        )}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {ack.contactName} acknowledged the emergency
                      </p>
                    </div>
                  </div>
                ))}

                {/* Resolved */}
                {emergency.resolvedAt && (
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Emergency Resolved
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(emergency.resolvedAt),
                          'MMM d, yyyy h:mm:ss a'
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancelled */}
                {emergency.cancelledAt && (
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Emergency Cancelled
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(emergency.cancelledAt),
                          'MMM d, yyyy h:mm:ss a'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Summary
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Type</p>
                  <p className="text-base text-gray-900">{emergency.type}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-base text-gray-900">{emergency.status}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Duration
                  </p>
                  {emergency.resolvedAt ? (
                    <p className="text-base text-gray-900">
                      {Math.floor(
                        (new Date(emergency.resolvedAt).getTime() -
                          new Date(emergency.triggeredAt).getTime()) /
                          60000
                      )}{' '}
                      minutes
                    </p>
                  ) : emergency.cancelledAt ? (
                    <p className="text-base text-gray-900">
                      {Math.floor(
                        (new Date(emergency.cancelledAt).getTime() -
                          new Date(emergency.triggeredAt).getTime()) /
                          60000
                      )}{' '}
                      minutes
                    </p>
                  ) : (
                    <p className="text-base text-gray-900">-</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Location Points
                  </p>
                  <p className="text-base text-gray-900">
                    {locationTrail.length}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Acknowledgments
                  </p>
                  <p className="text-base text-gray-900">
                    {acknowledgments.length}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export Full Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
