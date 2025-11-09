#!/bin/bash
# =============================================================================
# SOS App - Bastion Host User Data Script
# =============================================================================
# Purpose: Initialize bastion/jump host with all deployment and management tools
# Instance Type: t3.medium or larger (2 vCPU, 4GB RAM minimum)
# OS: Amazon Linux 2023 or Ubuntu 22.04
# =============================================================================

set -euo pipefail

# Configuration
LOG_FILE="/var/log/user-data-setup.log"
SETUP_MARKER="/var/lib/cloud/instance/user-data-setup-complete"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting SOS App Bastion Host Setup"
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

# =============================================================================
# System Updates
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
        nano \
        htop \
        tree \
        tmux \
        screen \
        net-tools \
        bind-utils \
        telnet \
        nc \
        openssl \
        ca-certificates \
        bash-completion
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
        nano \
        htop \
        tree \
        tmux \
        screen \
        net-tools \
        dnsutils \
        telnet \
        netcat \
        openssl \
        ca-certificates \
        bash-completion \
        apt-transport-https \
        software-properties-common
fi

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

# Configure AWS CLI bash completion
echo 'complete -C '/usr/local/bin/aws_completer' aws' >> /etc/bash.bashrc

# =============================================================================
# Docker Installation
# =============================================================================

log "Step 3: Installing Docker..."

if ! command -v docker &> /dev/null; then
    if [ "$OS" = "amzn" ]; then
        # Amazon Linux 2023
        yum install -y docker
        systemctl enable docker
        systemctl start docker
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Ubuntu/Debian
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable docker
        systemctl start docker
    fi

    # Add default user to docker group
    usermod -aG docker ec2-user 2>/dev/null || usermod -aG docker ubuntu 2>/dev/null || true

    log "Docker installed: $(docker --version)"
else
    log "Docker already installed: $(docker --version)"
fi

# Install Docker Compose (standalone)
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log "Docker Compose installed: $(docker-compose --version)"
fi

# =============================================================================
# Kubectl Installation
# =============================================================================

log "Step 4: Installing kubectl..."

if ! command -v kubectl &> /dev/null; then
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    mv kubectl /usr/local/bin/
    log "kubectl installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
else
    log "kubectl already installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
fi

# Configure kubectl bash completion
kubectl completion bash > /etc/bash_completion.d/kubectl

# =============================================================================
# eksctl Installation
# =============================================================================

log "Step 5: Installing eksctl..."

if ! command -v eksctl &> /dev/null; then
    curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
    mv /tmp/eksctl /usr/local/bin
    chmod +x /usr/local/bin/eksctl
    log "eksctl installed: $(eksctl version)"
else
    log "eksctl already installed: $(eksctl version)"
fi

# Configure eksctl bash completion
eksctl completion bash > /etc/bash_completion.d/eksctl

# =============================================================================
# Helm Installation
# =============================================================================

log "Step 6: Installing Helm..."

if ! command -v helm &> /dev/null; then
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    log "Helm installed: $(helm version --short)"
else
    log "Helm already installed: $(helm version --short)"
fi

# Configure Helm bash completion
helm completion bash > /etc/bash_completion.d/helm

# Add common Helm repositories
log "Adding common Helm repositories..."
helm repo add stable https://charts.helm.sh/stable 2>/dev/null || true
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
helm repo update 2>/dev/null || true

# =============================================================================
# Terraform Installation
# =============================================================================

log "Step 7: Installing Terraform..."

if ! command -v terraform &> /dev/null; then
    TERRAFORM_VERSION="1.6.6"
    cd /tmp
    wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
    unzip -q "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
    mv terraform /usr/local/bin/
    chmod +x /usr/local/bin/terraform
    rm -f "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
    log "Terraform installed: $(terraform version)"
else
    log "Terraform already installed: $(terraform version)"
fi

# Configure Terraform bash completion
terraform -install-autocomplete 2>/dev/null || true

# =============================================================================
# k9s Installation (Kubernetes CLI UI)
# =============================================================================

log "Step 8: Installing k9s..."

