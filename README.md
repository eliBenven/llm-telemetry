# llm-telemetry

**This project tracks AI traffic + analytics for any site.**

That means **both**:
1) **AI crawlers/bots** hitting your site (GPTBot, ClaudeBot, PerplexityBot, etc.)
2) **Human visits + conversions referred by AI tools** (ChatGPT, Perplexity, Gemini, Copilot, Claude, etc.)

The goal is simple: *answer “What did AI send me?” and “What did AI crawl?” with hard numbers.*

## What you get
### AI Referrals (humans)
- drop-in JS snippet (or npm package)
- classifies referrers + UTMs
- captures pageviews + conversions
- exports to PostHog / GA4 / Segment / webhook / your DB

### AI Crawlers (bots)
- log parsers for common platforms (nginx/apache/CloudFront/Vercel/etc.)
- bot/user-agent classification
- page hit counts, cadence, status codes
- export to BigQuery/Snowflake/ClickHouse/CSV

## Reality / constraints (we’re honest about attribution)
- Some AI tools strip referrers. For high-confidence attribution, we support:
  - UTM conventions
  - optional redirect/shortlink endpoint
  - server-side log correlation

## Success conditions (v1)
You can do all of the following:
1. Install in <10 minutes on any site (static/Next.js/Webflow/Shopify).
2. See a dashboard with:
   - AI referrals by source → landing pages → conversions
   - AI crawler hits by bot → pages → status codes
3. Export data to a destination you already use (PostHog/GA4/BigQuery/CSV).

## Quickstart (local)
(TODO) we’ll ship a one-command demo that generates sample traffic and shows dashboards.

## Repo layout (planned)
- `packages/referral-snippet` — JS snippet + classification
- `packages/server-collector` — API endpoint for ingest + redirect/shortlinks (optional)
- `packages/log-parser` — parse + classify from server/CDN logs
- `packages/registry` — maintained registry of AI bots + AI referrer patterns
- `examples/*` — Next.js + static examples

## License
MIT
