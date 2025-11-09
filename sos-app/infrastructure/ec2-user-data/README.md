# EC2 User Data Scripts - SOS App

This directory contains production-ready EC2 user data scripts for automating instance initialization in the SOS App AWS infrastructure.

## Overview

User data scripts run automatically when an EC2 instance launches, allowing for complete automation of instance configuration. These scripts install required software, configure services, set up monitoring, and prepare instances for their specific roles.

## Available Scripts

### 1. bastion-host-userdata.sh
**Purpose**: Initialize bastion/jump host with deployment and management tools

**Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)

**OS**: Amazon Linux 2023 or Ubuntu 22.04

**What it installs**:
- AWS CLI (with bash completion)
- Docker & Docker Compose
- Kubernetes tools (kubectl, eksctl, helm, k9s, stern, kubectx/kubens, kustomize)
- Infrastructure as Code (Terraform)
- Database clients (PostgreSQL, MongoDB, Redis)
- Monitoring tools (Prometheus CLI)
- Load testing tools (k6, Apache Bench)
- Python 3 with pip and useful packages
- Node.js and npm
- CloudWatch Logs agent
- System tuning and optimization

**Usage**:
```bash
# In Terraform
resource "aws_instance" "bastion" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  user_data     = file("${path.module}/ec2-user-data/bastion-host-userdata.sh")

  tags = {
    Name = "sos-app-bastion"
    Role = "bastion"
  }
}
```

**Key Features**:
- Complete deployment toolchain
- Bash aliases for common operations
- Customized MOTD
- User-friendly README at /home/ec2-user/README.md
- CloudWatch integration for logs
- SSH directory setup

**Access After Launch**:
```bash
ssh -i your-key.pem ec2-user@<bastion-ip>

# Connect to EKS
aws eks update-kubeconfig --name sos-app-dev-eks --region us-east-1

# Use k9s for interactive UI
k9s

# Deploy with Helm
helm upgrade --install sos-app ./sos-app -n sos-app
```

---

### 2. application-server-userdata.sh
**Purpose**: Initialize standalone application server with Docker and monitoring

**Instance Type**: t3.large or larger (2 vCPU, 8GB RAM minimum)

**OS**: Amazon Linux 2023 or Ubuntu 22.04

**What it installs**:
- Docker with production-ready daemon configuration
- Docker Compose
- Node Exporter (Prometheus metrics on port 9100)
- cAdvisor (container metrics on port 8080)
- Filebeat (log shipping to ELK stack)
- CloudWatch Logs and Metrics agent
- Automated Docker cleanup (weekly cron job)
- Health check script
- System tuning for high-performance applications

**Usage**:
```bash
# In Terraform with custom application user
resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"
  user_data     = templatefile("${path.module}/ec2-user-data/application-server-userdata.sh", {
    APP_USER = "myapp"
  })

  tags = {
    Name = "sos-app-server"
    Role = "application"
  }
}
```

**Key Features**:
- Application directory structure at /opt/sos-app
- Monitoring endpoints exposed (Prometheus-compatible)
- Log shipping to ELK stack
- CloudWatch integration
- Automated cleanup of Docker resources
- Health check script at /usr/local/bin/health-check.sh
- Docker Compose template ready for deployment

**Application Deployment**:
```bash
# SSH to server
ssh -i your-key.pem ec2-user@<app-server-ip>

# Navigate to app directory
cd /opt/sos-app

# Edit docker-compose.yml
sudo vim docker-compose.yml

# Deploy application
sudo docker-compose up -d

# Check health
sudo /usr/local/bin/health-check.sh

# View logs
sudo docker-compose logs -f
```

**Monitoring Endpoints**:
- Node Exporter: http://server-ip:9100/metrics
- cAdvisor: http://server-ip:8080/metrics
- Docker Metrics: http://server-ip:9323/metrics

---

### 3. eks-worker-node-userdata.sh
**Purpose**: Additional configuration for EKS worker nodes beyond AWS defaults

**Instance Type**: t3.xlarge or larger (4 vCPU, 16GB RAM minimum)

**OS**: Amazon Linux 2 (EKS Optimized AMI)

**What it configures**:
- Kubernetes-optimized system tuning (network, memory, file limits)
- Docker daemon optimization for Kubernetes
- Kubelet custom configuration (max pods, resource reservations)
- CloudWatch Logs and Metrics for worker nodes
- SSM Agent for remote management
- Automated disk space monitoring and cleanup
- Performance monitoring tools (sysstat)
- EBS volume auto-expansion
- Custom node labels and taints (optional)

**Usage**:
```bash
# In eksctl cluster configuration
nodeGroups:
  - name: sos-app-workers
    instanceType: t3.xlarge
    desiredCapacity: 3
    minSize: 3
    maxSize: 10
    volumeSize: 100
    volumeType: gp3
    preBootstrapCommands:
      - |
        # Your custom pre-bootstrap commands here
    overrideBootstrapCommand: |
      #!/bin/bash
      # Copy your eks-worker-node-userdata.sh content here
      # Or reference it from S3
      aws s3 cp s3://your-bucket/eks-worker-node-userdata.sh /tmp/userdata.sh
      chmod +x /tmp/userdata.sh
      CLUSTER_NAME=${ClusterName} /tmp/userdata.sh
```

