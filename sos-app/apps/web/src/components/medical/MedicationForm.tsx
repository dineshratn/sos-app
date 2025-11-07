'use client';

import { useState } from 'react';
import { Medication } from '@/types';

interface MedicationFormProps {
  medications: Medication[];
  onChange: (medications: Medication[]) => void;
}

export default function MedicationForm({
  medications,
  onChange,
}: MedicationFormProps) {
  const [newMedication, setNewMedication] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: '',
  });

  const handleAdd = () => {
    if (newMedication.name.trim() && newMedication.dosage.trim()) {
      onChange([...medications, newMedication]);
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  const handleRemove = (index: number) => {
    onChange(medications.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Medications
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <input
            type="text"
            value={newMedication.name}
            onChange={(e) =>
              setNewMedication({ ...newMedication, name: e.target.value })
            }
            placeholder="Medication name"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            value={newMedication.dosage}
            onChange={(e) =>
              setNewMedication({ ...newMedication, dosage: e.target.value })
            }
            placeholder="Dosage (e.g., 500mg)"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            value={newMedication.frequency}
            onChange={(e) =>
              setNewMedication({ ...newMedication, frequency: e.target.value })
            }
            placeholder="Frequency (optional)"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newMedication.name.trim() || !newMedication.dosage.trim()}
          className="w-full md:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Medication
        </button>
      </div>

      {medications.length > 0 && (
        <div className="space-y-2">
          {medications.map((medication, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {medication.name}
                </p>
                <p className="text-sm text-gray-600">
                  Dosage: {medication.dosage}
                </p>
                {medication.frequency && (
                  <p className="text-sm text-gray-600">
                    Frequency: {medication.frequency}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-blue-600 hover:text-blue-800"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {medications.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-sm text-gray-600">No medications added</p>
        </div>
      )}
    </div>
  );
}
