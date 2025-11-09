#!/bin/bash

# SOS App Test Website - Quick Start Server
# This script starts a simple HTTP server to serve the test website

echo "🚨 SOS App - Service Testing Dashboard"
echo "========================================"
echo ""
echo "Starting HTTP server on port 8000..."
echo "Open your browser to: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "Error: Python is not installed"
    echo "Please install Python 3 or open index.html directly in your browser"
    exit 1
fi
