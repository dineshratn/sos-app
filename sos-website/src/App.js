import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import ServiceStatus from './pages/ServiceStatus';
import UserManagement from './pages/UserManagement';
import MedicalRecords from './pages/MedicalRecords';
import Devices from './pages/Devices';
import AIAssistant from './pages/AIAssistant';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="logo">🚨 SOS Emergency Platform</h1>
            <ul className="nav-menu">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/status">Service Status</Link></li>
              <li><Link to="/users">Users</Link></li>
              <li><Link to="/medical">Medical Records</Link></li>
              <li><Link to="/devices">Devices</Link></li>
              <li><Link to="/ai">AI Assistant</Link></li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/status" element={<ServiceStatus />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/medical" element={<MedicalRecords />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/ai" element={<AIAssistant />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2025 SOS Emergency Services Platform. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
