# SOS App - AWS Cost Estimates & Comparison

## AWS EKS Infrastructure Cost Breakdown

### Option 1: Production Setup (Recommended)

#### Monthly Costs (USD) - us-east-1 Region

| Component | Specs | Quantity | Unit Cost | Monthly Cost |
|-----------|-------|----------|-----------|--------------|
| **EKS Control Plane** | Managed Kubernetes | 1 | $73.00 | **$73.00** |
| **EC2 Compute - Worker Nodes** | | | | |
| t3.xlarge (4 vCPU, 16GB RAM) | On-Demand | 3 | $121.76 | **$365.28** |
| **EBS Storage** | | | | |
| gp3 Volumes (100GB per node) | PostgreSQL | 3 | $8.00 | $24.00 |
| gp3 Volumes (50GB per node) | MongoDB | 3 | $4.00 | $12.00 |
| gp3 Volumes (100GB per node) | Kafka | 3 | $8.00 | $24.00 |
| gp3 Volumes (20GB per node) | Zookeeper | 3 | $1.60 | $4.80 |
| gp3 Volumes (10GB per node) | Redis/MQTT | 5 | $0.80 | $4.00 |
| **EBS Storage Subtotal** | | | | **$68.80** |
| **Load Balancer** | | | | |
| Application Load Balancer | | 1 | $22.56 | **$22.56** |
| **Data Transfer** | | | | |
| Internet egress (est.) | | 50GB | $0.09/GB | $4.50 |
| Inter-AZ transfer (est.) | | 100GB | $0.01/GB | $1.00 |
| **Data Transfer Subtotal** | | | | **$5.50** |
| **CloudWatch Logs & Metrics** | | | | **$10.00** |
| **Backup (AWS Backup)** | 500GB retained | | | **$25.00** |
| | | | | |
| **TOTAL (No Savings)** | | | | **$570.14/month** |
| **With 1-Year Reserved Instances** | 40% savings | | | **$395.14/month** |
| **With 3-Year Reserved Instances** | 63% savings | | | **$298.14/month** |

---

### Option 2: Cost-Optimized Setup

#### Using Spot Instances & Smaller Nodes

| Component | Specs | Quantity | Unit Cost | Monthly Cost |
|-----------|-------|----------|-----------|--------------|
| **EKS Control Plane** | Managed Kubernetes | 1 | $73.00 | **$73.00** |
| **EC2 Compute - Worker Nodes** | | | | |
| t3.large (2 vCPU, 8GB RAM) - Spot | 70% discount | 4 | $24.82 | **$99.28** |
| **EBS Storage** | Same as above | | | **$68.80** |
| **Load Balancer** | | 1 | $22.56 | **$22.56** |
| **Data Transfer** | | | | **$5.50** |
| **CloudWatch** | | | | **$8.00** |
| **Backup** | | | | **$15.00** |
| | | | | |
| **TOTAL** | | | | **$292.14/month** |

---

### Option 3: Development/Testing Setup

#### Minimal Resources for Testing

| Component | Specs | Quantity | Unit Cost | Monthly Cost |
|-----------|-------|----------|-----------|--------------|
| **EKS Control Plane** | Managed Kubernetes | 1 | $73.00 | **$73.00** |
| **EC2 Compute** | | | | |
| t3.medium (2 vCPU, 4GB RAM) | On-Demand | 2 | $30.37 | **$60.74** |
| **EBS Storage** | Reduced sizes | | | **$30.00** |
| **Load Balancer** | | 1 | $22.56 | **$22.56** |
| **Other** | | | | **$8.00** |
| | | | | |
| **TOTAL** | | | | **$194.30/month** |

---

## Detailed Cost Analysis

### 1. EKS Control Plane
- **Fixed Cost**: $73.00/month per cluster
- Includes: Kubernetes master nodes, etcd, API server
- **No savings available** - fixed pricing

### 2. EC2 Compute (Worker Nodes)

#### t3.xlarge (Recommended for Production)
- **Specs**: 4 vCPU, 16GB RAM
- **On-Demand**: $0.1664/hour = $121.76/month
- **1-Year Reserved**: $0.1014/hour = $74.22/month (40% savings)
- **3-Year Reserved**: $0.0641/hour = $46.92/month (63% savings)
- **Spot Instance**: ~$0.0499/hour = $36.53/month (70% savings)

**For 3 nodes:**
- On-Demand: $365.28/month
- 1-Year RI: $222.66/month
- 3-Year RI: $140.76/month
- Spot (with interruptions): $109.59/month

