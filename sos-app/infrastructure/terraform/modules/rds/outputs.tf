output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "reader_endpoint" {
  description = "RDS reader endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgres.port
}

output "database_name" {
  description = "Name of the database"
  value       = aws_db_instance.postgres.db_name
}

output "master_username" {
  description = "Master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "password_secret_arn" {
  description = "ARN of Secrets Manager secret containing password"
  value       = aws_secretsmanager_secret.rds_password.arn
}

output "security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}
