#!/bin/bash
# =============================================================================
# SOS App - Application Server User Data Script
# =============================================================================
# Purpose: Initialize application server with Docker and monitoring agents
# Instance Type: t3.large or larger (2 vCPU, 8GB RAM minimum)
# OS: Amazon Linux 2023 or Ubuntu 22.04
# Use Case: Standalone application server (non-Kubernetes)
# =============================================================================

set -euo pipefail

# Configuration
LOG_FILE="/var/log/user-data-setup.log"
SETUP_MARKER="/var/lib/cloud/instance/user-data-setup-complete"
APP_USER="${APP_USER:-sos-app}"
APP_DIR="/opt/sos-app"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting SOS App Application Server Setup"
log "=========================================="

# Check if setup already completed
if [ -f "$SETUP_MARKER" ]; then
    log "Setup already completed. Exiting."
    exit 0
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    log "Detected OS: $OS $VERSION"
else
    log "Cannot detect OS. Exiting."
    exit 1
fi

# Get instance metadata
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2 2>/dev/null || echo "unknown")
INSTANCE_TYPE=$(ec2-metadata --instance-type | cut -d " " -f 2 2>/dev/null || echo "unknown")
AZ=$(ec2-metadata --availability-zone | cut -d " " -f 2 2>/dev/null || echo "unknown")
PRIVATE_IP=$(ec2-metadata --local-ipv4 | cut -d " " -f 2 2>/dev/null || echo "unknown")

log "Instance ID: $INSTANCE_ID"
log "Instance Type: $INSTANCE_TYPE"
log "Availability Zone: $AZ"
log "Private IP: $PRIVATE_IP"

# =============================================================================
# System Updates and Base Packages
# =============================================================================

log "Step 1: Updating system packages..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum update -y
    yum install -y \
        git \
        curl \
        wget \
        unzip \
        tar \
        jq \
        vim \
        htop \
        iotop \
        iftop \
        sysstat \
        net-tools \
        bind-utils \
        telnet \
        nc \
        openssl \
        ca-certificates \
        chrony
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y \
        git \
        curl \
        wget \
        unzip \
        tar \
        jq \
        vim \
        htop \
        iotop \
        iftop \
        sysstat \
        net-tools \
        dnsutils \
        telnet \
        netcat \
        openssl \
        ca-certificates \
        chrony \
        apt-transport-https \
        software-properties-common
fi

# Enable and start time sync
systemctl enable chronyd || systemctl enable chrony
systemctl start chronyd || systemctl start chrony

log "System packages updated successfully"

# =============================================================================
# AWS CLI Installation
# =============================================================================

log "Step 2: Installing AWS CLI..."

if ! command -v aws &> /dev/null; then
    cd /tmp
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
    log "AWS CLI installed: $(aws --version)"
else
    log "AWS CLI already installed: $(aws --version)"
fi

# =============================================================================
# Docker Installation and Configuration
# =============================================================================

log "Step 3: Installing Docker..."

if ! command -v docker &> /dev/null; then
    if [ "$OS" = "amzn" ]; then
        yum install -y docker
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi

    log "Docker installed: $(docker --version)"
else
    log "Docker already installed: $(docker --version)"
fi

# Configure Docker daemon
log "Configuring Docker daemon..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "tag": "{{.Name}}/{{.ID}}"
  },
  "storage-driver": "overlay2",
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "dns": ["169.254.169.253", "8.8.8.8"],
  "dns-search": ["us-east-1.compute.internal"],
  "live-restore": true,
  "userland-proxy": false,
  "iptables": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

# Start and enable Docker
systemctl enable docker
systemctl start docker

# Create application user and add to docker group
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
    log "Created application user: $APP_USER"
fi

usermod -aG docker "$APP_USER"

log "Docker configured and started"

# =============================================================================
# Docker Compose Installation
# =============================================================================

log "Step 4: Installing Docker Compose..."

if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log "Docker Compose installed: $(docker-compose --version)"
fi

# =============================================================================
# Node Exporter (Prometheus Metrics)
# =============================================================================

log "Step 5: Installing Node Exporter..."

NODE_EXPORTER_VERSION="1.7.0"
cd /tmp
wget "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
tar -xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
mv "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/
rm -rf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64"*

# Create systemd service for Node Exporter
cat > /etc/systemd/system/node_exporter.service <<'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/node_exporter \
  --collector.filesystem.mount-points-exclude='^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)' \
  --collector.netclass.ignored-devices='^(veth.*|docker.*|br-.*)$'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

log "Node Exporter installed and started on port 9100"

