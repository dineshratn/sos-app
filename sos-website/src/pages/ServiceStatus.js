import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, SERVICE_NAMES } from '../config';
import { checkServiceHealth } from '../services/api';

function ServiceStatus() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAllServices();
  }, []);

  const checkAllServices = async () => {
    setLoading(true);
    const serviceChecks = [
      { name: SERVICE_NAMES.AUTH, endpoint: API_ENDPOINTS.AUTH_SERVICE },
      { name: SERVICE_NAMES.USER, endpoint: API_ENDPOINTS.USER_SERVICE },
      { name: SERVICE_NAMES.MEDICAL, endpoint: API_ENDPOINTS.MEDICAL_SERVICE },
      { name: SERVICE_NAMES.LOCATION, endpoint: API_ENDPOINTS.LOCATION_SERVICE },
      { name: SERVICE_NAMES.NOTIFICATION, endpoint: API_ENDPOINTS.NOTIFICATION_SERVICE },
      { name: SERVICE_NAMES.COMMUNICATION, endpoint: API_ENDPOINTS.COMMUNICATION_SERVICE },
      { name: SERVICE_NAMES.DEVICE, endpoint: API_ENDPOINTS.DEVICE_SERVICE },
      { name: SERVICE_NAMES.LLM, endpoint: API_ENDPOINTS.LLM_SERVICE },
    ];

    const results = await Promise.all(
      serviceChecks.map(({ name, endpoint }) => checkServiceHealth(name, endpoint))
    );

    setServices(results);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Checking service status...</p>
        </div>
      </div>
    );
  }

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;

  return (
    <div className="page-container">
      <h1 className="page-title">Service Status Monitor</h1>

      <div style={{
        background: healthyCount === totalCount ? '#d1fae5' : '#fee2e2',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '0.5rem' }}>
          {healthyCount}/{totalCount} Services Online
        </h2>
        <p style={{ color: '#666' }}>
          {healthyCount === totalCount
            ? '✅ All systems operational'
            : '⚠️ Some services are experiencing issues'}
        </p>
      </div>

      <button className="btn btn-primary" onClick={checkAllServices} style={{ marginBottom: '2rem' }}>
        🔄 Refresh Status
      </button>

      <div className="card-grid">
        {services.map((service, index) => (
          <div className="card" key={index}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{service.service}</h3>
              <span className={`status-indicator status-${service.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
                {service.status === 'healthy' ? '✓ Healthy' : '✗ Unhealthy'}
              </span>
            </div>
            {service.error && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                Error: {service.error}
              </p>
            )}
            {service.data && (
              <p style={{ color: '#10b981', fontSize: '0.875rem' }}>
                Response time: {service.data.timestamp ? 'OK' : 'N/A'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServiceStatus;