if ! command -v k9s &> /dev/null; then
    K9S_VERSION=$(curl -s https://api.github.com/repos/derailed/k9s/releases/latest | jq -r .tag_name)
    cd /tmp
    wget "https://github.com/derailed/k9s/releases/download/${K9S_VERSION}/k9s_Linux_amd64.tar.gz"
    tar -xzf k9s_Linux_amd64.tar.gz
    mv k9s /usr/local/bin/
    chmod +x /usr/local/bin/k9s
    rm -f k9s_Linux_amd64.tar.gz
    log "k9s installed: $(k9s version --short)"
else
    log "k9s already installed"
fi

# =============================================================================
# Additional CLI Tools
# =============================================================================

log "Step 9: Installing additional CLI tools..."

# stern (multi-pod log tailing)
if ! command -v stern &> /dev/null; then
    STERN_VERSION=$(curl -s https://api.github.com/repos/stern/stern/releases/latest | jq -r .tag_name)
    cd /tmp
    wget "https://github.com/stern/stern/releases/download/${STERN_VERSION}/stern_${STERN_VERSION#v}_linux_amd64.tar.gz"
    tar -xzf "stern_${STERN_VERSION#v}_linux_amd64.tar.gz"
    mv stern /usr/local/bin/
    chmod +x /usr/local/bin/stern
    rm -f "stern_${STERN_VERSION#v}_linux_amd64.tar.gz"
    log "stern installed"
fi

# kubectx and kubens (context and namespace switching)
if ! command -v kubectx &> /dev/null; then
    cd /tmp
    git clone https://github.com/ahmetb/kubectx.git
    mv kubectx/kubectx /usr/local/bin/
    mv kubectx/kubens /usr/local/bin/
    chmod +x /usr/local/bin/kubectx /usr/local/bin/kubens
    rm -rf kubectx
    log "kubectx and kubens installed"
fi

# kustomize
if ! command -v kustomize &> /dev/null; then
    cd /tmp
    curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
    mv kustomize /usr/local/bin/
    chmod +x /usr/local/bin/kustomize
    log "kustomize installed"
fi

# yq (YAML processor)
if ! command -v yq &> /dev/null; then
    YQ_VERSION=$(curl -s https://api.github.com/repos/mikefarah/yq/releases/latest | jq -r .tag_name)
    cd /tmp
    wget "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64"
    mv yq_linux_amd64 /usr/local/bin/yq
    chmod +x /usr/local/bin/yq
    log "yq installed: $(yq --version)"
fi

# =============================================================================
# Monitoring and Observability Tools
# =============================================================================

log "Step 10: Installing monitoring tools..."

# Prometheus CLI (promtool)
if ! command -v promtool &> /dev/null; then
    PROM_VERSION=$(curl -s https://api.github.com/repos/prometheus/prometheus/releases/latest | jq -r .tag_name)
    cd /tmp
    wget "https://github.com/prometheus/prometheus/releases/download/${PROM_VERSION}/prometheus-${PROM_VERSION#v}.linux-amd64.tar.gz"
    tar -xzf "prometheus-${PROM_VERSION#v}.linux-amd64.tar.gz"
    mv "prometheus-${PROM_VERSION#v}.linux-amd64/promtool" /usr/local/bin/
    chmod +x /usr/local/bin/promtool
    rm -rf "prometheus-${PROM_VERSION#v}.linux-amd64"*
    log "promtool installed"
fi

# =============================================================================
# Database Client Tools
# =============================================================================

log "Step 11: Installing database client tools..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    # PostgreSQL client
    yum install -y postgresql15 2>/dev/null || yum install -y postgresql 2>/dev/null || true

    # MongoDB client
    cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
    yum install -y mongodb-mongosh 2>/dev/null || yum install -y mongodb-org-shell 2>/dev/null || true

    # Redis client
    yum install -y redis 2>/dev/null || true

elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # PostgreSQL client
    apt-get install -y postgresql-client

    # MongoDB client
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -y
    apt-get install -y mongodb-mongosh 2>/dev/null || apt-get install -y mongodb-org-shell 2>/dev/null || true

    # Redis client
    apt-get install -y redis-tools
fi

log "Database clients installed"

# =============================================================================
# Load Testing Tools
# =============================================================================

log "Step 12: Installing load testing tools..."

# k6 (load testing)
if ! command -v k6 &> /dev/null; then
    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        cd /tmp
        wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.rpm
        yum install -y k6-v0.48.0-linux-amd64.rpm
        rm -f k6-v0.48.0-linux-amd64.rpm
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list
        apt-get update -y
        apt-get install -y k6
    fi
    log "k6 installed: $(k6 version)"
fi

# Apache Bench
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum install -y httpd-tools
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get install -y apache2-utils
fi

# =============================================================================
# Python and pip
# =============================================================================

log "Step 13: Installing Python and pip..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum install -y python3 python3-pip
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get install -y python3 python3-pip
fi

# Install useful Python packages
pip3 install --upgrade pip
pip3 install \
    awscli-plugin-endpoint \
    boto3 \
    requests \
    pyyaml \
    kubernetes

log "Python and pip installed: $(python3 --version)"

# =============================================================================
# Node.js and npm (for testing)
# =============================================================================

log "Step 14: Installing Node.js..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - 2>/dev/null || true
    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        yum install -y nodejs
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    log "Node.js installed: $(node --version)"
else
    log "Node.js already installed: $(node --version)"
fi

# =============================================================================
# Git Configuration
# =============================================================================

log "Step 15: Configuring Git..."

git config --global core.editor vim
git config --global color.ui auto
git config --global pull.rebase false

# =============================================================================
# Bash Aliases and Environment
# =============================================================================

log "Step 16: Setting up bash aliases and environment..."

cat >> /etc/profile.d/sos-app-aliases.sh <<'EOF'
# SOS App Bash Aliases and Functions

# Kubernetes aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kgn='kubectl get nodes'
alias kdp='kubectl describe pod'
alias kds='kubectl describe service'
alias kdd='kubectl describe deployment'
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias kex='kubectl exec -it'
alias kctx='kubectx'
alias kns='kubens'

# Helm aliases
alias h='helm'
alias hls='helm list'
alias hin='helm install'
alias hup='helm upgrade'
alias hun='helm uninstall'

# Docker aliases
alias d='docker'
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
alias dex='docker exec -it'
alias dl='docker logs'
alias dlf='docker logs -f'

# AWS aliases
alias ec2-list='aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,InstanceType,State.Name,PrivateIpAddress,Tags[?Key=='\''Name'\''].Value|[0]]" --output table'
alias rds-list='aws rds describe-db-instances --query "DBInstances[].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus]" --output table'
alias eks-list='aws eks list-clusters --output table'

# Terraform aliases
alias tf='terraform'
alias tfi='terraform init'
alias tfp='terraform plan'
alias tfa='terraform apply'
alias tfd='terraform destroy'
alias tfo='terraform output'

# Navigation
alias ll='ls -alh'
alias la='ls -A'
alias l='ls -CF'

# Functions
kpods() {
    kubectl get pods -n ${1:-sos-app}
}

klogs() {
    kubectl logs -f -n ${2:-sos-app} $1
}

kexec() {
    kubectl exec -it -n ${2:-sos-app} $1 -- /bin/bash
}

# Set default namespace
export KUBE_NAMESPACE=sos-app

# Enhanced prompt
export PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
EOF

chmod +x /etc/profile.d/sos-app-aliases.sh

# =============================================================================
# CloudWatch Logs Agent
# =============================================================================

log "Step 17: Installing CloudWatch Logs agent..."

if [ "$OS" = "amzn" ]; then
    yum install -y amazon-cloudwatch-agent
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    cd /tmp
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    dpkg -i amazon-cloudwatch-agent.deb
    rm -f amazon-cloudwatch-agent.deb
fi

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data-setup.log",
            "log_group_name": "/aws/ec2/sos-app/bastion",
            "log_stream_name": "{instance_id}/user-data-setup.log"
          },
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/sos-app/bastion",
            "log_stream_name": "{instance_id}/messages"
          }
        ]
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
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json 2>/dev/null || true

