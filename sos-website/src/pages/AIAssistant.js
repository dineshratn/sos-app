import React from 'react';

function AIAssistant() {
  return (
    <div className="page-container">
      <h1 className="page-title">AI Emergency Assistant</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Get AI-powered guidance and support for emergency situations
      </p>
      <div className="card">
        <h3>LLM Service Integration</h3>
        <p>Connected to AI Assistant Service for intelligent emergency response guidance.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Start Chat
        </button>
      </div>
    </div>
  );
}

export default AIAssistant;
