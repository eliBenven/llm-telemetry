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
  server-collector/  Express server: /ingest endpoint + /r/:code shortlink redirects
  collector-config/  Docker Compose stack: Grafana + Prometheus + Tempo + OTel Collector
```

## Quickstart

### Install

```bash
npm install
```

### Build everything

```bash
npm run build
```

### Run tests

```bash
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

Express server with:
- `POST /ingest` -- receive beacon events from the snippet
- `GET /events` -- query stored events
- `GET /r/:code` -- redirect shortlinks with first-party cookie + UTMs
- `POST /shortlinks` -- create shortlinks
- `GET /health` -- health check

Supports memory (default) and SQLite storage backends.

### collector-config

Docker Compose stack for observability:

```bash
cd packages/collector-config
docker compose up
```

- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Tempo: http://localhost:3200

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