**Or in Terraform with Launch Template**:
```hcl
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "sos-app-eks-nodes"
  image_id      = data.aws_ami.eks_optimized.id
  instance_type = "t3.xlarge"

  user_data = base64encode(templatefile(
    "${path.module}/ec2-user-data/eks-worker-node-userdata.sh",
    {
      CLUSTER_NAME       = aws_eks_cluster.main.name
      AWS_REGION         = var.aws_region
      B64_CLUSTER_CA     = aws_eks_cluster.main.certificate_authority[0].data
      API_SERVER_URL     = aws_eks_cluster.main.endpoint
    }
  ))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }
}
```

**Key Features**:
- Enhanced Kubernetes networking
- Optimized resource limits
- CloudWatch integration for node metrics
- Automated disk cleanup when space is low
- Performance monitoring and reporting
- EBS volume auto-expansion on resize
- SSM access for troubleshooting

**Post-Launch Verification**:
```bash
# Check node joined cluster
kubectl get nodes

# Check node labels
kubectl describe node <node-name>

# SSH via SSM (no SSH key needed)
aws ssm start-session --target <instance-id>

# Check logs
tail -f /var/log/eks-custom-setup.log

# Run performance report
/usr/local/bin/performance-report.sh
```

**CloudWatch Logs**:
- Log Group: `/aws/eks/{cluster-name}/worker-nodes`
- Log Streams:
  - `{instance-id}/custom-setup.log`
  - `{instance-id}/messages`
  - `{instance-id}/docker.log`
  - `{instance-id}/kubelet.log`

---

## General Best Practices

### 1. Testing User Data Scripts

Always test user data scripts before using in production:

```bash
# Test locally on a similar OS
chmod +x bastion-host-userdata.sh
sudo ./bastion-host-userdata.sh

# Or launch a test instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key \
  --user-data file://bastion-host-userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=test-userdata}]'
```

### 2. Viewing User Data Execution Logs

```bash
# SSH to instance
ssh -i your-key.pem ec2-user@<instance-ip>

# View setup log
sudo tail -f /var/log/user-data-setup.log

# Or for EKS nodes
sudo tail -f /var/log/eks-custom-setup.log

# View cloud-init logs
sudo tail -f /var/log/cloud-init-output.log
```

### 3. Debugging Failed User Data

```bash
# Check if user data ran
sudo cat /var/lib/cloud/instance/user-data.txt

# Check cloud-init status
sudo cloud-init status

# View all cloud-init logs
sudo journalctl -u cloud-init

# Check if setup completed
ls -la /var/lib/cloud/instance/user-data-setup-complete
```

### 4. Using Variables in User Data

With Terraform's `templatefile`:

```hcl
user_data = templatefile("${path.module}/userdata.sh", {
  APP_USER       = var.app_user
  CLUSTER_NAME   = var.cluster_name
  AWS_REGION     = var.aws_region
  ENVIRONMENT    = var.environment
  LOGSTASH_HOST  = aws_lb.logstash.dns_name
  DATABASE_URL   = aws_db_instance.main.endpoint
})
```

Then in your script:
```bash
#!/bin/bash
APP_USER="${APP_USER}"
CLUSTER_NAME="${CLUSTER_NAME}"
# ... use variables
```

### 5. Handling Secrets

**Never hardcode secrets in user data!**

Use AWS Secrets Manager or Parameter Store:

```bash
# In user data script
# Get secret from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id sos-app/db-password \
  --query SecretString \
  --output text \
  --region us-east-1)

# Or from Parameter Store
API_KEY=$(aws ssm get-parameter \
  --name /sos-app/api-key \
  --with-decryption \
  --query Parameter.Value \
  --output text \
  --region us-east-1)
```

### 6. Ensuring Idempotency

All scripts check for setup completion marker:

```bash
SETUP_MARKER="/var/lib/cloud/instance/user-data-setup-complete"

if [ -f "$SETUP_MARKER" ]; then
    log "Setup already completed. Exiting."
    exit 0
fi

# ... do setup

# Mark as complete
touch "$SETUP_MARKER"
```

### 7. CloudWatch Integration

All scripts send logs to CloudWatch:

```bash
# View logs in AWS Console
# CloudWatch > Log groups > /aws/ec2/sos-app/{role}

# Or via CLI
aws logs tail /aws/ec2/sos-app/bastion --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/ec2/sos-app/application \
  --filter-pattern "ERROR"
```

---

## Common Use Cases

### Use Case 1: Quick Development Bastion

```bash
# Launch bastion with user data
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxxxxx \
  --subnet-id subnet-xxxxxx \
  --iam-instance-profile Name=sos-app-bastion-role \
  --user-data file://bastion-host-userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=sos-app-bastion}]'

# Wait 5-10 minutes for setup
# Then SSH and start working
ssh -i your-key.pem ec2-user@<bastion-ip>
```

