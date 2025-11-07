# ============================================================================
# MSK Module - Managed Streaming for Apache Kafka
# ============================================================================

resource "aws_security_group" "msk" {
  name        = "${var.name_prefix}-msk-sg"
  description = "Security group for MSK cluster"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-msk-sg"
    }
  )
}

resource "aws_security_group_rule" "msk_ingress_plaintext" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 9092
  to_port                  = 9092
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Kafka plaintext access"
}

resource "aws_security_group_rule" "msk_ingress_tls" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 9094
  to_port                  = 9094
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Kafka TLS access"
}

resource "aws_security_group_rule" "msk_ingress_zookeeper" {
  for_each = toset(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 2181
  to_port                  = 2181
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Zookeeper access"
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.name_prefix}"
  retention_in_days = 7

  tags = var.tags
}

resource "aws_msk_configuration" "kafka" {
  kafka_versions = [var.kafka_version]
  name           = "${var.name_prefix}-msk-config"

  server_properties = <<PROPERTIES
auto.create.topics.enable=true
default.replication.factor=3
min.insync.replicas=2
num.io.threads=8
num.network.threads=5
num.partitions=3
num.replica.fetchers=2
replica.lag.time.max.ms=30000
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
socket.send.buffer.bytes=102400
unclean.leader.election.enable=false
zookeeper.session.timeout.ms=18000
log.retention.hours=168
PROPERTIES
}

resource "aws_msk_cluster" "kafka" {
  cluster_name           = "${var.name_prefix}-msk"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type = var.instance_type
    client_subnets = var.subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.ebs_volume_size
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka.arn
    revision = aws_msk_configuration.kafka.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS_PLAINTEXT"
      in_cluster    = var.enable_encryption_in_transit
    }

    encryption_at_rest_kms_key_arn = var.enable_encryption_at_rest ? aws_kms_key.msk[0].arn : null
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-msk"
    }
  )
}

resource "aws_kms_key" "msk" {
  count = var.enable_encryption_at_rest ? 1 : 0

  description             = "KMS key for MSK encryption"
  deletion_window_in_days = 10

  tags = var.tags
}

resource "aws_kms_alias" "msk" {
  count = var.enable_encryption_at_rest ? 1 : 0

  name          = "alias/${var.name_prefix}-msk"
  target_key_id = aws_kms_key.msk[0].key_id
}
