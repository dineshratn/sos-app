# Multi-stage build for Python service
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install -r requirements.txt

# Production/Debug stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies and debugger
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install debugpy for Python debugging
RUN pip install --upgrade pip debugpy

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . .

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 5000 5678

# Run with debugpy enabled
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "main.py"]