### Use Case 2: Auto-Scaled Application Servers

```hcl
# Terraform auto-scaling group
resource "aws_launch_template" "app_servers" {
  name_prefix   = "sos-app-servers"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.large"

  user_data = base64encode(templatefile(
    "${path.module}/ec2-user-data/application-server-userdata.sh",
    {
      APP_USER      = "sos-app"
      LOGSTASH_HOST = aws_lb.logstash.dns_name
      ENVIRONMENT   = var.environment
    }
  ))

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "sos-app-server"
      Role = "application"
    }
  }
}

resource "aws_autoscaling_group" "app_servers" {
  name                = "sos-app-servers"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 3

  launch_template {
    id      = aws_launch_template.app_servers.id
    version = "$Latest"
  }
}
```

### Use Case 3: EKS Node Group with Custom Configuration

```hcl
# EKS node group with custom launch template
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "sos-app-workers"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 3
  }

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = "$Latest"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
}
```

---

## Monitoring and Verification

### Check Setup Status

```bash
# Via SSH
ssh ec2-user@<instance-ip>
sudo tail -f /var/log/user-data-setup.log

# Via CloudWatch
aws logs tail /aws/ec2/sos-app/bastion --follow

# Via SSM (no SSH needed)
aws ssm start-session --target <instance-id>
sudo tail -f /var/log/user-data-setup.log
```

### Verify Services are Running

```bash
# Bastion host
systemctl status docker
kubectl version --client
terraform version
helm version

# Application server
systemctl status docker
systemctl status node_exporter
systemctl status filebeat
docker ps

# EKS worker node
systemctl status kubelet
systemctl status docker
kubectl get nodes
```

### Access Monitoring Endpoints

```bash
# Node Exporter metrics
curl http://localhost:9100/metrics

# cAdvisor metrics
curl http://localhost:8080/metrics

# Docker metrics
curl http://localhost:9323/metrics
```

---

## Troubleshooting

### Common Issues

#### Issue 1: User Data Didn't Run

**Symptoms**: Services not installed, logs missing

**Solution**:
```bash
# Check cloud-init status
sudo cloud-init status

# View cloud-init logs
sudo cat /var/log/cloud-init-output.log

# Manually run user data (for testing)
sudo bash /var/lib/cloud/instance/user-data.txt
```

#### Issue 2: Script Failed Partway

**Symptoms**: Some services installed, others missing

**Solution**:
```bash
# Check setup log for errors
sudo grep ERROR /var/log/user-data-setup.log

# Find where it stopped
sudo tail -50 /var/log/user-data-setup.log

# Re-run from failed step (remove completion marker first)
sudo rm /var/lib/cloud/instance/user-data-setup-complete
sudo bash /var/lib/cloud/instance/user-data.txt
```

#### Issue 3: Can't Reach External Resources

**Symptoms**: Downloads fail, yum/apt updates fail

**Solution**:
```bash
# Check internet connectivity
ping -c 3 8.8.8.8

# Check DNS
nslookup google.com

# Check security groups allow outbound traffic
# Check NAT gateway is working (for private subnets)

# Check IAM role has necessary permissions
aws sts get-caller-identity
```

#### Issue 4: Services Won't Start

**Symptoms**: systemctl status shows failed

**Solution**:
```bash
# Check service logs
sudo journalctl -u docker -n 50
sudo journalctl -u kubelet -n 50

# Check file permissions
ls -la /usr/local/bin/

# Check system resources
df -h
free -h
top
```

---

## Updating Scripts

When modifying user data scripts:

1. **Test on a non-production instance first**
2. **Update version comments in script header**
3. **Document changes in git commit**
4. **Update this README if behavior changes**
5. **Notify team before rolling out**

### Rolling Update Process

```bash
# 1. Test new user data on single instance
aws ec2 run-instances --user-data file://new-userdata.sh ...

# 2. Verify it works
# 3. Update launch template
aws ec2 create-launch-template-version \
  --launch-template-id lt-xxxxx \
  --source-version 1 \
  --launch-template-data file://new-template.json

# 4. Update auto-scaling group to use new version
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name sos-app-servers \
  --launch-template LaunchTemplateId=lt-xxxxx,Version='$Latest'

# 5. Perform rolling instance refresh
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name sos-app-servers
```

---

## Security Considerations

1. **Never put secrets in user data** - Use Secrets Manager or Parameter Store
2. **Limit IAM permissions** - Only grant what's needed
3. **Use private subnets** - Especially for application and worker nodes
4. **Enable encryption** - For EBS volumes
5. **Regular updates** - Keep scripts updated with security patches
6. **Audit logs** - Send to CloudWatch for compliance

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review CloudWatch logs
- Consult AWS documentation
- Contact DevOps team

---

## References

- [AWS EC2 User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
- [Cloud-init Documentation](https://cloudinit.readthedocs.io/)
- [EKS User Data](https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html)
- [Terraform templatefile](https://www.terraform.io/language/functions/templatefile)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**Maintainer**: DevOps Team
