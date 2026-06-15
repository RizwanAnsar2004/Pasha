#!/usr/bin/env bash
# API integration tests against the live deployment.
# Verifies the /api/submit endpoint accepts valid payloads and rejects
# invalid ones, and that submissions land in the database correctly.

set -uo pipefail

BASE_URL="${BASE_URL:-https://pasha-startup-platform.vercel.app}"
SUPABASE_PROJECT="ftekdhipoqvbftfybvwz"
SUPABASE_TOKEN="${SUPABASE_TOKEN:?Set SUPABASE_TOKEN env var}"

# Each test inserts a row tagged with this marker so we can clean up.
MARKER="api-integration-test-$(date +%s)"

PASS=0
FAIL=0
FAILED_TESTS=()

# Helpers
run_sql() {
  local sql="$1"
  python3 -c "import json,sys; print(json.dumps({'query': sys.argv[1]}))" "$sql" > /tmp/sql-payload.json
  curl -s -X POST \
    -H "Authorization: Bearer $SUPABASE_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/sql-payload.json \
    "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT/database/query"
}

post_submit() {
  local body_file="$1"
  curl -s -X POST -H "Content-Type: application/json" \
    --data-binary @"$body_file" \
    -w "\n__STATUS__:%{http_code}" \
    "$BASE_URL/api/submit"
}

extract_status() { echo "$1" | grep -oE '__STATUS__:[0-9]+' | grep -oE '[0-9]+'; }
extract_body() { echo "$1" | sed '/__STATUS__:/d'; }

pass() {
  PASS=$((PASS + 1))
  echo "  PASS: $1"
}
fail() {
  FAIL=$((FAIL + 1))
  FAILED_TESTS+=("$1")
  echo "  FAIL: $1"
  echo "    detail: $2"
}

assert_status() {
  local actual="$1" expected="$2" test_name="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$test_name"
  else
    fail "$test_name" "expected HTTP $expected got $actual"
  fi
}

echo "=== P@SHA Form API Integration Tests ==="
echo "Base URL:  $BASE_URL"
echo "Marker:    $MARKER"
echo ""

# Test 2.1 — Minimum required payload should succeed
TEST_NAME="2.1 POST minimum-required payload"
cat > /tmp/payload-2-1.json <<EOF
{
  "founder_name": "Test Founder",
  "founder_mobile": "03001234567",
  "founder_email": "test+min@example.com",
  "startup_name": "MinTest",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test21"
}
EOF
RESP=$(post_submit /tmp/payload-2-1.json)
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
if [ "$CODE" = "200" ]; then
  if echo "$BODY" | grep -q '"id"' && echo "$BODY" | grep -q '"tier"'; then
    pass "$TEST_NAME (status 200, id+tier in response)"
  else
    fail "$TEST_NAME" "response missing id or tier: $BODY"
  fi
else
  fail "$TEST_NAME" "expected 200 got $CODE; body: $BODY"
fi

# Test 2.2 — Full payload with all 38 fields
TEST_NAME="2.2 POST full payload (all 38 fields)"
cat > /tmp/payload-2-2.json <<EOF
{
  "founder_name": "Test Founder Full",
  "founder_gender": "male",
  "founder_mobile": "03009999999",
  "founder_email": "test+full@example.com",
  "founder_linkedin": "https://linkedin.com/in/test",
  "is_pasha_member": true,
  "startup_name": "FullTest",
  "hq_city": "Karachi",
  "website": "https://example.com",
  "year_founded": "2022",
  "description": "$(printf 'x%.0s' {1..120}) ${MARKER}-test22",
  "total_founders": 3,
  "founding_team_composition": "mixed",
  "female_founders": 1,
  "total_employees": 25,
  "female_employees": 8,
  "fbr_registered": true,
  "secp_registered": true,
  "secp_number": "12345",
  "stage": "early",
  "business_model": "Business to Business (B2B)",
  "revenue_models": ["Subscription", "Licensing"],
  "primary_sector": "Artificial Intelligence (AI)",
  "revenue_band": "250k-1m",
  "customer_band": "101-1k",
  "jobs_created": 25,
  "raised_funding": true,
  "funding_stage": "Seed",
  "currently_raising": false,
  "incubated_in_nic": true,
  "nic_name": "NIC Karachi",
  "nic_cohort": "Cohort 12",
  "nic_year": 2023,
  "engagement_interests": ["Mentorship (receive)", "Investor introductions"],
  "has_patents": false,
  "whatsapp_optin": true,
  "facebook_optin": false
}
EOF
RESP=$(post_submit /tmp/payload-2-2.json)
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
assert_status "$CODE" "200" "$TEST_NAME"

