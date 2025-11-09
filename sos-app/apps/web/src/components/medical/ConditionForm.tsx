'use client';

import { useState } from 'react';

interface ConditionFormProps {
  conditions: string[];
  onChange: (conditions: string[]) => void;
}

export default function ConditionForm({
  conditions,
  onChange,
}: ConditionFormProps) {
  const [newCondition, setNewCondition] = useState('');

  const commonConditions = [
    'Diabetes',
    'Hypertension',
    'Asthma',
    'Heart Disease',
    'Epilepsy',
    'COPD',
    'Arthritis',
    'Cancer',
  ];

  const handleAdd = (condition: string) => {
    if (condition.trim() && !conditions.includes(condition.trim())) {
      onChange([...conditions, condition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Medical Conditions
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd(newCondition);
              }
            }}
            placeholder="e.g., Diabetes, Hypertension"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => handleAdd(newCondition)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Press Enter or click Add to add a condition
        </p>
      </div>

      {/* Quick Add Buttons */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Quick add:</p>
        <div className="flex flex-wrap gap-2">
          {commonConditions.map((condition) => (
            <button
              key={condition}
              type="button"
              onClick={() => handleAdd(condition)}
              disabled={conditions.includes(condition)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              + {condition}
            </button>
          ))}
        </div>
      </div>

      {conditions.length > 0 && (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <span className="text-sm text-gray-900">{condition}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-yellow-600 hover:text-yellow-800"
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

      {conditions.length === 0 && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">No medical conditions added</p>
        </div>
      )}
    </div>
  );
}
