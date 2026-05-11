#!/bin/bash
URL="http://localhost:3006"
EMAIL="sahiy_admin@logistic.org.uz"
PASSWORD="Sahiy_Admin_2026_Secure!"

echo "Testing login for $EMAIL..."
# Get CSRF and cookies
CSRF_JSON=$(curl -s -c cookies.txt $URL/api/auth/csrf)
CSRF=$(echo $CSRF_JSON | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

echo "CSRF Token: $CSRF"

if [ -z "$CSRF" ]; then
  echo "Failed to get CSRF token"
  exit 1
fi

# Attempt login
echo "Attempting login..."
START_TIME=$(date +%s%N)
RESPONSE=$(curl -v -s -b cookies.txt -c cookies.txt -X POST $URL/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF" \
  -d "email=$EMAIL" \
  -d "password=$PASSWORD" \
  -d "json=true" 2>&1)
END_TIME=$(date +%s%N)

DURATION=$(( ($END_TIME - $START_TIME) / 1000000 ))
echo "Full Output: $RESPONSE"
echo "Duration: $DURATION ms"

# Check for session cookie
if grep -q "next-auth.session-token" cookies.txt; then
  echo "LOGIN SUCCESSFUL!"
else
  echo "LOGIN FAILED!"
fi
rm cookies.txt
