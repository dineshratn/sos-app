const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const SERVICE_NAME = 'user-service';
const VERSION = '1.0.0';

app.use(express.json());

// Health check endpoints (Kubernetes probe format)
app.get('/health/startup', (req, res) => {
  res.json({
    status: 'started',
    service: SERVICE_NAME,
    version: VERSION
  });
});

app.get('/health/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    version: VERSION
  });
});

app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    service: SERVICE_NAME,
    version: VERSION
  });
});

// Legacy health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: VERSION,
    description: 'SOS App User Service',
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`${SERVICE_NAME} v${VERSION} listening on port ${PORT}`);
});