#### t3.large (Alternative)
- **Specs**: 2 vCPU, 8GB RAM
- **On-Demand**: $0.0832/hour = $60.88/month
- **Spot**: ~$0.0250/hour = $18.25/month

**For 4 nodes (same total CPU/RAM):**
- On-Demand: $243.52/month
- Spot: $73.00/month

### 3. EBS Storage (gp3)

**Pricing**:
- $0.08 per GB/month
- 3,000 IOPS and 125 MB/s throughput included
- Additional IOPS: $0.005 per provisioned IOPS/month
- Additional throughput: $0.04 per MB/s/month

**SOS App Storage Requirements**:
| Database | Volume Size | Monthly Cost |
|----------|-------------|--------------|
| PostgreSQL | 100GB × 3 = 300GB | $24.00 |
| MongoDB | 50GB × 3 = 150GB | $12.00 |
| TimescaleDB | 100GB × 3 = 300GB | $24.00 |
| Kafka | 100GB × 3 = 300GB | $24.00 |
| Zookeeper | 20GB × 3 = 60GB | $4.80 |
| Redis | 10GB × 2 = 20GB | $1.60 |
| MQTT | 10GB × 2 = 20GB | $1.60 |
| **Total** | **1,150GB** | **$92.00** |

**With compression/optimization**: ~$68-75/month

### 4. Load Balancers

#### Application Load Balancer (ALB)
- **Fixed**: $22.56/month (730 hours × $0.0309)
- **LCU Cost**: $0.008 per LCU-hour
- **Estimated**: 10 LCUs/hour = $58.40/month
- **Total ALB**: ~$80-100/month for production

#### Network Load Balancer (NLB) - Alternative
- **Fixed**: $21.90/month
- **NLCU Cost**: $0.006 per NLCU-hour
- **Lower cost for high throughput**

### 5. Data Transfer

**Inter-AZ Transfer** (within same region):
- $0.01 per GB in each direction
- Estimated: 100GB/month = $1.00

**Internet Egress**:
- First 10TB/month: $0.09 per GB
- Next 40TB/month: $0.085 per GB
- Estimated: 50GB/month = $4.50

### 6. CloudWatch

**Metrics**:
- First 10 metrics: Free
- Next metrics: $0.30 per metric/month
- Estimated: 30-40 custom metrics = $9-12/month

**Logs**:
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB/month
- Estimated: 10GB ingestion + 20GB storage = $5.60/month

**Total CloudWatch**: ~$15-20/month

### 7. AWS Backup

**Backup Storage**:
- $0.05 per GB/month (warm storage)
- $0.01 per GB/month (cold storage after 90 days)

**SOS App Backup (500GB)**:
- Warm: $25/month
- After 90 days (cold): $5/month

---

## Cost Optimization Strategies

### 1. Reserved Instances (Biggest Savings)

**1-Year Commitment**:
- 40% savings on EC2 costs
- **Savings**: $142.62/month on 3 × t3.xlarge
- **Annual savings**: $1,711

**3-Year Commitment**:
- 63% savings on EC2 costs
- **Savings**: $224.52/month on 3 × t3.xlarge
- **Annual savings**: $2,694

### 2. Spot Instances

**Benefits**:
- 70% savings on EC2 costs
- **Savings**: $255.69/month on 3 × t3.xlarge
- **Annual savings**: $3,068

**Considerations**:
- Can be interrupted with 2-minute warning
- Best for: Non-critical workloads, batch jobs, development
- **Not recommended** for databases and Kafka

**Hybrid Approach**:
- On-Demand/Reserved for databases (PostgreSQL, MongoDB, Kafka)
- Spot for stateless services (APIs, workers)
- **Estimated savings**: $100-150/month

### 3. EBS Optimization

**gp3 vs gp2**:
- gp3 is 20% cheaper than gp2
- gp3: $0.08/GB vs gp2: $0.10/GB
- **Already using gp3** ✓

**Volume Right-Sizing**:
- Monitor actual usage
- Resize volumes as needed
- **Potential savings**: 20-30%

### 4. Cluster Autoscaling

**Enable cluster autoscaler**:
- Scale down during off-hours
- Min nodes: 2, Max nodes: 10
- **Potential savings**: 30-40% in non-peak hours

### 5. AWS Savings Plans

**Compute Savings Plans**:
- 1-year: 33% savings
- 3-year: 52% savings
- Applies to: EC2, Fargate, Lambda

