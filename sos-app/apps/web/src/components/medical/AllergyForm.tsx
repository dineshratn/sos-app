'use client';

import { useState } from 'react';

interface AllergyFormProps {
  allergies: string[];
  onChange: (allergies: string[]) => void;
}

export default function AllergyForm({ allergies, onChange }: AllergyFormProps) {
  const [newAllergy, setNewAllergy] = useState('');

  const handleAdd = () => {
    if (newAllergy.trim()) {
      onChange([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(allergies.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allergies
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="e.g., Penicillin, Peanuts, Latex"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Press Enter or click Add to add an allergy
        </p>
      </div>

      {allergies.length > 0 && (
        <div className="space-y-2">
          {allergies.map((allergy, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <span className="text-sm text-gray-900">{allergy}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-red-600 hover:text-red-800"
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

      {allergies.length === 0 && (
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm text-gray-600">No allergies added</p>
        </div>
      )}
    </div>
  );
}
