# ============================================================================
# SOS App - Main Terraform Configuration
# ============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  )
}

# ============================================================================
# VPC Module
# ============================================================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix             = local.name_prefix
  vpc_cidr                = var.vpc_cidr
  availability_zones      = var.availability_zones
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  database_subnet_cidrs   = var.database_subnet_cidrs
  enable_nat_gateway      = true
  single_nat_gateway      = var.environment == "dev" ? true : false
  enable_dns_hostnames    = true
  enable_dns_support      = true

  tags = local.common_tags
}

# ============================================================================
# EKS Cluster Module
# ============================================================================

module "eks" {
  source = "./modules/eks"

  name_prefix                = local.name_prefix
  cluster_version            = var.eks_cluster_version
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  node_instance_types        = var.eks_node_instance_types
  node_desired_size          = var.eks_node_desired_size
  node_min_size              = var.eks_node_min_size
  node_max_size              = var.eks_node_max_size
  node_disk_size             = var.eks_node_disk_size
  enable_cluster_autoscaler  = true
  enable_metrics_server      = true

  tags = local.common_tags
}

# ============================================================================
# RDS PostgreSQL Module
# ============================================================================

module "rds" {
  source = "./modules/rds"

  name_prefix               = local.name_prefix
  instance_class            = var.rds_instance_class
  allocated_storage         = var.rds_allocated_storage
  max_allocated_storage     = var.rds_max_allocated_storage
  engine_version            = var.rds_engine_version
  master_username           = var.rds_master_username
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.database_subnet_ids
  multi_az                  = var.rds_multi_az
  backup_retention_period   = var.rds_backup_retention_period
  enable_enhanced_monitoring = var.enable_enhanced_monitoring

  # Security group allowing access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]

  tags = local.common_tags
}

# ============================================================================
# DocumentDB (MongoDB-compatible) Module
# ============================================================================

module "documentdb" {
  source = "./modules/documentdb"

  name_prefix               = local.name_prefix
  instance_class            = var.documentdb_instance_class
  instance_count            = var.documentdb_instance_count
  engine_version            = var.documentdb_engine_version
  master_username           = var.documentdb_master_username
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.database_subnet_ids
  backup_retention_period   = 7
  preferred_backup_window   = "03:00-04:00"

  # Security group allowing access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]

  tags = local.common_tags
}

# ============================================================================
# ElastiCache Redis Module
# ============================================================================

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix               = local.name_prefix
  node_type                 = var.elasticache_node_type
  num_cache_nodes           = var.elasticache_num_cache_nodes
  engine_version            = var.elasticache_engine_version
  parameter_group_family    = var.elasticache_parameter_group_family
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  automatic_failover_enabled = var.environment != "dev"
  multi_az_enabled          = var.environment != "dev"

  # Security group allowing access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]

  tags = local.common_tags
}

# ============================================================================
# Amazon MSK (Kafka) Module
# ============================================================================

module "msk" {
  source = "./modules/msk"

  name_prefix               = local.name_prefix
  kafka_version             = var.msk_kafka_version
  instance_type             = var.msk_instance_type
  number_of_broker_nodes    = var.msk_number_of_broker_nodes
  ebs_volume_size           = var.msk_ebs_volume_size
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  enable_encryption_in_transit = true
  enable_encryption_at_rest    = true

  # Security group allowing access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]

  tags = local.common_tags
}

# ============================================================================
# CloudWatch Log Groups
# ============================================================================

resource "aws_cloudwatch_log_group" "application_logs" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/eks/${local.name_prefix}/application"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-application-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "container_logs" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/eks/${local.name_prefix}/containers"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-container-logs"
    }
  )
}

# ============================================================================
# S3 Buckets for Application Storage
# ============================================================================

resource "aws_s3_bucket" "application_data" {
  bucket = "${local.name_prefix}-application-data"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-application-data"
    }
  )
}

resource "aws_s3_bucket_versioning" "application_data" {
  bucket = aws_s3_bucket.application_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "application_data" {
  bucket = aws_s3_bucket.application_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "application_data" {
  bucket = aws_s3_bucket.application_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# ECR Repositories for Container Images
# ============================================================================

locals {
  microservices = [
    "auth-service",
    "user-service",
    "medical-service",
    "emergency-service",
    "location-service",
    "notification-service",
    "communication-service",
    "device-service",
    "api-gateway",
    "llm-service"
  ]
}

resource "aws_ecr_repository" "microservices" {
  for_each = toset(local.microservices)

  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-${each.value}"
      Service = each.value
    }
  )
}

resource "aws_ecr_lifecycle_policy" "microservices" {
  for_each = toset(local.microservices)

  repository = aws_ecr_repository.microservices[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
