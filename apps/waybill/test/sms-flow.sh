#!/usr/bin/env bash
# Simulates Africa's Talking inbound SMS POSTs to /api/sms/incoming.
# Run after the USSD smoke test so there's an open/closed trip on KCA 123G.
# Usage: bash test/sms-flow.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3005}"

post() {
  local label="$1"
  local from="$2"
  local text="$3"
  echo
  echo "── $label  from=$from  text='$text'"
  curl -s -X POST "$BASE/api/sms/incoming" \
    -d "from=$(printf '%s' "$from" | sed 's/+/%2B/')" \
    -d "to=21606" \
    -d "id=msg-$(date +%s%N)" \
    -d "date=$(date -u +%FT%TZ)" \
    --data-urlencode "text=$text"
  echo
}

echo "═══ Passenger PAID-SMS smoke test ═══"
echo "Base: $BASE"
echo

# Different passenger phones (each one earns airtime separately).
post "valid fare (matches off-peak envelope)" \
  "+254700111001" "PAID KCA123G 70"

post "anomaly: peak fare paid while conductor logged off-peak" \
  "+254700111002" "PAID KCA 123G 100 westlands-cbd"

post "unknown plate" \
  "+254700111003" "PAID ABC999 50"

post "bad format" \
  "+254700111004" "paid yo"

post "non-PAID keyword (should be silently ignored)" \
  "+254700111005" "stop"

echo
echo "═══ Done. Check server log for mock SMS + airtime sends. ═══"