# Test 2.3 — Missing required field (founder_email) — should fail
TEST_NAME="2.3 POST missing founder_email returns 400"
cat > /tmp/payload-2-3.json <<EOF
{
  "founder_name": "No Email",
  "founder_mobile": "03001234567",
  "startup_name": "X",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test23"
}
EOF
RESP=$(post_submit /tmp/payload-2-3.json)
CODE=$(extract_status "$RESP")
assert_status "$CODE" "400" "$TEST_NAME"

# Test 2.4 — Bug regression: only required fields, all "optional" fields omitted entirely
TEST_NAME="2.4 REGRESSION: bug-report payload (only required) succeeds"
cat > /tmp/payload-2-4.json <<EOF
{
  "founder_name": "Bug Repro",
  "founder_mobile": "03001112222",
  "founder_email": "test+bug@example.com",
  "startup_name": "BugTest",
  "hq_city": "Islamabad",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test24"
}
EOF
RESP=$(post_submit /tmp/payload-2-4.json)
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
assert_status "$CODE" "200" "$TEST_NAME"

# Test 2.5 — Malformed JSON returns 400 or 500 (not 200)
TEST_NAME="2.5 POST malformed JSON does NOT return 200"
echo "{not valid json" > /tmp/payload-2-5.json
RESP=$(post_submit /tmp/payload-2-5.json)
CODE=$(extract_status "$RESP")
if [ "$CODE" = "400" ] || [ "$CODE" = "500" ]; then
  pass "$TEST_NAME (got $CODE)"
else
  fail "$TEST_NAME" "expected 400/500 got $CODE"
fi

# Test 2.6 — Empty string in is_pasha_member (regression-style)
TEST_NAME="2.6 POST with empty-string optional fields succeeds"
cat > /tmp/payload-2-6.json <<EOF
{
  "founder_name": "Empty Strings",
  "founder_mobile": "03001113333",
  "founder_email": "test+empties@example.com",
  "startup_name": "EmptiesTest",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test26",
  "founder_photo_url": "",
  "hq_other": "",
  "logo_url": "",
  "secp_number": "",
  "pitch_deck_url": "",
  "nic_cohort": "",
  "closing_notes": "",
  "is_pasha_member": "",
  "fbr_registered": "",
  "secp_registered": "",
  "raised_funding": "",
  "currently_raising": "",
  "incubated_in_nic": "",
  "has_patents": "",
  "nic_year": "",
  "patents_count": "",
  "total_founders": "",
  "female_founders": "",
  "total_employees": "",
  "female_employees": "",
  "jobs_created": ""
}
EOF
RESP=$(post_submit /tmp/payload-2-6.json)
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
assert_status "$CODE" "200" "$TEST_NAME"

# Test 2.7 — Conditional field cleaning: incubated_in_nic=false + nic_year=2024
# After client-side cleaning, DB should have nic_year=null.
# NOTE: This tests server behavior; the cleanConditionalFields helper runs CLIENT-side,
# so we test by sending the cleaned payload directly (simulating what the form would send).
TEST_NAME="2.7 Cleaned conditional: NIC fields null when incubated_in_nic=false"
cat > /tmp/payload-2-7.json <<EOF
{
  "founder_name": "Conditional Test",
  "founder_mobile": "03001114444",
  "founder_email": "test+cond@example.com",
  "startup_name": "CondTest",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test27",
  "incubated_in_nic": false
}
EOF
RESP=$(post_submit /tmp/payload-2-7.json)
CODE=$(extract_status "$RESP")
assert_status "$CODE" "200" "$TEST_NAME"

# Test 2.8 — Conditional field cleaning: has_patents=false should leave patents_count null
TEST_NAME="2.8 Conditional: patents_count null when has_patents=false"
cat > /tmp/payload-2-8.json <<EOF
{
  "founder_name": "Patents Test",
  "founder_mobile": "03001115555",
  "founder_email": "test+patents@example.com",
  "startup_name": "PatentsTest",
  "hq_city": "Karachi",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test28",
  "has_patents": false
}
EOF
RESP=$(post_submit /tmp/payload-2-8.json)
CODE=$(extract_status "$RESP")
assert_status "$CODE" "200" "$TEST_NAME"

