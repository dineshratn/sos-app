# ============================================================================
# RDS Module - PostgreSQL Database
# ============================================================================

resource "random_password" "master" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "rds_password" {
  name = "${var.name_prefix}-rds-password"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.master.result
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-rds-sg"
    }
  )
}

resource "aws_security_group_rule" "rds_ingress" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access from allowed security groups"
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.name_prefix}-postgres-params"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = var.tags
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result

  multi_az               = var.multi_az
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.name_prefix}-postgres-final-snapshot"

  deletion_protection = var.deletion_protection

  performance_insights_enabled    = var.enable_enhanced_monitoring
  performance_insights_kms_key_id = var.enable_enhanced_monitoring ? aws_kms_key.rds[0].arn : null

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-postgres"
    }
  )
}

resource "aws_kms_key" "rds" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  description             = "KMS key for RDS enhanced monitoring"
  deletion_window_in_days = 10

  tags = var.tags
}

resource "aws_kms_alias" "rds" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name          = "alias/${var.name_prefix}-rds"
  target_key_id = aws_kms_key.rds[0].key_id
}
