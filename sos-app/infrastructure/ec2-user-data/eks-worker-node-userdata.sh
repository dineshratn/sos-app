#!/bin/bash
# =============================================================================
# SOS App - EKS Worker Node User Data Script
# =============================================================================
# Purpose: Additional configuration for EKS worker nodes beyond AWS defaults
# Instance Type: t3.xlarge or larger (4 vCPU, 16GB RAM minimum)
# OS: Amazon Linux 2 (AL2) - EKS Optimized AMI
# Note: This supplements the default EKS bootstrap script
# =============================================================================

set -euo pipefail

# Configuration
LOG_FILE="/var/log/eks-custom-setup.log"
CLUSTER_NAME="${CLUSTER_NAME:-sos-app-dev-eks}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting EKS Worker Node Custom Setup"
log "Cluster: $CLUSTER_NAME"
log "Region: $AWS_REGION"
log "=========================================="

# Get instance metadata
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)
INSTANCE_TYPE=$(ec2-metadata --instance-type | cut -d " " -f 2)
AZ=$(ec2-metadata --availability-zone | cut -d " " -f 2)
PRIVATE_IP=$(ec2-metadata --local-ipv4 | cut -d " " -f 2)

log "Instance ID: $INSTANCE_ID"
log "Instance Type: $INSTANCE_TYPE"
log "Availability Zone: $AZ"
log "Private IP: $PRIVATE_IP"

# =============================================================================
# System Tuning for Kubernetes
# =============================================================================

log "Step 1: Applying Kubernetes-specific system tuning..."

# Kernel parameters for Kubernetes
cat >> /etc/sysctl.d/99-kubernetes.conf <<EOF
# Kubernetes network tuning
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
net.ipv4.conf.all.forwarding = 1

# Increase connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.netfilter.nf_conntrack_tcp_timeout_established = 86400
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 3600

# Network performance
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 16384
net.ipv4.tcp_max_syn_backlog = 8096
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Memory tuning
vm.swappiness = 0
vm.overcommit_memory = 1
vm.panic_on_oom = 0
vm.max_map_count = 262144

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 8192
EOF

sysctl -p /etc/sysctl.d/99-kubernetes.conf

log "System tuning applied"

# =============================================================================
# Increase File Limits
# =============================================================================

log "Step 2: Increasing file limits..."

cat >> /etc/security/limits.conf <<EOF
* soft nofile 1048576
* hard nofile 1048576
* soft nproc 1048576
* hard nproc 1048576
* soft memlock unlimited
* hard memlock unlimited
EOF

# =============================================================================
# Docker Daemon Configuration
# =============================================================================

log "Step 3: Configuring Docker daemon..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "bridge": "none",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5",
    "labels": "production_status",
    "env": "os,customer"
  },
  "live-restore": true,
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 10,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 1048576,
      "Soft": 1048576
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 1048576,
      "Soft": 1048576
    }
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
EOF

# Restart Docker
systemctl restart docker

log "Docker daemon configured"

# =============================================================================
# Kubelet Configuration
# =============================================================================

log "Step 4: Configuring kubelet..."

# Additional kubelet arguments
cat > /etc/sysconfig/kubelet <<EOF
KUBELET_EXTRA_ARGS="--node-labels=node.kubernetes.io/lifecycle=normal,workload=application --max-pods=110 --kube-reserved=cpu=250m,memory=1Gi,ephemeral-storage=1Gi --system-reserved=cpu=250m,memory=1Gi,ephemeral-storage=1Gi --eviction-hard=memory.available<500Mi,nodefs.available<10%"
EOF

log "Kubelet configured"

# =============================================================================
# Install Additional Monitoring Tools
# =============================================================================

log "Step 5: Installing additional monitoring tools..."

# Install SSM agent (if not already installed)
if ! command -v amazon-ssm-agent &> /dev/null; then
    yum install -y amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
    log "SSM Agent installed"
fi

# Install CloudWatch agent
if ! command -v amazon-cloudwatch-agent &> /dev/null; then
    yum install -y amazon-cloudwatch-agent
    log "CloudWatch Agent installed"
fi

