# ============================================================================
# DocumentDB Module - MongoDB-compatible Database
# ============================================================================

resource "random_password" "master" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "documentdb_password" {
  name = "${var.name_prefix}-documentdb-password"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "documentdb_password" {
  secret_id     = aws_secretsmanager_secret.documentdb_password.id
  secret_string = random_password.master.result
}

resource "aws_security_group" "documentdb" {
  name        = "${var.name_prefix}-documentdb-sg"
  description = "Security group for DocumentDB"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-documentdb-sg"
    }
  )
}

resource "aws_security_group_rule" "documentdb_ingress" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.documentdb.id
  description              = "Allow DocumentDB access from allowed security groups"
}

resource "aws_docdb_subnet_group" "documentdb" {
  name       = "${var.name_prefix}-documentdb-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-documentdb-subnet-group"
    }
  )
}

resource "aws_docdb_cluster_parameter_group" "documentdb" {
  family = "docdb5.0"
  name   = "${var.name_prefix}-documentdb-params"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = var.tags
}

resource "aws_docdb_cluster" "documentdb" {
  cluster_identifier      = "${var.name_prefix}-documentdb"
  engine                  = "docdb"
  engine_version          = var.engine_version
  master_username         = var.master_username
  master_password         = random_password.master.result
  port                    = 27017
  db_subnet_group_name    = aws_docdb_subnet_group.documentdb.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.documentdb.name
  vpc_security_group_ids  = [aws_security_group.documentdb.id]

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.preferred_backup_window
  preferred_maintenance_window = var.preferred_maintenance_window

  storage_encrypted = true
  kms_key_id        = aws_kms_key.documentdb.arn

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.name_prefix}-documentdb-final-snapshot"

  deletion_protection = var.deletion_protection

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-documentdb"
    }
  )
}

resource "aws_docdb_cluster_instance" "documentdb" {
  count              = var.instance_count
  identifier         = "${var.name_prefix}-documentdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.documentdb.id
  instance_class     = var.instance_class

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-documentdb-${count.index + 1}"
    }
  )
}

resource "aws_kms_key" "documentdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 10

  tags = var.tags
}

resource "aws_kms_alias" "documentdb" {
  name          = "alias/${var.name_prefix}-documentdb"
  target_key_id = aws_kms_key.documentdb.key_id
}
