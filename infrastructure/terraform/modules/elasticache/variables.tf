variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "node_type" {
  description = "Node type for ElastiCache"
  type        = string
}

variable "num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 3
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
}

variable "parameter_group_family" {
  description = "Parameter group family"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for ElastiCache"
  type        = list(string)
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 5
}

variable "snapshot_window" {
  description = "Preferred snapshot window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access ElastiCache"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