log "CloudWatch agent configured"

# =============================================================================
# SSH Key Setup for GitHub
# =============================================================================

log "Step 18: Setting up SSH directory for users..."

# Setup for ec2-user
if id "ec2-user" &>/dev/null; then
    mkdir -p /home/ec2-user/.ssh
    chmod 700 /home/ec2-user/.ssh
    chown -R ec2-user:ec2-user /home/ec2-user/.ssh
fi

# Setup for ubuntu
if id "ubuntu" &>/dev/null; then
    mkdir -p /home/ubuntu/.ssh
    chmod 700 /home/ubuntu/.ssh
    chown -R ubuntu:ubuntu /home/ubuntu/.ssh
fi

# =============================================================================
# System Tuning
# =============================================================================

log "Step 19: Applying system tuning..."

# Increase file limits
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Sysctl tuning
cat >> /etc/sysctl.conf <<EOF
# Network tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Memory tuning
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

sysctl -p 2>/dev/null || true

# =============================================================================
# Message of the Day (MOTD)
# =============================================================================

log "Step 20: Setting up MOTD..."

cat > /etc/motd <<'EOF'

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║             SOS App - Bastion Host                           ║
║                                                               ║
║  This instance is configured with deployment tools:          ║
║                                                               ║
║  • AWS CLI        • kubectl       • eksctl                   ║
║  • Terraform      • Helm          • Docker                   ║
║  • k9s            • stern         • kubectx/kubens           ║
║  • Database CLIs  • Monitoring tools                         ║
║                                                               ║
║  Quick Commands:                                             ║
║    kubectl get pods -n sos-app                               ║
║    helm list -n sos-app                                      ║
║    k9s                                                       ║
║    aws eks update-kubeconfig --name <cluster-name>           ║
║                                                               ║
║  Documentation: /home/ec2-user/README.md                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF

