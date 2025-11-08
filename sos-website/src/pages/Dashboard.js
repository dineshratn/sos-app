import React from 'react';
import { SERVICE_NAMES } from '../config';

function Dashboard() {
  const services = [
    {
      name: SERVICE_NAMES.AUTH,
      description: 'Secure authentication and authorization for all users',
      icon: '🔐',
    },
    {
      name: SERVICE_NAMES.USER,
      description: 'Comprehensive user profile and account management',
      icon: '👤',
    },
    {
      name: SERVICE_NAMES.MEDICAL,
      description: 'Medical records, history, and health data management',
      icon: '🏥',
    },
    {
      name: SERVICE_NAMES.LOCATION,
      description: 'Real-time GPS tracking and location services',
      icon: '📍',
    },
    {
      name: SERVICE_NAMES.NOTIFICATION,
      description: 'Push notifications and alert management system',
      icon: '🔔',
    },
    {
      name: SERVICE_NAMES.COMMUNICATION,
      description: 'Messaging and communication platform',
      icon: '💬',
    },
    {
      name: SERVICE_NAMES.DEVICE,
      description: 'IoT device management and monitoring',
      icon: '📱',
    },
    {
      name: SERVICE_NAMES.LLM,
      description: 'AI-powered assistant for emergency guidance',
      icon: '🤖',
    },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">Welcome to SOS Emergency Platform</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Comprehensive emergency response and healthcare management system with integrated services
      </p>

      <div className="card-grid">
        {services.map((service, index) => (
          <div className="card" key={index}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{service.icon}</div>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', background: '#f0f9ff', borderRadius: '8px' }}>
        <h2 style={{ color: '#667eea', marginBottom: '1rem' }}>Platform Features</h2>
        <ul style={{ color: '#666', lineHeight: '2', marginLeft: '2rem' }}>
          <li>Real-time emergency response coordination</li>
          <li>Integrated medical records management</li>
          <li>GPS-based location tracking</li>
          <li>Multi-channel communication system</li>
          <li>AI-powered emergency assistance</li>
          <li>IoT device monitoring and alerts</li>
          <li>Secure authentication and data privacy</li>
          <li>Scalable microservices architecture</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