# =============================================================================
# cAdvisor (Container Metrics)
# =============================================================================

log "Step 6: Installing cAdvisor..."

# Run cAdvisor as Docker container
docker run -d \
  --name=cadvisor \
  --restart=always \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --volume=/dev/disk/:/dev/disk:ro \
  --publish=8080:8080 \
  --detach=true \
  gcr.io/cadvisor/cadvisor:latest

log "cAdvisor installed and started on port 8080"

# =============================================================================
# Filebeat (Log Shipping to ELK)
# =============================================================================

log "Step 7: Installing Filebeat..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    rpm --import https://packages.elastic.co/GPG-KEY-elasticsearch
    cat > /etc/yum.repos.d/elastic.repo <<'EOF'
[elastic-8.x]
name=Elastic repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF
    yum install -y filebeat
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
    echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list
    apt-get update -y
    apt-get install -y filebeat
fi

# Configure Filebeat
cat > /etc/filebeat/filebeat.yml <<'EOF'
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/*.log
    - /var/log/messages
    - /var/log/syslog
  fields:
    service: system
    environment: ${ENVIRONMENT:dev}

- type: docker
  enabled: true
  containers.ids:
    - "*"
  fields:
    service: docker
    environment: ${ENVIRONMENT:dev}

filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

output.logstash:
  hosts: ["${LOGSTASH_HOST:logstash.logging.svc.cluster.local:5044}"]

setup.kibana:
  host: "${KIBANA_HOST:kibana.logging.svc.cluster.local:5601}"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
EOF

# Enable and start Filebeat (will fail to connect initially, but will retry)
systemctl enable filebeat
systemctl start filebeat 2>/dev/null || log "Filebeat will start once Logstash is available"

log "Filebeat configured"

# =============================================================================
# CloudWatch Logs Agent
# =============================================================================

log "Step 8: Installing CloudWatch Logs agent..."

if [ "$OS" = "amzn" ]; then
    yum install -y amazon-cloudwatch-agent
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    cd /tmp
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    dpkg -i amazon-cloudwatch-agent.deb
    rm -f amazon-cloudwatch-agent.deb
fi

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data-setup.log",
            "log_group_name": "/aws/ec2/sos-app/application",
            "log_stream_name": "{instance_id}/user-data-setup.log"
          },
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/sos-app/application",
            "log_stream_name": "{instance_id}/messages"
          },
          {
            "file_path": "/var/log/docker.log",
            "log_group_name": "/aws/ec2/sos-app/application",
            "log_stream_name": "{instance_id}/docker.log"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "SOS-App/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          },
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          {
            "name": "swap_used_percent",
            "rename": "SWAP_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

log "CloudWatch agent installed and started"

# =============================================================================
# System Tuning for Application Server
# =============================================================================

log "Step 9: Applying system tuning..."

# Increase file limits
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
$APP_USER soft nofile 65536
$APP_USER hard nofile 65536
EOF

# Sysctl tuning
cat >> /etc/sysctl.conf <<EOF
# Network tuning
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65536
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Memory tuning
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
vm.max_map_count = 262144

# File system tuning
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF

sysctl -p

log "System tuning applied"

# =============================================================================
# Application Directory Setup
# =============================================================================

log "Step 10: Setting up application directories..."

mkdir -p "$APP_DIR"/{app,logs,data,config,backups}
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Create docker-compose template
cat > "$APP_DIR/docker-compose.yml" <<'EOF'
version: '3.8'

services:
  # Example service configuration
  # Uncomment and modify as needed

  # app:
  #   image: ${ECR_REGISTRY}/sos-app-service:latest
  #   container_name: sos-app-service
  #   restart: unless-stopped
  #   ports:
  #     - "8080:8080"
  #   environment:
  #     - NODE_ENV=production
  #     - DATABASE_URL=${DATABASE_URL}
  #     - REDIS_URL=${REDIS_URL}
  #   volumes:
  #     - ./app:/app
  #     - ./logs:/var/log/app
  #   logging:
  #     driver: "json-file"
  #     options:
  #       max-size: "10m"
  #       max-file: "3"
  #   healthcheck:
  #     test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  #     interval: 30s
  #     timeout: 10s
  #     retries: 3
  #     start_period: 40s

networks:
  default:
    name: sos-app-network
EOF

chown "$APP_USER":"$APP_USER" "$APP_DIR/docker-compose.yml"

log "Application directories created at $APP_DIR"

# =============================================================================
# Automated Cleanup Script
# =============================================================================

log "Step 11: Setting up automated cleanup..."

cat > /usr/local/bin/cleanup-docker.sh <<'EOF'
#!/bin/bash
# Cleanup old Docker images and containers

echo "$(date): Starting Docker cleanup..."

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f --filter "until=168h"

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

echo "$(date): Docker cleanup completed"
EOF

chmod +x /usr/local/bin/cleanup-docker.sh

# Add cron job for weekly cleanup
echo "0 2 * * 0 /usr/local/bin/cleanup-docker.sh >> /var/log/docker-cleanup.log 2>&1" | crontab -

log "Automated cleanup configured"

# =============================================================================
# Health Check Script
# =============================================================================

log "Step 12: Creating health check script..."

cat > /usr/local/bin/health-check.sh <<'EOF'
#!/bin/bash
# Health check script for application server

echo "==================================="
echo "SOS App Server Health Check"
echo "Date: $(date)"
echo "==================================="

echo ""
echo "System Resources:"
echo "-----------------------------------"
echo "CPU Usage:"
mpstat 1 1 | grep Average

echo ""
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h /

echo ""
echo "Docker Status:"
echo "-----------------------------------"
systemctl status docker --no-pager | head -n 5

echo ""
echo "Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Docker Stats (5 second snapshot):"
timeout 5 docker stats --no-stream

echo ""
echo "Node Exporter Status:"
echo "-----------------------------------"
systemctl status node_exporter --no-pager | head -n 5
curl -s http://localhost:9100/metrics | grep "node_load" | head -n 3

echo ""
echo "==================================="
EOF

chmod +x /usr/local/bin/health-check.sh

log "Health check script created at /usr/local/bin/health-check.sh"

# =============================================================================
# Message of the Day (MOTD)
# =============================================================================

log "Step 13: Setting up MOTD..."

cat > /etc/motd <<EOF

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║             SOS App - Application Server                     ║
║                                                               ║
║  Instance: $INSTANCE_ID                            ║
║  Type: $INSTANCE_TYPE                                        ║
║  AZ: $AZ                                              ║
║  IP: $PRIVATE_IP                                     ║
║                                                               ║
║  Services Running:                                           ║
║    • Docker (port 9323 - metrics)                           ║
║    • Node Exporter (port 9100)                              ║
║    • cAdvisor (port 8080)                                   ║
║                                                               ║
║  Application Directory: $APP_DIR                      ║
║  Application User: $APP_USER                                 ║
║                                                               ║
║  Quick Commands:                                             ║
║    docker ps                  - List containers              ║
║    docker logs -f <container> - View container logs         ║
║    /usr/local/bin/health-check.sh - Run health check       ║
║    journalctl -u docker -f    - Docker service logs         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF

# =============================================================================
# Completion
# =============================================================================

log "Step 14: Finalizing setup..."

# Mark setup as complete
touch "$SETUP_MARKER"
echo "$(date)" > "$SETUP_MARKER"

# Run initial health check
/usr/local/bin/health-check.sh >> "$LOG_FILE" 2>&1

# Display summary
cat >> "$LOG_FILE" <<EOF

========================================
Setup Completed Successfully!
========================================

Instance Information:
  Instance ID: $INSTANCE_ID
  Instance Type: $INSTANCE_TYPE
  Availability Zone: $AZ
  Private IP: $PRIVATE_IP

Installed Components:
  ✓ Docker: $(docker --version)
  ✓ Docker Compose: $(docker-compose --version)
  ✓ AWS CLI: $(aws --version 2>&1 | head -n1)
  ✓ Node Exporter (metrics on port 9100)
  ✓ cAdvisor (metrics on port 8080)
  ✓ Filebeat (log shipping)
  ✓ CloudWatch Agent (logs & metrics)

Application Setup:
  App Directory: $APP_DIR
  App User: $APP_USER
  Docker Compose: $APP_DIR/docker-compose.yml

Monitoring Endpoints:
  Node Exporter: http://localhost:9100/metrics
  cAdvisor: http://localhost:8080/metrics
  Docker Metrics: http://localhost:9323/metrics

Logs:
  Setup Log: $LOG_FILE
  Application Logs: $APP_DIR/logs/
  Docker Cleanup Log: /var/log/docker-cleanup.log

Scripts:
  Health Check: /usr/local/bin/health-check.sh
  Docker Cleanup: /usr/local/bin/cleanup-docker.sh

Next Steps:
  1. Deploy your application using docker-compose
  2. Configure monitoring in Prometheus
  3. Check health: /usr/local/bin/health-check.sh

========================================
EOF

log "=========================================="
log "Application server setup completed successfully!"
log "Check $APP_DIR for application deployment"
log "=========================================="

exit 0