# =============================================================================
# Create README for users
# =============================================================================

log "Step 21: Creating user README..."

cat > /home/ec2-user/README.md 2>/dev/null <<'EOF' || cat > /home/ubuntu/README.md <<'EOF'
# SOS App Bastion Host

## Installed Tools

### Container & Orchestration
- Docker: `docker --version`
- kubectl: `kubectl version --client`
- eksctl: `eksctl version`
- Helm: `helm version`
- k9s: Interactive Kubernetes UI

### Infrastructure as Code
- Terraform: `terraform version`
- AWS CLI: `aws --version`

### Database Clients
- PostgreSQL: `psql --version`
- MongoDB: `mongosh --version`
- Redis: `redis-cli --version`

### Monitoring & Observability
- Prometheus CLI: `promtool --version`

### Utilities
- kubectx/kubens: Switch contexts and namespaces
- stern: Multi-pod log tailing
- yq: YAML processor
- jq: JSON processor

## Quick Start

### Connect to EKS Cluster
```bash
aws eks update-kubeconfig --region us-east-1 --name sos-app-dev-eks
kubectl get nodes
```

### View SOS App Pods
```bash
kubectl get pods -n sos-app
```

### Interactive Kubernetes UI
```bash
k9s
```

### View Logs
```bash
kubectl logs -f -n sos-app deployment/api-gateway
```

### Deploy with Helm
```bash
cd /path/to/sos-app/infrastructure/helm
helm upgrade --install sos-app ./sos-app -n sos-app
```

## Useful Aliases

See `/etc/profile.d/sos-app-aliases.sh` for all aliases.

Common ones:
- `k` = kubectl
- `h` = helm
- `tf` = terraform
- `kgp` = kubectl get pods
- `klf` = kubectl logs -f

## Documentation

- AWS Migration Guide: `/path/to/AWS_MIGRATION_GUIDE.md`
- Terraform: `/path/to/infrastructure/terraform/README.md`
- Helm: `/path/to/infrastructure/helm/README.md`

EOF

chown ec2-user:ec2-user /home/ec2-user/README.md 2>/dev/null || chown ubuntu:ubuntu /home/ubuntu/README.md 2>/dev/null || true

# =============================================================================
# Completion
# =============================================================================

log "Step 22: Finalizing setup..."

# Mark setup as complete
touch "$SETUP_MARKER"
echo "$(date)" > "$SETUP_MARKER"

# Display summary
cat >> "$LOG_FILE" <<EOF

========================================
Setup Completed Successfully!
========================================

Installed Tools:
  ✓ AWS CLI: $(aws --version 2>&1 | head -n1)
  ✓ Docker: $(docker --version 2>&1)
  ✓ kubectl: $(kubectl version --client --short 2>&1 | head -n1)
  ✓ eksctl: $(eksctl version 2>&1)
  ✓ Helm: $(helm version --short 2>&1)
  ✓ Terraform: $(terraform version 2>&1 | head -n1)
  ✓ k9s: Installed
  ✓ Database clients: PostgreSQL, MongoDB, Redis
  ✓ Additional tools: stern, kubectx, kubens, yq, jq

Next Steps:
  1. Connect to EKS cluster: aws eks update-kubeconfig --name <cluster-name>
  2. View pods: kubectl get pods -A
  3. Launch k9s: k9s
  4. Check README: cat ~/README.md

========================================
EOF

log "=========================================="
log "Setup completed successfully!"
log "Check /home/ec2-user/README.md for usage instructions"
log "=========================================="

# Reboot if kernel was updated (optional)
# shutdown -r +1 "Rebooting in 1 minute for kernel updates"

exit 0
