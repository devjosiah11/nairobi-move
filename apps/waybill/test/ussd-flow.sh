#!/usr/bin/env bash
# Manual end-to-end USSD test. Simulates Africa's Talking POSTing to /api/ussd.
# Usage: bash test/ussd-flow.sh [BASE_URL]
# Default BASE_URL=http://localhost:3005

set -euo pipefail

BASE="${1:-http://localhost:3005}"
SESSION="sess-$(date +%s)"
PHONE="%2B254712345678"   # URL-encoded '+' so curl --data doesn't mangle it

hit() {
  local label="$1"
  local text="$2"
  echo
  echo "── $label  text='$text'"
  curl -s -X POST "$BASE/api/ussd" \
    -d "sessionId=$SESSION" \
    -d "serviceCode=*384*1#" \
    -d "phoneNumber=$PHONE" \
    -d "text=$text"
  echo
}

echo "═══ Conductor waybill USSD smoke test ═══"
echo "Base: $BASE"
echo "Session: $SESSION"
echo "Phone: $PHONE"

# --- main menu ---
hit "main menu"       ""

# --- start trip flow ---
hit "start: prompt plate"   "1"
hit "start: enter plate"    "1*KCA123G"
hit "start: pick route"     "1*KCA123G*1"

# --- end trip flow (new session - in real USSD a session ends after END) ---
SESSION="sess-end-$(date +%s)"
hit "end: prompt passengers"    "2"
hit "end: enter passengers"     "2*55"
hit "end: enter cash (short)"   "2*55*3500"   # expect flagged

# --- summary ---
SESSION="sess-summary-$(date +%s)"
hit "today's summary"           "3"

echo
echo "═══ Done. Check the server log for SMS mocks. ═══"