# Configure CloudWatch agent for EKS
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
            "file_path": "/var/log/eks-custom-setup.log",
            "log_group_name": "/aws/eks/${CLUSTER_NAME}/worker-nodes",
            "log_stream_name": "{instance_id}/custom-setup.log"
          },
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/eks/${CLUSTER_NAME}/worker-nodes",
            "log_stream_name": "{instance_id}/messages"
          },
          {
            "file_path": "/var/log/docker",
            "log_group_name": "/aws/eks/${CLUSTER_NAME}/worker-nodes",
            "log_stream_name": "{instance_id}/docker.log"
          },
          {
            "file_path": "/var/log/kubelet.log",
            "log_group_name": "/aws/eks/${CLUSTER_NAME}/worker-nodes",
            "log_stream_name": "{instance_id}/kubelet.log"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "EKS/WorkerNodes",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {"name": "cpu_usage_idle"},
          {"name": "cpu_usage_iowait"}
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {"name": "used_percent"},
          {"name": "inodes_free"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent"}
        ],
        "metrics_collection_interval": 60
      },
      "net": {
        "measurement": [
          {"name": "bytes_sent"},
          {"name": "bytes_recv"},
          {"name": "drop_in"},
          {"name": "drop_out"}
        ],
        "metrics_collection_interval": 60
      }
    },
    "append_dimensions": {
      "InstanceId": "${INSTANCE_ID}",
      "InstanceType": "${INSTANCE_TYPE}",
      "ClusterName": "${CLUSTER_NAME}"
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

log "CloudWatch agent configured and started"

# =============================================================================
# Disk Space Monitoring
# =============================================================================

log "Step 6: Setting up disk space monitoring..."

cat > /usr/local/bin/check-disk-space.sh <<'EOF'
#!/bin/bash
# Check disk space and clean up Docker if needed

THRESHOLD=80
CURRENT=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    echo "$(date): Disk usage is ${CURRENT}%, threshold is ${THRESHOLD}%"
    echo "$(date): Cleaning up Docker images and containers..."

    # Remove stopped containers
    docker container prune -f

    # Remove dangling images
    docker image prune -f

    # If still above threshold, remove all unused images
    CURRENT=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$CURRENT" -gt "$THRESHOLD" ]; then
        docker image prune -a -f --filter "until=24h"
    fi

    echo "$(date): Cleanup completed. Current usage: $(df -h / | awk 'NR==2 {print $5}')"
fi
EOF

chmod +x /usr/local/bin/check-disk-space.sh

# Add cron job
echo "*/30 * * * * /usr/local/bin/check-disk-space.sh >> /var/log/disk-cleanup.log 2>&1" | crontab -

log "Disk space monitoring configured"

# =============================================================================
# EBS Volume Optimization
# =============================================================================

log "Step 7: Optimizing EBS volumes..."

# Enable EBS volume auto-expansion awareness
cat > /usr/local/bin/expand-ebs-volume.sh <<'EOF'
#!/bin/bash
# Automatically expand filesystem when EBS volume is resized

DEVICE="/dev/nvme0n1p1"  # Adjust based on your root device
MOUNT_POINT="/"

# Get current size
CURRENT_SIZE=$(df -BG "$MOUNT_POINT" | awk 'NR==2 {print $2}' | sed 's/G//')

# Check if device exists
if [ -b "$DEVICE" ]; then
    # Resize partition
    growpart /dev/nvme0n1 1 2>/dev/null || true

    # Resize filesystem
    if [[ $(file -s "$DEVICE") == *"ext4"* ]]; then
        resize2fs "$DEVICE" 2>/dev/null || true
    elif [[ $(file -s "$DEVICE") == *"xfs"* ]]; then
        xfs_growfs "$MOUNT_POINT" 2>/dev/null || true
    fi

    NEW_SIZE=$(df -BG "$MOUNT_POINT" | awk 'NR==2 {print $2}' | sed 's/G//')

    if [ "$NEW_SIZE" -gt "$CURRENT_SIZE" ]; then
        echo "$(date): EBS volume expanded from ${CURRENT_SIZE}G to ${NEW_SIZE}G"
    fi
fi
EOF

chmod +x /usr/local/bin/expand-ebs-volume.sh

log "EBS volume optimization configured"

# =============================================================================
# Node Labels and Taints (Optional)
# =============================================================================

log "Step 8: Preparing node customization..."

# This script can be used post-bootstrap to add custom labels/taints
cat > /usr/local/bin/customize-node.sh <<EOF
#!/bin/bash
# Customize node after it joins the cluster

# Wait for node to be ready
sleep 60

# Get node name
NODE_NAME=\$(kubectl get nodes -o json | jq -r '.items[] | select(.status.addresses[] | select(.type=="InternalIP" and .address=="$PRIVATE_IP")) | .metadata.name')

if [ -n "\$NODE_NAME" ]; then
    echo "Node \$NODE_NAME found in cluster"

    # Add custom labels (example)
    # kubectl label node \$NODE_NAME environment=production --overwrite
    # kubectl label node \$NODE_NAME team=platform --overwrite

    # Add taints if needed (example)
    # kubectl taint nodes \$NODE_NAME dedicated=gpu:NoSchedule --overwrite

    echo "Node customization completed"
else
    echo "Node not found in cluster yet"
fi
EOF

chmod +x /usr/local/bin/customize-node.sh

log "Node customization script created"

# =============================================================================
# Performance Monitoring
# =============================================================================

log "Step 9: Setting up performance monitoring..."

# Install sysstat for performance monitoring
yum install -y sysstat
systemctl enable sysstat
systemctl start sysstat

# Create performance report script
cat > /usr/local/bin/performance-report.sh <<'EOF'
#!/bin/bash
# Generate performance report

echo "=========================================="
echo "EKS Worker Node Performance Report"
echo "Date: $(date)"
echo "Node: $(hostname)"
echo "=========================================="

echo ""
echo "CPU Usage (last 5 minutes):"
sar -u 1 5

echo ""
echo "Memory Usage:"
free -h

echo ""
echo "Disk I/O:"
iostat -x 1 3

echo ""
echo "Network Statistics:"
sar -n DEV 1 3

echo ""
echo "Top Processes by CPU:"
ps aux --sort=-%cpu | head -n 11

echo ""
echo "Top Processes by Memory:"
ps aux --sort=-%mem | head -n 11

echo ""
echo "Docker Container Stats:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "Kubernetes Pod Count:"
kubectl get pods --all-namespaces --field-selector spec.nodeName=$(hostname) --no-headers 2>/dev/null | wc -l

echo "=========================================="
EOF

chmod +x /usr/local/bin/performance-report.sh

log "Performance monitoring configured"

# =============================================================================
# Bootstrap EKS Node
# =============================================================================

log "Step 10: Bootstrapping EKS node..."

# This is the standard EKS bootstrap script
# Customize B64_CLUSTER_CA, API_SERVER_URL, CLUSTER_NAME as needed
/etc/eks/bootstrap.sh "${CLUSTER_NAME}" \
  --b64-cluster-ca "${B64_CLUSTER_CA:-}" \
  --apiserver-endpoint "${API_SERVER_URL:-}" \
  --dns-cluster-ip "172.20.0.10" \
  --kubelet-extra-args "--node-labels=node.kubernetes.io/lifecycle=normal,workload=application --max-pods=110"

log "EKS bootstrap completed"

# =============================================================================
# Post-Bootstrap Configuration
# =============================================================================

log "Step 11: Running post-bootstrap configuration..."

# Wait for kubelet to be ready
sleep 30

# Run node customization (in background)
nohup /usr/local/bin/customize-node.sh > /var/log/node-customization.log 2>&1 &

log "Post-bootstrap configuration initiated"

# =============================================================================
# Message of the Day
# =============================================================================

cat > /etc/motd <<EOF

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           SOS App - EKS Worker Node                          ║
║                                                               ║
║  Cluster: ${CLUSTER_NAME}                           ║
║  Instance: ${INSTANCE_ID}                            ║
║  Type: ${INSTANCE_TYPE}                                      ║
║  AZ: ${AZ}                                              ║
║                                                               ║
║  Custom Configuration Applied:                               ║
║    • Kubernetes-optimized system tuning                     ║
║    • CloudWatch monitoring                                   ║
║    • Automated disk cleanup                                  ║
║    • Performance monitoring                                  ║
║                                                               ║
║  Useful Commands:                                            ║
║    kubectl get nodes                                         ║
║    docker ps                                                 ║
║    /usr/local/bin/performance-report.sh                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF

# =============================================================================
# Completion
# =============================================================================

log "=========================================="
log "EKS Worker Node Setup Completed"
log "Instance $INSTANCE_ID is ready"
log "=========================================="

# Display summary
cat >> "$LOG_FILE" <<EOF

Setup Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instance Details:
  ID: $INSTANCE_ID
  Type: $INSTANCE_TYPE
  AZ: $AZ
  IP: $PRIVATE_IP

Cluster Information:
  Name: $CLUSTER_NAME
  Region: $AWS_REGION

Configured Features:
  ✓ Kubernetes-optimized system tuning
  ✓ Docker daemon optimization
  ✓ Kubelet custom configuration
  ✓ CloudWatch Logs and Metrics
  ✓ SSM Agent for remote management
  ✓ Automated disk space management
  ✓ Performance monitoring tools
  ✓ EBS volume auto-expansion

Monitoring:
  CloudWatch Log Group: /aws/eks/${CLUSTER_NAME}/worker-nodes
  CloudWatch Namespace: EKS/WorkerNodes

Scripts:
  Performance Report: /usr/local/bin/performance-report.sh
  Disk Cleanup: /usr/local/bin/check-disk-space.sh
  Node Customization: /usr/local/bin/customize-node.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

exit 0
