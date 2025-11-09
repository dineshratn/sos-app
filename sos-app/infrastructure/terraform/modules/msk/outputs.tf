output "bootstrap_brokers" {
  description = "Bootstrap brokers (plaintext)"
  value       = aws_msk_cluster.kafka.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "Bootstrap brokers (TLS)"
  value       = aws_msk_cluster.kafka.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.kafka.zookeeper_connect_string
}

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.kafka.arn
}

output "security_group_id" {
  description = "Security group ID for MSK"
  value       = aws_security_group.msk.id
}