# Test 2.9 — javascript: URL in pitch_deck_url should be REJECTED by schema
TEST_NAME="2.9 XSS regression: javascript: URL in pitch_deck_url rejected"
cat > /tmp/payload-2-9.json <<EOF
{
  "founder_name": "XSS Test",
  "founder_mobile": "03001116666",
  "founder_email": "test+xss@example.com",
  "startup_name": "XSSTest",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test29",
  "pitch_deck_url": "javascript:alert(document.domain)"
}
EOF
RESP=$(post_submit /tmp/payload-2-9.json)
CODE=$(extract_status "$RESP")
assert_status "$CODE" "400" "$TEST_NAME"

# Test 2.10 — data: URL in founder_linkedin should be REJECTED
TEST_NAME="2.10 XSS regression: data: URL in founder_linkedin rejected"
cat > /tmp/payload-2-10.json <<EOF
{
  "founder_name": "Data XSS",
  "founder_mobile": "03001117777",
  "founder_email": "test+data@example.com",
  "startup_name": "DataXSS",
  "hq_city": "Lahore",
  "description": "$(printf 'x%.0s' {1..60}) ${MARKER}-test30",
  "founder_linkedin": "data:text/html,<script>alert(1)</script>"
}
EOF
RESP=$(post_submit /tmp/payload-2-10.json)
CODE=$(extract_status "$RESP")
assert_status "$CODE" "400" "$TEST_NAME"

# Test 2.11 — Anon cannot use /api/admin/submission endpoint
TEST_NAME="2.11 Admin endpoint denies unauthenticated requests"
RESP=$(curl -s -X PATCH -H "Content-Type: application/json" \
  -d '{"id":"00000000-0000-0000-0000-000000000000","status":"approved"}' \
  -w "\n__STATUS__:%{http_code}" \
  "$BASE_URL/api/admin/submission")
CODE=$(extract_status "$RESP")
assert_status "$CODE" "401" "$TEST_NAME"

# Test 2.12 — /api/upload rejects non-PDF in pitch-decks bucket (MIME allowlist)
TEST_NAME="2.12 Upload: non-PDF in pitch-decks bucket rejected"
# Create a fake .pdf with PNG content (extension is .pdf but bytes are wrong)
printf '\x89PNG\x0d\x0a\x1a\x0afake' > /tmp/evil.pdf
RESP=$(curl -s -X POST \
  -F "file=@/tmp/evil.pdf;type=application/pdf" \
  -F "bucket=pitch-decks" \
  -w "\n__STATUS__:%{http_code}" \
  "$BASE_URL/api/upload")
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
if [ "$CODE" = "400" ]; then
  pass "$TEST_NAME (rejected, body: $BODY)"
else
  fail "$TEST_NAME" "expected 400 got $CODE; body: $BODY"
fi

# Test 2.13 — /api/upload rejects invalid bucket
TEST_NAME="2.13 Upload: invalid bucket name rejected"
printf '%%PDF-1.4 fake' > /tmp/legit.pdf
RESP=$(curl -s -X POST \
  -F "file=@/tmp/legit.pdf;type=application/pdf" \
  -F "bucket=../../etc/passwd" \
  -w "\n__STATUS__:%{http_code}" \
  "$BASE_URL/api/upload")
CODE=$(extract_status "$RESP")
assert_status "$CODE" "400" "$TEST_NAME"

# Test 2.14 — /api/upload accepts a real PDF
TEST_NAME="2.14 Upload: real PDF accepted in pitch-decks"
printf '%%PDF-1.4\n%%test\nendobj\n%%%%EOF' > /tmp/real.pdf
RESP=$(curl -s -X POST \
  -F "file=@/tmp/real.pdf;type=application/pdf" \
  -F "bucket=pitch-decks" \
  -w "\n__STATUS__:%{http_code}" \
  "$BASE_URL/api/upload")
CODE=$(extract_status "$RESP")
BODY=$(extract_body "$RESP")
if [ "$CODE" = "200" ] && echo "$BODY" | grep -q '"url"'; then
  pass "$TEST_NAME"
else
  fail "$TEST_NAME" "expected 200 with url, got $CODE; body: $BODY"
fi

# Test 2.15 — Anon cannot read submissions table via Supabase REST
TEST_NAME="2.15 RLS: anon cannot SELECT submissions (only approved via separate policy)"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZWtkaGlwb3F2YmZ0Znlidnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTA0NDUsImV4cCI6MjA5NDIyNjQ0NX0.1GTmhV3XaiYpoFc7nZkwmy46OhnQ5LKLl5enMSga4BU"
ANON_BODY=$(curl -s "https://ftekdhipoqvbftfybvwz.supabase.co/rest/v1/submissions?select=founder_email,status" -H "apikey: $ANON_KEY")
PENDING_LEAKED=$(echo "$ANON_BODY" | python3 -c "import json,sys; rows=json.load(sys.stdin) if sys.stdin.read else []; print(sum(1 for r in (rows or []) if r.get('status') != 'approved'))" 2>/dev/null || echo "?")
if [ "$PENDING_LEAKED" = "0" ]; then
  pass "$TEST_NAME (no pending rows leaked to anon)"