### 6. Data Transfer Optimization

**VPC Endpoints**:
- Avoid internet egress for AWS services
- Use VPC endpoints for S3, DynamoDB, etc.
- **Savings**: $10-20/month

**CloudFront**:
- Cache static content
- Reduce origin data transfer
- First 1TB: $0.085/GB (vs $0.09 for direct egress)

---

## Cost Comparison: AWS vs GCP

| Aspect | AWS EKS | GCP GKE | Winner |
|--------|---------|---------|--------|
| **Control Plane** | $73/month | Free (1st zone) | GCP |
| **Compute (3 nodes)** | $365/month (t3.xlarge) | $350/month (n2-standard-4) | AWS |
| **Storage (1TB)** | $92/month (gp3) | $170/month (SSD) | AWS |
| **Load Balancer** | $80/month (ALB) | $20/month | GCP |
| **Reserved (1-year)** | 40% off | 37% off | AWS |
| **Reserved (3-year)** | 63% off | 55% off | AWS |
| **Spot/Preemptible** | 70% off | 60-80% off | Similar |
| **Data Egress** | $0.09/GB | $0.12/GB | AWS |
| **Total (No Savings)** | **$570/month** | **$500/month** | GCP |
| **Total (1-Year RI)** | **$395/month** | **$315/month** | GCP |
| **Total (3-Year RI)** | **$298/month** | **$250/month** | GCP |

### Key Differences

**AWS Advantages**:
- More Reserved Instance options
- Better storage pricing (gp3)
- Cheaper data egress
- More instance type options

**GCP Advantages**:
- Free control plane
- Autopilot mode (managed resources)
- Simpler pricing
- Better autoscaling defaults

---

## Recommended Configuration by Use Case

### Production (High Availability)
```
Cluster: 3 × t3.xlarge (Reserved 1-year)
Storage: 1TB gp3
Load Balancer: ALB
Backup: Enabled
Estimated Cost: $395-420/month
```

### Production (Cost-Optimized)
```
Cluster: 2 × t3.xlarge (Reserved) + 2 × t3.large (Spot)
Storage: 800GB gp3
Load Balancer: NLB
Backup: Enabled
Estimated Cost: $280-320/month
```

### Development/Staging
```
Cluster: 2 × t3.medium (On-Demand)
Storage: 300GB gp3
Load Balancer: ALB
Backup: Disabled
Estimated Cost: $180-220/month
```

### Testing/POC
```
Cluster: 2 × t3.small (Spot)
Storage: 100GB gp3
Load Balancer: None (NodePort)
Backup: Disabled
Estimated Cost: $80-120/month
```

---

## Monthly Cost Summary

### AWS EKS - SOS App Phase 1

| Configuration | Monthly Cost | Annual Cost | 3-Year Cost |
|--------------|--------------|-------------|-------------|
| **Production (On-Demand)** | $570 | $6,840 | $20,520 |
| **Production (1-Year RI)** | $395 | $4,740 | $14,220 |
| **Production (3-Year RI)** | $298 | $3,576 | $10,728 |
| **Cost-Optimized** | $292 | $3,504 | $10,512 |
| **Development** | $194 | $2,328 | $6,984 |

### Recommendation: Production with 1-Year Reserved Instances
- **Monthly**: $395-420
- **Annual**: $4,740-5,040
- **Best balance** of cost and flexibility

---

## Additional Considerations

### Hidden Costs to Watch
1. **NAT Gateway**: $32.40/month + data transfer
2. **Elastic IPs**: $3.65/month per unused IP
3. **Snapshots**: $0.05/GB/month
4. **CloudWatch Logs retention**: Can accumulate
5. **Cross-region data transfer**: $0.02/GB

### Cost Monitoring Tools
- **AWS Cost Explorer**: Track daily spend
- **AWS Budgets**: Set up alerts
- **AWS Cost Anomaly Detection**: Catch unexpected costs
- **Third-party**: CloudHealth, Cloudability

---

**Total Cost Ownership (1 Year with Reserved Instances)**:
- Setup: $0 (no upfront)
- Monthly: $395
- Annual: **$4,740**

**Comparison**:
- AWS (1-Year RI): $4,740/year
- GCP (1-Year CUD): $3,780/year
- AWS is ~25% more expensive than GCP for this workload

**Recommendation**: Use **AWS** if already invested in AWS ecosystem, otherwise **GCP** offers better value.
