import React from 'react';

function UserManagement() {
  return (
    <div className="page-container">
      <h1 className="page-title">User Management</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Manage user accounts, roles, and permissions across the SOS platform
      </p>
      <div className="card">
        <h3>User Service Integration</h3>
        <p>Connected to User Service for account management operations.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
          View All Users
        </button>
      </div>
    </div>
  );
}

export default UserManagement;
