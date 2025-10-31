#!/bin/bash

# SOS App - Integration Testing Script
# Tests end-to-end flows across all services

set -e

BASE_URL="http://localhost:3000"
API_GATEWAY="http://localhost:3000/api/v1"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🧪  SOS App - Integration Testing                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name=$1
    local command=$2

    echo -n "Testing: $test_name... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to make HTTP request
http_get() {
    curl -s -w "\n%{http_code}" -H "Content-Type: application/json" "$1"
}

http_post() {
    local url=$1
    local data=$2
    local token=$3

    if [ -z "$token" ]; then
        curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url"
    else
        curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data" "$url"
    fi
}

echo "🔍  Phase 1: Health Checks"
echo "════════════════════════════════════════════════════════════"

run_test "API Gateway Health" "curl -f -s $BASE_URL/health"
run_test "Auth Service Health" "curl -f -s http://localhost:3001/health"
run_test "User Service Health" "curl -f -s http://localhost:3002/health"
run_test "Emergency Service Health" "curl -f -s http://localhost:3003/health"
run_test "Location Service Health" "curl -f -s http://localhost:3004/health"
run_test "Notification Service Health" "curl -f -s http://localhost:3005/health"
run_test "Communication Service Health" "curl -f -s http://localhost:3006/health"

echo ""
echo "🔍  Phase 2: Authentication Flow"
echo "════════════════════════════════════════════════════════════"

# Generate random email for testing
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_DEVICE_ID="test-device-$(date +%s)"

echo "📝  Test User: $TEST_EMAIL"
echo ""

# Register user
echo -n "Testing: User Registration... "
REGISTER_RESPONSE=$(http_post "$API_GATEWAY/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"deviceId\":\"$TEST_DEVICE_ID\"}")
REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n1)

if [ "$REGISTER_STATUS" = "201" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Extract access token
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | head -n-1 | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "🔑  Access Token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}❌ FAILED (Status: $REGISTER_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Login
echo -n "Testing: User Login... "
LOGIN_RESPONSE=$(http_post "$API_GATEWAY/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"deviceId\":\"$TEST_DEVICE_ID\"}")
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)

if [ "$LOGIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $LOGIN_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Get current user
echo -n "Testing: Get Current User... "
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" "$API_GATEWAY/auth/me")
ME_STATUS=$(echo "$ME_RESPONSE" | tail -n1)

if [ "$ME_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $ME_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🔍  Phase 3: User Profile Management"
echo "════════════════════════════════════════════════════════════"

# Get profile (auto-creates)
echo -n "Testing: Get User Profile... "
PROFILE_GET_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" "$API_GATEWAY/users/profile")
PROFILE_GET_STATUS=$(echo "$PROFILE_GET_RESPONSE" | tail -n1)

if [ "$PROFILE_GET_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $PROFILE_GET_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Update profile
echo -n "Testing: Update User Profile... "
PROFILE_UPDATE_RESPONSE=$(http_post "$API_GATEWAY/users/profile" "{\"firstName\":\"Test\",\"lastName\":\"User\",\"phoneNumber\":\"+12345678900\"}" "$ACCESS_TOKEN")
PROFILE_UPDATE_STATUS=$(echo "$PROFILE_UPDATE_RESPONSE" | tail -n1)

if [ "$PROFILE_UPDATE_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $PROFILE_UPDATE_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🔍  Phase 4: Emergency Contacts Management"
echo "════════════════════════════════════════════════════════════"

# Create emergency contact
echo -n "Testing: Create Emergency Contact... "
CONTACT_CREATE_RESPONSE=$(http_post "$API_GATEWAY/users/emergency-contacts" "{\"name\":\"Emergency Contact\",\"relationship\":\"friend\",\"phoneNumber\":\"+10987654321\",\"isPrimary\":true}" "$ACCESS_TOKEN")
CONTACT_CREATE_STATUS=$(echo "$CONTACT_CREATE_RESPONSE" | tail -n1)

if [ "$CONTACT_CREATE_STATUS" = "201" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Extract contact ID
    CONTACT_ID=$(echo "$CONTACT_CREATE_RESPONSE" | head -n-1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "🆔  Contact ID: $CONTACT_ID"
else
    echo -e "${RED}❌ FAILED (Status: $CONTACT_CREATE_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Get all contacts
echo -n "Testing: Get Emergency Contacts... "
CONTACTS_GET_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" "$API_GATEWAY/users/emergency-contacts")
CONTACTS_GET_STATUS=$(echo "$CONTACTS_GET_RESPONSE" | tail -n1)

if [ "$CONTACTS_GET_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $CONTACTS_GET_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🔍  Phase 5: Service Integration"
echo "════════════════════════════════════════════════════════════"

# Test circuit breaker status
echo -n "Testing: Circuit Breaker Status... "
CB_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/circuit-breakers")
CB_STATUS=$(echo "$CB_RESPONSE" | tail -n1)

if [ "$CB_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED (Status: $CB_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test gateway readiness
echo -n "Testing: Gateway Readiness Check... "
READY_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/ready")
READY_STATUS=$(echo "$READY_RESPONSE" | tail -n1)

if [ "$READY_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  DEGRADED (Status: $READY_STATUS)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   📊  Integration Test Results                           ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "📈 Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉  All integration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some integration tests failed!${NC}"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   - Check service logs: docker-compose logs -f [service-name]"
    echo "   - Verify all services are healthy: docker-compose ps"
    echo "   - Check database connections"
    exit 1
fi
