/**
 * Prometheus metrics for the llm-telemetry server-collector.
 *
 * Exposes counters/histograms that answer:
 *  - How much AI traffic am I getting? (by source, operator, event type)
 *  - Which pages are AI tools referring to?
 *  - Are my shortlinks working?
 *  - Is the collector healthy? (request rate, latency, errors)
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

// ── Registry ──────────────────────────────────────────────────────────

export const register = new Registry();

register.setDefaultLabels({ service: "llm-telemetry-collector" });
collectDefaultMetrics({ register });

// ── Ingest metrics ────────────────────────────────────────────────────

export const ingestEventsTotal = new Counter({
  name: "llmt_ingest_events_total",
  help: "Total ingest events received, by type/source/operator",
  labelNames: ["event_type", "source", "operator", "site_id"] as const,
  registers: [register],
});

export const ingestBytesTotal = new Counter({
  name: "llmt_ingest_bytes_total",
  help: "Total bytes of ingest payloads received",
  registers: [register],
});

// ── Shortlink metrics ─────────────────────────────────────────────────

export const shortlinkClicksTotal = new Counter({
  name: "llmt_shortlink_clicks_total",
  help: "Total shortlink redirect clicks",
  labelNames: ["code", "utm_source"] as const,
  registers: [register],
});

export const shortlinksCreatedTotal = new Counter({
  name: "llmt_shortlinks_created_total",
  help: "Total shortlinks created",
  registers: [register],
});

// ── HTTP metrics ──────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: "llmt_http_requests_total",
  help: "Total HTTP requests by method/route/status",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "llmt_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// ── Storage gauge ─────────────────────────────────────────────────────

export const eventsStoredGauge = new Gauge({
  name: "llmt_events_stored_total",
  help: "Total number of events currently stored",
  registers: [register],
});
