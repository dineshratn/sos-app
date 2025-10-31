#!/bin/bash
# =============================================================================
# SOS App - Deployment Validation Script
# =============================================================================
# Purpose: Validate that all Phase 1 infrastructure is working correctly
# Usage: ./validate-deployment.sh
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[! WARN]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_summary() {
    echo ""
    print_header "Validation Summary"
    echo -e "${GREEN}Passed:   $PASSED${NC}"
    echo -e "${RED}Failed:   $FAILED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All critical tests passed!${NC}"
        echo -e "${GREEN}Phase 1 infrastructure is ready.${NC}"
        return 0
    else
        echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Validation Tests
# -----------------------------------------------------------------------------

test_minikube() {
    print_header "1. Testing Minikube"

    log_test "Checking if Minikube is running..."
    if minikube status | grep -q "host: Running"; then
        log_pass "Minikube is running"
    else
        log_fail "Minikube is not running"
        return 1
    fi

    log_test "Checking kubectl connection..."
    if kubectl cluster-info &>/dev/null; then
        log_pass "kubectl can connect to cluster"
    else
        log_fail "kubectl cannot connect to cluster"
        return 1
    fi
}

test_namespace() {
    print_header "2. Testing Namespace"

    log_test "Checking if sos-app namespace exists..."
    if kubectl get namespace sos-app &>/dev/null; then
        log_pass "Namespace 'sos-app' exists"
    else
        log_fail "Namespace 'sos-app' does not exist"
        return 1
    fi
}

test_configmaps_secrets() {
    print_header "3. Testing ConfigMaps and Secrets"

    log_test "Checking ConfigMaps..."
    local cm_count=$(kubectl get configmap -n sos-app --no-headers 2>/dev/null | wc -l)
    if [ "$cm_count" -gt 0 ]; then
        log_pass "Found $cm_count ConfigMap(s)"
    else
        log_warn "No ConfigMaps found"
    fi

    log_test "Checking Secrets..."
    local secret_count=$(kubectl get secret -n sos-app --no-headers 2>/dev/null | wc -l)
    if [ "$secret_count" -gt 0 ]; then
        log_pass "Found $secret_count Secret(s)"
    else
        log_fail "No Secrets found"
    fi
}

test_databases() {
    print_header "4. Testing Databases"

    # PostgreSQL
    log_test "Checking PostgreSQL StatefulSet..."
    if kubectl get statefulset postgres -n sos-app &>/dev/null; then
        local ready=$(kubectl get statefulset postgres -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get statefulset postgres -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "PostgreSQL is ready ($ready/$desired replicas)"
        else
            log_warn "PostgreSQL is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "PostgreSQL StatefulSet not found"
    fi

    # MongoDB
    log_test "Checking MongoDB StatefulSet..."
    if kubectl get statefulset mongodb -n sos-app &>/dev/null; then
        local ready=$(kubectl get statefulset mongodb -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get statefulset mongodb -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "MongoDB is ready ($ready/$desired replicas)"
        else
            log_warn "MongoDB is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "MongoDB StatefulSet not found"
    fi

    # TimescaleDB
    log_test "Checking TimescaleDB StatefulSet..."
    if kubectl get statefulset timescale -n sos-app &>/dev/null; then
        local ready=$(kubectl get statefulset timescale -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get statefulset timescale -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "TimescaleDB is ready ($ready/$desired replicas)"
        else
            log_warn "TimescaleDB is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "TimescaleDB StatefulSet not found"
    fi

    # Redis
    log_test "Checking Redis Deployment..."
    if kubectl get deployment redis -n sos-app &>/dev/null; then
        local ready=$(kubectl get deployment redis -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment redis -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "Redis is ready ($ready/$desired replicas)"
        else
            log_warn "Redis is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "Redis Deployment not found"
    fi

    # Redis Pub/Sub
    log_test "Checking Redis Pub/Sub Deployment..."
    if kubectl get deployment redis-pubsub -n sos-app &>/dev/null; then
        local ready=$(kubectl get deployment redis-pubsub -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment redis-pubsub -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "Redis Pub/Sub is ready ($ready/$desired replicas)"
        else
            log_warn "Redis Pub/Sub is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "Redis Pub/Sub Deployment not found"
    fi
}

test_message_brokers() {
    print_header "5. Testing Message Brokers"

    # Zookeeper
    log_test "Checking Zookeeper StatefulSet..."
    if kubectl get statefulset zookeeper -n sos-app &>/dev/null; then
        local ready=$(kubectl get statefulset zookeeper -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get statefulset zookeeper -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "Zookeeper is ready ($ready/$desired replicas)"
        else
            log_warn "Zookeeper is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "Zookeeper StatefulSet not found"
    fi

    # Kafka
    log_test "Checking Kafka StatefulSet..."
    if kubectl get statefulset kafka -n sos-app &>/dev/null; then
        local ready=$(kubectl get statefulset kafka -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get statefulset kafka -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "Kafka is ready ($ready/$desired replicas)"
        else
            log_warn "Kafka is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "Kafka StatefulSet not found"
    fi

    # Schema Registry
    log_test "Checking Schema Registry Deployment..."
    if kubectl get deployment schema-registry -n sos-app &>/dev/null; then
        local ready=$(kubectl get deployment schema-registry -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment schema-registry -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" -ge 1 ]; then
            log_pass "Schema Registry is ready ($ready/$desired replicas)"
        else
            log_warn "Schema Registry is not ready ($ready/$desired replicas)"
        fi
    else
        log_fail "Schema Registry Deployment not found"
    fi

    # MQTT
    log_test "Checking MQTT Deployment..."
    if kubectl get deployment mqtt -n sos-app &>/dev/null; then
        local ready=$(kubectl get deployment mqtt -n sos-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment mqtt -n sos-app -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        if [ "$ready" = "$desired" ]; then
            log_pass "MQTT is ready ($ready/$desired replicas)"
        else
            log_warn "MQTT is not fully ready ($ready/$desired replicas)"
        fi
    else
        log_fail "MQTT Deployment not found"
    fi
}

test_services() {
    print_header "6. Testing Services"

    local services=(
        "postgres-service"
        "mongodb-service"
        "timescale-service"
        "redis-service"
        "redis-pubsub-service"
        "kafka-service"
        "schema-registry-service"
        "mqtt-service"
    )

    for service in "${services[@]}"; do
        log_test "Checking service: $service..."
        if kubectl get service "$service" -n sos-app &>/dev/null; then
            log_pass "Service '$service' exists"
        else
            log_fail "Service '$service' not found"
        fi
    done
}

test_pvcs() {
    print_header "7. Testing Persistent Volume Claims"

    log_test "Checking PVCs..."
    local pvc_count=$(kubectl get pvc -n sos-app --no-headers 2>/dev/null | wc -l)

    if [ "$pvc_count" -gt 0 ]; then
        log_pass "Found $pvc_count PVC(s)"

        # Check if all are bound
        local bound_count=$(kubectl get pvc -n sos-app --no-headers 2>/dev/null | grep -c "Bound" || echo "0")
        if [ "$bound_count" = "$pvc_count" ]; then
            log_pass "All PVCs are Bound"
        else
            log_warn "$bound_count/$pvc_count PVCs are Bound"
        fi
    else
        log_warn "No PVCs found"
    fi
}

test_kafka_topics() {
    print_header "8. Testing Kafka Topics"

    log_test "Checking if Kafka topics were created..."

    # Get the first running Kafka pod
    local kafka_pod=$(kubectl get pods -n sos-app -l app.kubernetes.io/name=kafka --no-headers 2>/dev/null | grep Running | head -1 | awk '{print $1}')

    if [ -z "$kafka_pod" ]; then
        log_warn "No running Kafka pod found, skipping topic check"
        return
    fi

    local topic_count=$(kubectl exec -n sos-app "$kafka_pod" -- kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null | wc -l)

    if [ "$topic_count" -ge 20 ]; then
        log_pass "Found $topic_count Kafka topics"
    elif [ "$topic_count" -gt 0 ]; then
        log_warn "Found only $topic_count Kafka topics (expected ~24)"
    else
        log_fail "No Kafka topics found"
    fi
}

test_pod_health() {
    print_header "9. Testing Pod Health"

    log_test "Checking for pods in error states..."
    local error_pods=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | grep -E "Error|CrashLoopBackOff|ImagePullBackOff" | wc -l)

    if [ "$error_pods" -eq 0 ]; then
        log_pass "No pods in error state"
    else
        log_fail "Found $error_pods pod(s) in error state"
        kubectl get pods -n sos-app | grep -E "Error|CrashLoopBackOff|ImagePullBackOff" || true
    fi

    log_test "Checking pod restart counts..."
    local high_restart_pods=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | awk '{if ($4 > 5) print $1, $4}')

    if [ -z "$high_restart_pods" ]; then
        log_pass "No pods with high restart counts"
    else
        log_warn "Some pods have high restart counts:"
        echo "$high_restart_pods"
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_header "SOS App - Phase 1 Infrastructure Validation"
    log_info "Starting validation tests..."

    test_minikube
    test_namespace
    test_configmaps_secrets
    test_databases
    test_message_brokers
    test_services
    test_pvcs
    test_kafka_topics
    test_pod_health

    print_summary
}

main "$@"
