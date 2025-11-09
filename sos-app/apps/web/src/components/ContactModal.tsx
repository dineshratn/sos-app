'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EmergencyContact } from '@/types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => Promise<void>;
  contact?: EmergencyContact | null;
}

export interface ContactFormData {
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: string;
  priority: number;
}

export default function ContactModal({
  isOpen,
  onClose,
  onSave,
  contact,
}: ContactModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: contact
      ? {
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email || '',
          relationship: contact.relationship,
          priority: contact.priority,
        }
      : {
          priority: 1,
        },
  });

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email || '',
        relationship: contact.relationship,
        priority: contact.priority,
      });
    } else {
      reset({ priority: 1 });
    }
  }, [contact, reset]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      setSaving(true);
      setError(null);
      await onSave(data);
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number *
            </label>
            <input
              id="phoneNumber"
              type="tel"
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                  message: 'Invalid phone number',
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email (Optional)
            </label>
            <input
              id="email"
              type="email"
              {...register('email', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="relationship"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Relationship *
            </label>
            <select
              id="relationship"
              {...register('relationship', {
                required: 'Relationship is required',
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select relationship</option>
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Child">Child</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Colleague">Colleague</option>
              <option value="Neighbor">Neighbor</option>
              <option value="Other">Other</option>
            </select>
            {errors.relationship && (
              <p className="mt-1 text-sm text-red-600">
                {errors.relationship.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Priority *
            </label>
            <select
              id="priority"
              {...register('priority', {
                required: 'Priority is required',
                valueAsNumber: true,
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>1 (Primary - Contacted first)</option>
              <option value={2}>2 (Secondary - After 2 minutes)</option>
              <option value={3}>3 (Tertiary)</option>
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-red-600">
                {errors.priority.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Priority 1 contacts are notified immediately. Priority 2 contacts
              are notified after 2 minutes if no response.
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : contact ? 'Update' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