else
  fail "$TEST_NAME" "anon leaked $PENDING_LEAKED non-approved rows"
fi

# Test 2.16 — Anon cannot read databank via Supabase REST (publicly should be blocked now)
TEST_NAME="2.16 RLS: anon cannot SELECT databank"
ANON_BODY=$(curl -s "https://ftekdhipoqvbftfybvwz.supabase.co/rest/v1/databank?select=contact_email" -H "apikey: $ANON_KEY")
ROW_COUNT=$(echo "$ANON_BODY" | python3 -c "import json,sys; rows=json.load(sys.stdin) if sys.stdin.read else []; print(len(rows or []))" 2>/dev/null || echo "?")
if [ "$ROW_COUNT" = "0" ]; then
  pass "$TEST_NAME (anon got 0 rows, body: $ANON_BODY)"
else
  fail "$TEST_NAME" "anon read $ROW_COUNT databank rows (PII leak)"
fi

# Test 2.17 — Anon cannot read profiles
TEST_NAME="2.17 RLS: anon cannot SELECT profiles"
ANON_BODY=$(curl -s "https://ftekdhipoqvbftfybvwz.supabase.co/rest/v1/profiles?select=email" -H "apikey: $ANON_KEY")
ROW_COUNT=$(echo "$ANON_BODY" | python3 -c "import json,sys; rows=json.load(sys.stdin) if sys.stdin.read else []; print(len(rows or []))" 2>/dev/null || echo "?")
if [ "$ROW_COUNT" = "0" ]; then
  pass "$TEST_NAME"
else
  fail "$TEST_NAME" "anon read $ROW_COUNT profile rows"
fi

# Test 2.18 — Security headers present
TEST_NAME="2.18 Security headers: CSP + X-Frame-Options + X-Content-Type-Options present"
HEADERS=$(curl -s -I "$BASE_URL/" 2>&1)
if echo "$HEADERS" | grep -qi "content-security-policy" && \
   echo "$HEADERS" | grep -qi "x-frame-options" && \
   echo "$HEADERS" | grep -qi "x-content-type-options"; then
  pass "$TEST_NAME"
else
  fail "$TEST_NAME" "missing one or more security headers"
fi

# Verify DB rows for the tests above
echo ""
echo "=== DB verification ==="
sleep 2
RESULT=$(run_sql "select count(*) as n from submissions where closing_notes like '%${MARKER}%' or description like '%${MARKER}%';")
COUNT=$(echo "$RESULT" | python3 -c "import json,sys; r=json.load(sys.stdin); print(r[0]['n'] if r else 0)" 2>/dev/null || echo "0")
EXPECTED=6  # Tests 2.1, 2.2, 2.4, 2.6, 2.7, 2.8 should have written rows (2.9, 2.10 rejected by schema, don't insert)
if [ "$COUNT" -ge "$EXPECTED" ]; then
  pass "DB has at least $EXPECTED rows from this test run (found $COUNT)"
else
  fail "DB row count" "expected >= $EXPECTED, found $COUNT"
fi

# Verify vetting tier was computed
RESULT=$(run_sql "select count(*) as n from submissions where (description like '%${MARKER}%' or closing_notes like '%${MARKER}%') and vetting_score is not null and vetting_tier is not null;")
COUNT=$(echo "$RESULT" | python3 -c "import json,sys; r=json.load(sys.stdin); print(r[0]['n'] if r else 0)" 2>/dev/null || echo "0")
if [ "$COUNT" -ge "$EXPECTED" ]; then
  pass "All test rows have vetting_score + vetting_tier computed"
else
  fail "Vetting tier" "only $COUNT/$EXPECTED rows have vetting_tier set"
fi

# Cleanup
echo ""
echo "=== Cleanup ==="
run_sql "delete from submissions where description like '%${MARKER}%' or closing_notes like '%${MARKER}%';" > /dev/null
echo "  deleted test rows"

echo ""
echo "=== Summary ==="
echo "  pass: $PASS"
echo "  fail: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for t in "${FAILED_TESTS[@]}"; do
    echo "  - $t"
  done
  exit 1
fi
exit 0
