# llm-telemetry

**Goal:** make *any* product feature that uses AI observable — consistently — across providers, languages, and deployment models.

This repo provides:
- **A vendor-neutral telemetry spec** (attributes + event names) for LLM/AI workloads
- **SDKs** that emit **OpenTelemetry** traces/metrics/logs
- **Collector + dashboard recipes** (Grafana/Tempo/Loki/Prometheus, Jaeger, etc.)

## What “AI analytics” means here
We track the stuff you actually need to run AI in production:
- latency (end-to-end + model time)
- tokens in/out (and derived cost)
- model/provider/region
- retries, fallbacks, streaming vs non-streaming
- errors (rate limits, timeouts, content filter, tool failures)
- feature name + user/session identifiers (hashed)
- optional redaction-safe prompt/response capture (OFF by default)

## Success conditions (repo-level)
If you can do all of the following, the project is succeeding:
1. Drop in the **web snippet** or **server SDK** and see traces + metrics within 5 minutes.
2. Switch providers (OpenAI → Anthropic → Gemini → local) without changing your dashboards.
3. Correlate an AI call with a user action (page view / API request) via trace IDs.
4. Run self-hosted (local dev) and production (OTLP to any backend).

## Quickstart
### 1) Run local observability stack
```bash
docker compose -f collector-config/docker-compose.yml up
```

### 2) Instrument your app
- Node/Next.js: `packages/sdk-node`
- Browser: `packages/sdk-web`

### 3) View
- Grafana: http://localhost:3000
- Tempo: http://localhost:3200

## Packages
- `packages/semantic-conventions` — the attribute/event spec (source of truth)
- `packages/sdk-core` — shared helpers (token counting hooks, cost tables, redaction)
- `packages/sdk-web` — browser instrumentation (fetch/XHR + custom spans)
- `packages/sdk-node` — Node/edge/server instrumentation + provider adapters
- `packages/collector-config` — OTEL collector + docker compose + dashboards

## Roadmap
See **GitHub Issues** (we keep milestones per language + provider).

## License
MIT
