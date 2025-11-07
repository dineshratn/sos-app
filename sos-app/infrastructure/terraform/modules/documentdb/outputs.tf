output "endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.documentdb.endpoint
}

output "reader_endpoint" {
  description = "DocumentDB reader endpoint"
  value       = aws_docdb_cluster.documentdb.reader_endpoint
}

output "port" {
  description = "DocumentDB port"
  value       = aws_docdb_cluster.documentdb.port
}

output "master_username" {
  description = "Master username"
  value       = aws_docdb_cluster.documentdb.master_username
  sensitive   = true
}

output "password_secret_arn" {
  description = "ARN of Secrets Manager secret containing password"
  value       = aws_secretsmanager_secret.documentdb_password.arn
}

output "security_group_id" {
  description = "Security group ID for DocumentDB"
  value       = aws_security_group.documentdb.id
}

output "cluster_id" {
  description = "DocumentDB cluster ID"
  value       = aws_docdb_cluster.documentdb.id
}
