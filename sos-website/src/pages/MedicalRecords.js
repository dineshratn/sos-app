import React from 'react';

function MedicalRecords() {
  return (
    <div className="page-container">
      <h1 className="page-title">Medical Records</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Access and manage patient medical records and health history
      </p>
      <div className="card">
        <h3>Medical Service Integration</h3>
        <p>Connected to Medical Service for health record management.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
          View Medical Records
        </button>
      </div>
    </div>
  );
}

export default MedicalRecords;
