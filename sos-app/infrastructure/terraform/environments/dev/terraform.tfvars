# ============================================================================
# Development Environment Configuration
# ============================================================================

environment = "dev"
aws_region  = "ap-south-2"

# VPC Configuration
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-south-2a", "ap-south-2b", "ap-south-2c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
database_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

# EKS Configuration - Smaller for dev
eks_cluster_version     = "1.28"
eks_node_instance_types = ["t3.medium"]
eks_node_desired_size   = 2
eks_node_min_size       = 1
eks_node_max_size       = 4
eks_node_disk_size      = 50

# RDS Configuration - Smaller single-AZ for dev
rds_instance_class          = "db.t3.medium"
rds_allocated_storage       = 50
rds_max_allocated_storage   = 200
rds_engine_version          = "15.4"
rds_multi_az                = false
rds_backup_retention_period = 3
rds_master_username         = "postgres"

# DocumentDB Configuration - Smaller for dev
documentdb_instance_class  = "db.t3.medium"
documentdb_instance_count  = 1
documentdb_engine_version  = "5.0.0"
documentdb_master_username = "docdbadmin"

# ElastiCache Configuration - Smaller for dev
elasticache_node_type               = "cache.t3.medium"
elasticache_num_cache_nodes         = 1
elasticache_engine_version          = "7.0"
elasticache_parameter_group_family  = "redis7"

# MSK Configuration - Smaller for dev
msk_kafka_version          = "3.5.1"
msk_instance_type          = "kafka.t3.small"
msk_number_of_broker_nodes = 3
msk_ebs_volume_size        = 50

# Monitoring
enable_cloudwatch_logs    = true
log_retention_days        = 7
enable_enhanced_monitoring = false

# Tags
tags = {
  Environment = "dev"
  CostCenter  = "Engineering"
  Owner       = "DevOps"
}
