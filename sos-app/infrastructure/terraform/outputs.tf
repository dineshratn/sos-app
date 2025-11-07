# ============================================================================
# VPC Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.vpc.database_subnet_ids
}

# ============================================================================
# EKS Cluster Outputs
# ============================================================================

output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "Certificate authority data for EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for EKS cluster"
  value       = module.eks.cluster_oidc_issuer_url
}

output "eks_node_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = module.eks.node_security_group_id
}

output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = module.eks.cluster_security_group_id
}

# ============================================================================
# RDS PostgreSQL Outputs
# ============================================================================

output "rds_endpoint" {
  description = "Connection endpoint for RDS PostgreSQL"
  value       = module.rds.endpoint
}

output "rds_reader_endpoint" {
  description = "Reader endpoint for RDS PostgreSQL"
  value       = module.rds.reader_endpoint
}

output "rds_port" {
  description = "Port for RDS PostgreSQL"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "Name of the default database"
  value       = module.rds.database_name
}

output "rds_master_username" {
  description = "Master username for RDS"
  value       = module.rds.master_username
  sensitive   = true
}

# ============================================================================
# DocumentDB Outputs
# ============================================================================

output "documentdb_endpoint" {
  description = "Connection endpoint for DocumentDB cluster"
  value       = module.documentdb.endpoint
}

output "documentdb_reader_endpoint" {
  description = "Reader endpoint for DocumentDB cluster"
  value       = module.documentdb.reader_endpoint
}

output "documentdb_port" {
  description = "Port for DocumentDB"
  value       = module.documentdb.port
}

output "documentdb_master_username" {
  description = "Master username for DocumentDB"
  value       = module.documentdb.master_username
  sensitive   = true
}

# ============================================================================
# ElastiCache Redis Outputs
# ============================================================================

output "elasticache_endpoint" {
  description = "Primary endpoint for ElastiCache Redis"
  value       = module.elasticache.primary_endpoint
}

output "elasticache_reader_endpoint" {
  description = "Reader endpoint for ElastiCache Redis"
  value       = module.elasticache.reader_endpoint
}

output "elasticache_port" {
  description = "Port for ElastiCache Redis"
  value       = module.elasticache.port
}

# ============================================================================
# Amazon MSK Outputs
# ============================================================================

output "msk_bootstrap_brokers" {
  description = "Bootstrap brokers for MSK cluster"
  value       = module.msk.bootstrap_brokers
}

output "msk_bootstrap_brokers_tls" {
  description = "TLS bootstrap brokers for MSK cluster"
  value       = module.msk.bootstrap_brokers_tls
}

output "msk_zookeeper_connect_string" {
  description = "Zookeeper connection string for MSK"
  value       = module.msk.zookeeper_connect_string
}

# ============================================================================
# S3 Outputs
# ============================================================================

output "application_data_bucket_id" {
  description = "ID of application data S3 bucket"
  value       = aws_s3_bucket.application_data.id
}

output "application_data_bucket_arn" {
  description = "ARN of application data S3 bucket"
  value       = aws_s3_bucket.application_data.arn
}

# ============================================================================
# ECR Outputs
# ============================================================================

output "ecr_repository_urls" {
  description = "URLs of ECR repositories"
  value = {
    for k, v in aws_ecr_repository.microservices : k => v.repository_url
  }
}

# ============================================================================
# CloudWatch Outputs
# ============================================================================

output "application_logs_group_name" {
  description = "Name of CloudWatch log group for applications"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.application_logs[0].name : null
}

output "container_logs_group_name" {
  description = "Name of CloudWatch log group for containers"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.container_logs[0].name : null
}

# ============================================================================
# Configuration Output for kubectl
# ============================================================================

output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# ============================================================================
# Summary Output
# ============================================================================

output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment     = var.environment
    region          = var.aws_region
    vpc_id          = module.vpc.vpc_id
    eks_cluster     = module.eks.cluster_name
    rds_endpoint    = module.rds.endpoint
    docdb_endpoint  = module.documentdb.endpoint
    redis_endpoint  = module.elasticache.primary_endpoint
    kafka_brokers   = module.msk.bootstrap_brokers_tls
  }
}
