# ============================================================================
# Production Environment Configuration
# ============================================================================

environment = "prod"
aws_region  = "ap-south-2"

# VPC Configuration
vpc_cidr             = "10.10.0.0/16"
availability_zones   = ["ap-south-2a", "ap-south-2b", "ap-south-2c"]
public_subnet_cidrs  = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
private_subnet_cidrs = ["10.10.11.0/24", "10.10.12.0/24", "10.10.13.0/24"]
database_subnet_cidrs = ["10.10.21.0/24", "10.10.22.0/24", "10.10.23.0/24"]

# EKS Configuration - Production scale
eks_cluster_version     = "1.28"
eks_node_instance_types = ["t3.large", "t3.xlarge"]
eks_node_desired_size   = 5
eks_node_min_size       = 3
eks_node_max_size       = 20
eks_node_disk_size      = 100

# RDS Configuration - Multi-AZ for production
rds_instance_class          = "db.r6g.xlarge"
rds_allocated_storage       = 500
rds_max_allocated_storage   = 2000
rds_engine_version          = "15.4"
rds_multi_az                = true
rds_backup_retention_period = 30
rds_master_username         = "postgres"

# DocumentDB Configuration - Production cluster
documentdb_instance_class  = "db.r6g.xlarge"
documentdb_instance_count  = 3
documentdb_engine_version  = "5.0.0"
documentdb_master_username = "docdbadmin"

# ElastiCache Configuration - Production cluster
elasticache_node_type               = "cache.r6g.xlarge"
elasticache_num_cache_nodes         = 3
elasticache_engine_version          = "7.0"
elasticache_parameter_group_family  = "redis7"

# MSK Configuration - Production scale
msk_kafka_version          = "3.5.1"
msk_instance_type          = "kafka.m5.xlarge"
msk_number_of_broker_nodes = 6
msk_ebs_volume_size        = 500

# Monitoring
enable_cloudwatch_logs    = true
log_retention_days        = 90
enable_enhanced_monitoring = true

# Tags
tags = {
  Environment = "prod"
  CostCenter  = "Engineering"
  Owner       = "DevOps"
  Criticality = "High"
  Compliance  = "Required"
}
