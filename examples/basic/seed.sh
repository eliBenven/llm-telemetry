#!/usr/bin/env bash
#
# seed.sh — Send simulated AI traffic events to the collector.
# Usage: ./seed.sh [count]   (default: 50)
#
set -euo pipefail

ENDPOINT="${ENDPOINT:-http://localhost:3456/ingest}"
COUNT="${1:-50}"

SOURCES=("chatgpt" "perplexity" "gemini" "claude" "copilot" "deepseek" "you.com" "phind" "kagi")
OPERATORS=("OpenAI" "Perplexity AI" "Google" "Anthropic" "Microsoft" "DeepSeek" "You.com" "Phind" "Kagi")
PAGES=("/" "/pricing" "/docs" "/blog" "/about" "/enterprise" "/changelog" "/contact" "/blog/ai-seo" "/docs/quickstart")

echo "Seeding $COUNT events to $ENDPOINT ..."

for i in $(seq 1 "$COUNT"); do
  idx=$(( RANDOM % ${#SOURCES[@]} ))
  source="${SOURCES[$idx]}"
  operator="${OPERATORS[$idx]}"
  page="${PAGES[$(( RANDOM % ${#PAGES[@]} ))]}"

  # 85% pageviews, 15% conversions
  if (( RANDOM % 100 < 85 )); then
    event="ai_pageview"
  else
    event="ai_conversion"
  fi

  curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"$event\",
      \"source\": \"$source\",
      \"operator\": \"$operator\",
      \"page\": \"$page\",
      \"url\": \"https://demo.example.com$page\",
      \"referrer\": \"https://$source.com/\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"sessionId\": \"seed-$RANDOM\",
      \"siteId\": \"demo-site\"
    }" > /dev/null

  printf "\r  %d/%d events sent" "$i" "$COUNT"
done

echo ""
echo "Done! View events at ${ENDPOINT%/ingest}/events"
echo "View metrics at ${ENDPOINT%/ingest}/metrics"
