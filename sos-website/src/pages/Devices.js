import React from 'react';

function Devices() {
  return (
    <div className="page-container">
      <h1 className="page-title">Device Management</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Monitor and manage IoT devices, wearables, and emergency equipment
      </p>
      <div className="card">
        <h3>Device Service Integration</h3>
        <p>Connected to Device Service for IoT device monitoring.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
          View All Devices
        </button>
      </div>
    </div>
  );
}

export default Devices;
