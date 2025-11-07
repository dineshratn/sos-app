# ============================================================================
# General Configuration
# ============================================================================

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "sos-app"
}

# ============================================================================
# VPC Configuration
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-south-2a", "ap-south-2b", "ap-south-2c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# ============================================================================
# EKS Configuration
# ============================================================================

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes in EKS node group"
  type        = number
  default     = 3
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes in EKS node group"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes in EKS node group"
  type        = number
  default     = 10
}

variable "eks_node_disk_size" {
  description = "Disk size in GB for EKS nodes"
  type        = number
  default     = 50
}

# ============================================================================
# RDS PostgreSQL Configuration
# ============================================================================

variable "rds_instance_class" {
  description = "Instance class for RDS PostgreSQL"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 500
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "rds_master_username" {
  description = "Master username for RDS"
  type        = string
  default     = "postgres"
  sensitive   = true
}

# ============================================================================
# DocumentDB (MongoDB) Configuration
# ============================================================================

variable "documentdb_instance_class" {
  description = "Instance class for DocumentDB"
  type        = string
  default     = "db.t3.medium"
}

variable "documentdb_instance_count" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 3
}

variable "documentdb_engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0.0"
}

variable "documentdb_master_username" {
  description = "Master username for DocumentDB"
  type        = string
  default     = "docdbadmin"
  sensitive   = true
}

# ============================================================================
# ElastiCache Redis Configuration
# ============================================================================

variable "elasticache_node_type" {
  description = "Node type for ElastiCache Redis"
  type        = string
  default     = "cache.t3.medium"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
}

variable "elasticache_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "elasticache_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

# ============================================================================
# Amazon MSK (Kafka) Configuration
# ============================================================================

variable "msk_kafka_version" {
  description = "Apache Kafka version for MSK"
  type        = string
  default     = "3.5.1"
}

variable "msk_instance_type" {
  description = "Instance type for MSK brokers"
  type        = string
  default     = "kafka.t3.small"
}

variable "msk_number_of_broker_nodes" {
  description = "Number of broker nodes (must be multiple of AZs)"
  type        = number
  default     = 3
}

variable "msk_ebs_volume_size" {
  description = "EBS volume size for MSK brokers in GB"
  type        = number
  default     = 100
}

# ============================================================================
# Monitoring Configuration
# ============================================================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logs for services"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = true
}

# ============================================================================
# Tags
# ============================================================================

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
