#!/bin/bash
# =============================================================================
# SOS App - Kafka Topics Initialization Script
# =============================================================================
# Purpose: Pre-create Kafka topics with optimal configuration for SOS App
# Usage: ./kafka-topics-init.sh
# Requirements: Kafka cluster must be running and accessible
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-kafka-service.sos-app.svc.cluster.local:9092}"
PARTITIONS="${KAFKA_PARTITIONS:-10}"
REPLICATION_FACTOR="${KAFKA_REPLICATION_FACTOR:-3}"
MIN_INSYNC_REPLICAS="${KAFKA_MIN_INSYNC_REPLICAS:-2}"
RETENTION_MS="${KAFKA_RETENTION_MS:-604800000}"  # 7 days default

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for Kafka to be ready
wait_for_kafka() {
    log_info "Waiting for Kafka cluster to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if kafka-broker-api-versions --bootstrap-server "$KAFKA_BOOTSTRAP_SERVERS" &>/dev/null; then
            log_success "Kafka cluster is ready!"
            return 0
        fi
        log_info "Attempt $attempt/$max_attempts: Kafka not ready yet, waiting..."
        sleep 5
        ((attempt++))
    done

    log_error "Kafka cluster did not become ready within expected time"
    return 1
}

# Create a Kafka topic if it doesn't exist
create_topic() {
    local topic_name=$1
    local partitions=${2:-$PARTITIONS}
    local replication_factor=${3:-$REPLICATION_FACTOR}
    local description=$4

    log_info "Creating topic: $topic_name"
    log_info "  Description: $description"
    log_info "  Partitions: $partitions"
    log_info "  Replication Factor: $replication_factor"

    if kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVERS" \
        --list | grep -q "^${topic_name}$"; then
        log_warning "Topic '$topic_name' already exists, skipping creation"
        return 0
    fi

    kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVERS" \
        --create \
        --topic "$topic_name" \
        --partitions "$partitions" \
        --replication-factor "$replication_factor" \
        --config min.insync.replicas="$MIN_INSYNC_REPLICAS" \
        --config retention.ms="$RETENTION_MS" \
        --config compression.type=lz4 \
        --config cleanup.policy=delete

    if [ $? -eq 0 ]; then
        log_success "Topic '$topic_name' created successfully"
    else
        log_error "Failed to create topic '$topic_name'"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    log_info "=========================================="
    log_info "SOS App - Kafka Topics Initialization"
    log_info "=========================================="
    log_info "Bootstrap Servers: $KAFKA_BOOTSTRAP_SERVERS"
    log_info "Default Partitions: $PARTITIONS"
    log_info "Default Replication Factor: $REPLICATION_FACTOR"
    log_info "Min In-Sync Replicas: $MIN_INSYNC_REPLICAS"
    log_info "Retention Period: $RETENTION_MS ms ($(($RETENTION_MS / 86400000)) days)"
    log_info "=========================================="
    echo ""

    # Wait for Kafka to be ready
    wait_for_kafka || exit 1
    echo ""

    # -----------------------------------------------------------------------------
    # Emergency-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Emergency-related topics..."

    create_topic "emergency-created" 10 3 \
        "Fired when a new emergency is created by a user"

    create_topic "emergency-updated" 10 3 \
        "Fired when emergency status or details are updated"

    create_topic "emergency-cancelled" 10 3 \
        "Fired when an emergency is cancelled by the user"

    create_topic "emergency-resolved" 10 3 \
        "Fired when an emergency is marked as resolved"

    echo ""

    # -----------------------------------------------------------------------------
    # Location-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Location-related topics..."

    create_topic "location-updated" 15 3 \
        "Fired when user location is updated (high frequency)"

    create_topic "location-shared" 10 3 \
        "Fired when user shares location with emergency contacts"

    echo ""

    # -----------------------------------------------------------------------------
    # Contact-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Contact-related topics..."

    create_topic "contact-acknowledged" 10 3 \
        "Fired when an emergency contact acknowledges an alert"

    create_topic "contact-notified" 10 3 \
        "Fired when an emergency contact is notified"

    echo ""

    # -----------------------------------------------------------------------------
    # Notification-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Notification-related topics..."

    create_topic "notification-sent" 10 3 \
        "Fired when a notification is successfully sent"

    create_topic "notification-failed" 10 3 \
        "Fired when a notification fails to send"

    create_topic "notification-delivered" 10 3 \
        "Fired when a push notification is confirmed delivered"

    echo ""

    # -----------------------------------------------------------------------------
    # Communication-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Communication-related topics..."

    create_topic "message-sent" 10 3 \
        "Fired when a chat message is sent during an emergency"

    create_topic "message-received" 10 3 \
        "Fired when a chat message is received and stored"

    echo ""

    # -----------------------------------------------------------------------------
    # Device-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Device-related topics..."

    create_topic "device-connected" 8 3 \
        "Fired when an IoT device connects to the platform"

    create_topic "device-disconnected" 8 3 \
        "Fired when an IoT device disconnects"

    create_topic "device-alert" 10 3 \
        "Fired when an IoT device triggers an emergency alert"

    echo ""

    # -----------------------------------------------------------------------------
    # User-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating User-related topics..."

    create_topic "user-registered" 5 3 \
        "Fired when a new user registers"

    create_topic "user-profile-updated" 5 3 \
        "Fired when user profile is updated"

    create_topic "user-deleted" 5 3 \
        "Fired when user account is deleted"

    echo ""

    # -----------------------------------------------------------------------------
    # Medical-related topics
    # -----------------------------------------------------------------------------
    log_info "Creating Medical-related topics..."

    create_topic "medical-profile-created" 5 3 \
        "Fired when medical profile is created"

    create_topic "medical-profile-updated" 5 3 \
        "Fired when medical profile is updated"

    echo ""

    # -----------------------------------------------------------------------------
    # Analytics and Audit topics
    # -----------------------------------------------------------------------------
    log_info "Creating Analytics and Audit topics..."

    create_topic "audit-log" 10 3 \
        "Audit trail for security and compliance"

    create_topic "analytics-events" 10 3 \
        "General analytics events for tracking"

    echo ""

    # -----------------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------------
    log_info "=========================================="
    log_info "Listing all created topics:"
    log_info "=========================================="
    kafka-topics --bootstrap-server "$KAFKA_BOOTSTRAP_SERVERS" --list

    echo ""
    log_success "=========================================="
    log_success "Kafka topics initialization completed!"
    log_success "=========================================="
}

# Execute main function
main "$@"
