'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ContactModal, { ContactFormData } from '@/components/ContactModal';
import { apiClient } from '@/lib/api-client';
import { EmergencyContact } from '@/types';

export default function ContactsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      const response = await apiClient.getContacts();
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = () => {
    setSelectedContact(null);
    setShowModal(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleSaveContact = async (data: ContactFormData) => {
    if (selectedContact) {
      // Update existing contact
      await apiClient.updateContact(selectedContact.id, data);
    } else {
      // Add new contact
      await apiClient.addContact(data);
    }
    await loadContacts();
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${contactName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeleting(contactId);
      await apiClient.deleteContact(contactId);
      await loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-primary-100 text-primary-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      1: 'Primary',
      2: 'Secondary',
      3: 'Tertiary',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded ${
          colors[priority as keyof typeof colors] || colors[3]
        }`}
      >
        {labels[priority as keyof typeof labels] || 'Other'}
      </span>
    );
  };

  if (authLoading || loading) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
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
                  Emergency Contacts
                </h1>
                <p className="text-sm text-gray-600">
                  Manage your emergency contact list
                </p>
              </div>
            </div>

            <button
              onClick={handleAddContact}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                How Emergency Contacts Work
              </h3>
              <p className="text-sm text-blue-800 mt-1">
                When you trigger an emergency, all Priority 1 contacts are
                notified immediately via SMS, call, and push notification. If
                no one acknowledges within 2 minutes, Priority 2 contacts are
                notified. We recommend adding at least 3 contacts with
                different priority levels.
              </p>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No Contacts Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Add your first emergency contact to get started
            </p>
            <button
              onClick={handleAddContact}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts
              .sort((a, b) => a.priority - b.priority)
              .map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 text-xl font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {contact.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {contact.relationship}
                        </p>
                      </div>
                    </div>
                    {getPriorityBadge(contact.priority)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>{contact.phoneNumber}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{contact.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteContact(contact.id, contact.name)
                      }
                      disabled={deleting === contact.id}
                      className="flex-1 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {deleting === contact.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Contact Modal */}
      <ContactModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveContact}
        contact={selectedContact}
      />
    </div>
  );
}
