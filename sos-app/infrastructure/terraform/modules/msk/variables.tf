variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "kafka_version" {
  description = "Kafka version"
  type        = string
}

variable "instance_type" {
  description = "Instance type for Kafka brokers"
  type        = string
}

variable "number_of_broker_nodes" {
  description = "Number of broker nodes (must be multiple of AZs)"
  type        = number
}

variable "ebs_volume_size" {
  description = "EBS volume size for brokers in GB"
  type        = number
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for MSK brokers"
  type        = list(string)
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access MSK"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
