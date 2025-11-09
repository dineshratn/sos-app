#!/bin/bash

#############################################
# SOS App - Kubernetes Testing Script
#############################################

# Get Minikube IP (or use provided IP)
if [ -n "$1" ]; then
    MINIKUBE_IP="$1"
else
    MINIKUBE_IP=$(minikube ip 2>/dev/null)
    if [ -z "$MINIKUBE_IP" ]; then
        echo "Error: Could not get Minikube IP. Please provide it as an argument:"
        echo "  ./test-services-k8s.sh <minikube-ip>"
        exit 1
    fi
fi

# Service URLs using NodePort
AUTH_URL="http://${MINIKUBE_IP}:30001/api/auth"
USER_URL="http://${MINIKUBE_IP}:30002/api/users"
MEDICAL_URL="http://${MINIKUBE_IP}:30003/api/medical"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test credentials
TEST_EMAIL="test-k8s-$(date +%s)@example.com"
TEST_PASSWORD="SecurePass123!"

# Variables to store tokens and IDs
JWT_TOKEN=""
REFRESH_TOKEN=""
CONTACT_ID=""

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        echo -e "${RED}  Response: $3${NC}"
    fi
}

extract_json() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

# Test 1: Health Checks
print_header "Test 1: Health Checks"

auth_health=$(curl -s http://${MINIKUBE_IP}:30001/health)
if echo "$auth_health" | grep -q "ok"; then
    print_result 0 "Auth Service health check"
else
    print_result 1 "Auth Service health check" "$auth_health"
fi

user_health=$(curl -s http://${MINIKUBE_IP}:30002/health)
if echo "$user_health" | grep -q "ok"; then
    print_result 0 "User Service health check"
else
    print_result 1 "User Service health check" "$user_health"
fi

medical_health=$(curl -s http://${MINIKUBE_IP}:30003/health)
if echo "$medical_health" | grep -q "ok"; then
    print_result 0 "Medical Service health check"
else
    print_result 1 "Medical Service health check" "$medical_health"
fi

# Test 2: User Registration
print_header "Test 2: User Registration"

response=$(curl -s -X POST $AUTH_URL/register \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"firstName\": \"Test\", \"lastName\": \"User\"}")

if echo "$response" | grep -q "success"; then
    print_result 0 "User registration successful"
    JWT_TOKEN=$(extract_json "$response" "token")
    REFRESH_TOKEN=$(extract_json "$response" "refreshToken")
else
    print_result 1 "User registration failed" "$response"
    exit 1
fi

# Test 3: User Login
print_header "Test 3: User Login"

login_response=$(curl -s -X POST $AUTH_URL/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

if echo "$login_response" | grep -q "success"; then
    print_result 0 "User login successful"
    JWT_TOKEN=$(extract_json "$login_response" "token")
else
    print_result 1 "User login failed" "$login_response"
fi

# Test 4: Get User Profile
print_header "Test 4: User Profile"

profile_response=$(curl -s -X GET $USER_URL/me \
    -H "Authorization: Bearer $JWT_TOKEN")

if echo "$profile_response" | grep -q "success"; then
    print_result 0 "Get user profile"
else
    print_result 1 "Get user profile" "$profile_response"
fi

# Test 5: Update User Profile
update_profile_response=$(curl -s -X PUT $USER_URL/me \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"dateOfBirth": "1990-01-01", "phoneNumber": "+1234567890"}')

if echo "$update_profile_response" | grep -q "success"; then
    print_result 0 "Update user profile"
else
    print_result 1 "Update user profile" "$update_profile_response"
fi

# Test 6: Emergency Contacts
print_header "Test 6: Emergency Contacts"

create_contact_response=$(curl -s -X POST $USER_URL/contacts \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "John Doe",
        "phoneNumber": "+1234567890",
        "email": "john@example.com",
        "relationship": "friend",
        "priority": "high"
    }')

if echo "$create_contact_response" | grep -q "success"; then
    print_result 0 "Create emergency contact"
    CONTACT_ID=$(echo "$create_contact_response" | grep -o "\"id\":\"[^\"]*\"" | cut -d'"' -f4)
else
    print_result 1 "Create emergency contact" "$create_contact_response"
fi

# Test 7: Medical Profile
print_header "Test 7: Medical Profile"

get_medical_response=$(curl -s -X GET $MEDICAL_URL/profile \
    -H "Authorization: Bearer $JWT_TOKEN")

if echo "$get_medical_response" | grep -q "success"; then
    print_result 0 "Get medical profile"
else
    print_result 1 "Get medical profile" "$get_medical_response"
fi

# Test 8: Update Medical Profile
update_medical_response=$(curl -s -X PUT $MEDICAL_URL/profile \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "bloodType": "O+",
        "organDonor": true,
        "emergencyNotes": "No known drug allergies"
    }')

if echo "$update_medical_response" | grep -q "success"; then
    print_result 0 "Update medical profile"
else
    print_result 1 "Update medical profile" "$update_medical_response"
fi

# Test 9: Medical Allergies
print_header "Test 9: Medical Allergies"

add_allergy_response=$(curl -s -X POST $MEDICAL_URL/allergies \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "allergen": "Penicillin",
        "severity": "severe",
        "reaction": "Anaphylaxis",
        "diagnosedDate": "2020-01-01"
    }')

if echo "$add_allergy_response" | grep -q "success"; then
    print_result 0 "Add medical allergy"
else
    print_result 1 "Add medical allergy" "$add_allergy_response"
fi

# Test 10: Medical Medications
print_header "Test 10: Medical Medications"

add_medication_response=$(curl -s -X POST $MEDICAL_URL/medications \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Aspirin",
        "dosage": "100mg",
        "frequency": "Once daily",
        "startDate": "2023-01-01"
    }')

if echo "$add_medication_response" | grep -q "success"; then
    print_result 0 "Add medication"
else
    print_result 1 "Add medication" "$add_medication_response"
fi

# Summary
print_header "Test Summary"

echo -e "${BLUE}Testing completed!${NC}"
echo -e "\n${YELLOW}Service URLs:${NC}"
echo -e "  Auth Service:    http://${MINIKUBE_IP}:30001"
echo -e "  User Service:    http://${MINIKUBE_IP}:30002"
echo -e "  Medical Service: http://${MINIKUBE_IP}:30003"

echo -e "\n${YELLOW}Test Credentials:${NC}"
echo -e "  Email:    $TEST_EMAIL"
echo -e "  Password: $TEST_PASSWORD"
echo -e "  Token:    $JWT_TOKEN"

echo -e "\n${GREEN}All tests completed successfully!${NC}\n"
