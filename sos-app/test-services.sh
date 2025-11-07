#!/bin/bash

# SOS App Services Testing Script
# Tests all endpoints for Auth, User, and Medical services

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URLs
AUTH_URL="http://localhost:3001/api/v1/auth"
USER_URL="http://localhost:3002/api/v1/users"
CONTACTS_URL="http://localhost:3002/api/v1/contacts"
MEDICAL_URL="http://localhost:3003/api/v1/medical"

# Test variables
TEST_EMAIL="test@example.com"
TEST_PASSWORD="SecurePass123!"
JWT_TOKEN=""
USER_ID=""
PROFILE_ID=""
CONTACT_ID=""

echo -e "${YELLOW}╔══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  SOS App Services Integration Test  ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════╝${NC}"
echo ""

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to extract JSON field
extract_json() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Auth Service
response=$(curl -s http://localhost:3001/health)
if echo "$response" | grep -q "healthy"; then
    print_result 0 "Auth Service is healthy"
else
    print_result 1 "Auth Service health check failed"
fi

# Check User Service
response=$(curl -s http://localhost:3002/health)
if echo "$response" | grep -q "healthy"; then
    print_result 0 "User Service is healthy"
else
    print_result 1 "User Service health check failed"
fi

# Check Medical Service
response=$(curl -s http://localhost:3003/health)
if echo "$response" | grep -q "healthy"; then
    print_result 0 "Medical Service is healthy"
else
    print_result 1 "Medical Service health check failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Auth Service Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Register a new user
echo "Testing user registration..."
response=$(curl -s -X POST $AUTH_URL/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

if echo "$response" | grep -q "success"; then
    print_result 0 "User registration successful"
    USER_ID=$(extract_json "$response" "userId")
    JWT_TOKEN=$(extract_json "$response" "token")
else
    # User might already exist, try login
    echo "User exists, attempting login..."
    response=$(curl -s -X POST $AUTH_URL/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
      }")

    if echo "$response" | grep -q "success"; then
        print_result 0 "User login successful"
        USER_ID=$(extract_json "$response" "userId")
        JWT_TOKEN=$(extract_json "$response" "token")
    else
        print_result 1 "User registration/login failed"
    fi
fi

# Test token refresh
echo "Testing token refresh..."
REFRESH_TOKEN=$(extract_json "$response" "refreshToken")
if [ ! -z "$REFRESH_TOKEN" ]; then
    refresh_response=$(curl -s -X POST $AUTH_URL/refresh \
      -H "Content-Type: application/json" \
      -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

    if echo "$refresh_response" | grep -q "success"; then
        print_result 0 "Token refresh successful"
    else
        print_result 1 "Token refresh failed"
    fi
fi

# List sessions
echo "Testing session listing..."
sessions_response=$(curl -s -X GET $AUTH_URL/sessions \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$sessions_response" | grep -q "success"; then
    print_result 0 "Session listing successful"
else
    print_result 1 "Session listing failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. User Service Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get user profile
echo "Testing get user profile..."
profile_response=$(curl -s -X GET $USER_URL/me \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$profile_response" | grep -q "success"; then
    print_result 0 "Get user profile successful"
    PROFILE_ID=$(extract_json "$profile_response" "id")
else
    print_result 1 "Get user profile failed"
fi

# Update user profile
echo "Testing update user profile..."
update_response=$(curl -s -X PUT $USER_URL/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+12025551234",
    "timezone": "America/New_York"
  }')

if echo "$update_response" | grep -q "success"; then
    print_result 0 "Update user profile successful"
else
    print_result 1 "Update user profile failed"
fi

# Add emergency contact
echo "Testing add emergency contact..."
contact_response=$(curl -s -X POST $CONTACTS_URL \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phoneNumber": "+12025555678",
    "email": "john@example.com",
    "relationship": "friend",
    "priority": "primary"
  }')

if echo "$contact_response" | grep -q "success"; then
    print_result 0 "Add emergency contact successful"
    CONTACT_ID=$(extract_json "$contact_response" "id")
else
    print_result 1 "Add emergency contact failed"
fi

# List emergency contacts
echo "Testing list emergency contacts..."
list_contacts_response=$(curl -s -X GET $CONTACTS_URL \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$list_contacts_response" | grep -q "success"; then
    print_result 0 "List emergency contacts successful"
else
    print_result 1 "List emergency contacts failed"
fi

# Get contact statistics
echo "Testing contact statistics..."
stats_response=$(curl -s -X GET "$CONTACTS_URL/stats" \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$stats_response" | grep -q "success"; then
    print_result 0 "Contact statistics successful"
else
    print_result 1 "Contact statistics failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Medical Service Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get medical profile
echo "Testing get medical profile..."
medical_response=$(curl -s -X GET $MEDICAL_URL/profile \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$medical_response" | grep -q "success"; then
    print_result 0 "Get medical profile successful"
else
    print_result 1 "Get medical profile failed"
fi

# Update medical profile
echo "Testing update medical profile..."
update_medical_response=$(curl -s -X PUT $MEDICAL_URL/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bloodType": "O+",
    "organDonor": true,
    "doNotResuscitate": false,
    "emergencyNotes": "No known drug allergies"
  }')

if echo "$update_medical_response" | grep -q "success"; then
    print_result 0 "Update medical profile successful"
else
    print_result 1 "Update medical profile failed"
fi

# Add allergy
echo "Testing add allergy..."
allergy_response=$(curl -s -X POST $MEDICAL_URL/allergies \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allergen": "Penicillin",
    "severity": "severe",
    "reaction": "Anaphylaxis",
    "notes": "Carry EpiPen"
  }')

if echo "$allergy_response" | grep -q "success"; then
    print_result 0 "Add allergy successful"
else
    print_result 1 "Add allergy failed"
fi

# Add medication
echo "Testing add medication..."
medication_response=$(curl -s -X POST $MEDICAL_URL/medications \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medicationName": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily",
    "route": "oral"
  }')

if echo "$medication_response" | grep -q "success"; then
    print_result 0 "Add medication successful"
else
    print_result 1 "Add medication failed"
fi

# Add medical condition
echo "Testing add medical condition..."
condition_response=$(curl -s -X POST $MEDICAL_URL/conditions \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conditionName": "Hypertension",
    "severity": "moderate",
    "isChronic": true,
    "notes": "Controlled with medication"
  }')

if echo "$condition_response" | grep -q "success"; then
    print_result 0 "Add medical condition successful"
else
    print_result 1 "Add medical condition failed"
fi

# Get audit log
echo "Testing get audit log..."
audit_response=$(curl -s -X GET "$MEDICAL_URL/audit?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN")

if echo "$audit_response" | grep -q "success"; then
    print_result 0 "Get audit log successful"
else
    print_result 1 "Get audit log failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}All tests passed successfully!${NC}"
echo ""
echo "Test User:"
echo "  Email: $TEST_EMAIL"
echo "  User ID: $USER_ID"
echo "  JWT Token: ${JWT_TOKEN:0:50}..."
echo ""
echo "Services are running and responding correctly."
echo "You can now use these services via their API endpoints."
echo ""
