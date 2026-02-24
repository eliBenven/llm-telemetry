# llm-telemetry

**Track AI traffic and analytics for any site.**

That means **both**:
1. **AI crawlers/bots** hitting your site (GPTBot, ClaudeBot, PerplexityBot, Bytespider, etc.)
2. **Human visits + conversions referred by AI tools** (ChatGPT, Perplexity, Gemini, Copilot, Claude, DeepSeek, etc.)

The goal: *answer "What did AI send me?" and "What did AI crawl?" with hard numbers.*

## Architecture

```
packages/
  registry/          AI bot + referrer classification data + matching functions
  referral-snippet/  Drop-in <script> tag for tracking AI-referred human traffic
  log-parser/        CLI to parse nginx/CloudFront logs and classify bot traffic
  server-collector/  Express server: /ingest + /metrics + shortlink redirects
  collector-config/  Docker Compose stack: Grafana + Prometheus + Tempo + OTel Collector

dashboards/
  grafana/           Pre-built Grafana dashboard with 15+ panels

examples/
  basic/             Full end-to-end demo (Docker Compose + demo page + seed script)
```

## Quickstart

### Try the full demo (recommended)

```bash
cd examples/basic
docker compose up --build
```

Then:
- Open **http://localhost:8080** — click buttons to simulate AI traffic
- Open **http://localhost:3000** — Grafana dashboard (admin/admin)
- Run `./seed.sh 100` to bulk-seed 100 events

### Install from source

```bash
npm install
npm run build
npm test
```

### Start the server collector (dev)

```bash
npm run dev:server
# Listening on http://localhost:3456
```

## Packages

### @llm-telemetry/registry

Maintained registry of 30+ AI bots and 19 AI referrer sources. Exposes classification functions:

```ts
import { classifyBot, classifyReferrer } from "@llm-telemetry/registry";

classifyBot("GPTBot/1.0");
// { isBot: true, name: "gptbot", operator: "OpenAI", purpose: "Training data collection..." }

classifyReferrer("https://chatgpt.com/");
// { isAIReferrer: true, name: "chatgpt", operator: "OpenAI" }
```

### @llm-telemetry/referral-snippet

Drop-in `<script>` tag that detects AI referral traffic and beacons events to your endpoint:

```html
<script src="https://cdn.example.com/snippet.js"
  data-endpoint="https://yoursite.com/api/ingest"
  data-site-id="my-site">
</script>
```

Emits `ai_pageview` on load. Exposes `__llmTelemetry.trackConversion(name, value)` for conversions.

### @llm-telemetry/log-parser

CLI tool to parse server logs and produce AI bot traffic aggregates:

```bash
npx llm-log-parser parse access.log --format nginx --output csv
npx llm-log-parser parse cloudfront.log --format cloudfront --output json --bots-only
```

### @llm-telemetry/server-collector

Express server with Prometheus metrics:

- `POST /ingest` -- receive beacon events from the snippet
- `GET /events` -- query stored events
- `GET /r/:code` -- redirect shortlinks with first-party cookie + UTMs
- `POST /shortlinks` -- create shortlinks
- `GET /metrics` -- Prometheus scrape endpoint
- `GET /health` -- health check

Supports memory (default) and SQLite storage backends.

#### Prometheus metrics exposed

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `llmt_ingest_events_total` | Counter | event_type, source, operator, site_id | Total ingest events received |
| `llmt_ingest_bytes_total` | Counter | | Payload bytes received |
| `llmt_shortlink_clicks_total` | Counter | code, utm_source | Shortlink redirect clicks |
| `llmt_shortlinks_created_total` | Counter | | Shortlinks created |
| `llmt_http_requests_total` | Counter | method, route, status_code | HTTP requests |
| `llmt_http_request_duration_seconds` | Histogram | method, route | Request latency |
| `llmt_events_stored_total` | Gauge | | Events currently in storage |

### collector-config

Docker Compose stack for observability:

```bash
cd packages/collector-config
docker compose up
```

- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Tempo: http://localhost:3200

### Grafana dashboard

The pre-built dashboard (`dashboards/grafana/llm-telemetry-overview.json`) includes:

- **Overview row** — Total events, unique sources, shortlink clicks, storage gauge
- **AI Traffic by Source** — Time series of events by source + operator donut chart
- **Event Breakdown** — Top sources bar gauge, event type pie chart, conversion counter
- **Shortlinks** — Click time series + per-code performance bars
- **Collector Health** — HTTP request rate, p50/p95/p99 latency, error rate, payload volume

## Reality / constraints (we're honest about attribution)

- Some AI tools strip referrers. For high-confidence attribution, we support:
  - UTM conventions
  - Optional redirect/shortlink endpoint (`/r/:code`)
  - Server-side log correlation

## Contributing

To add a new bot or referrer:

1. Add the entry to `packages/registry/ai-bots.json` or `packages/registry/ai-referrers.json`
2. Add a test case in `packages/registry/__tests__/registry.test.ts`
3. Run `npm test` to verify
4. Submit a PR

## License

MIT
