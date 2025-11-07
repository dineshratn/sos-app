output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Certificate authority data for EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_version" {
  description = "Kubernetes version of the cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for EKS cluster"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.node.id
}

output "node_role_arn" {
  description = "IAM role ARN for EKS nodes"
  value       = aws_iam_role.node.arn
}

output "cluster_role_arn" {
  description = "IAM role ARN for EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "oidc_provider_arn" {
  description = "ARN of OIDC provider for IRSA"
  value       = aws_iam_openid_connect_provider.cluster.arn
}
