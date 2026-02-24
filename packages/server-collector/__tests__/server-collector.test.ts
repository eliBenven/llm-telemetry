import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryStorage } from "../src/storage";
import { createShortlink, resolveShortlink, listShortlinks } from "../src/shortlinks";
import { createApp } from "../src/index";
import { register } from "../src/metrics";
import type { Express } from "express";
import http from "http";

// ── MemoryStorage ────────────────────────────────────────────────────

describe("MemoryStorage", () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
  });

  it("stores and retrieves events", () => {
    store.insertEvent({
      event: "ai_pageview",
      source: "chatgpt",
      timestamp: "2024-10-10T13:55:36Z",
    });
    store.insertEvent({
      event: "ai_pageview",
      source: "perplexity",
      timestamp: "2024-10-10T14:00:00Z",
    });

    const events = store.getEvents();
    expect(events).toHaveLength(2);
  });

  it("filters events by siteId", () => {
    store.insertEvent({
      event: "ai_pageview",
      source: "chatgpt",
      timestamp: "2024-10-10T13:55:36Z",
      siteId: "site-a",
    });
    store.insertEvent({
      event: "ai_pageview",
      source: "perplexity",
      timestamp: "2024-10-10T14:00:00Z",
      siteId: "site-b",
    });

    const events = store.getEvents({ siteId: "site-a" });
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("chatgpt");
  });

  it("limits event results", () => {
    for (let i = 0; i < 10; i++) {
      store.insertEvent({
        event: "ai_pageview",
        source: "test",
        timestamp: new Date().toISOString(),
      });
    }
    const events = store.getEvents({ limit: 5 });
    expect(events).toHaveLength(5);
  });

  it("stores and retrieves shortlinks", () => {
    store.insertShortlink({
      code: "abc123",
      targetUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      clicks: 0,
    });

    const link = store.getShortlink("abc123");
    expect(link).not.toBeNull();
    expect(link!.targetUrl).toBe("https://example.com");
    expect(link!.clicks).toBe(0);
  });

  it("increments shortlink clicks", () => {
    store.insertShortlink({
      code: "xyz",
      targetUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      clicks: 0,
    });

    store.incrementClicks("xyz");
    store.incrementClicks("xyz");

    const link = store.getShortlink("xyz");
    expect(link!.clicks).toBe(2);
  });

  it("returns null for missing shortlink", () => {
    expect(store.getShortlink("nonexistent")).toBeNull();
  });
});

// ── Shortlink management ─────────────────────────────────────────────

describe("shortlinks", () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
  });

  it("creates a shortlink with auto-generated code", () => {
    const link = createShortlink(store, {
      targetUrl: "https://example.com/landing",
      utmSource: "chatgpt",
      utmMedium: "ai",
      utmCampaign: "launch",
    });

    expect(link.code).toBeTruthy();
    expect(link.code.length).toBe(6);
    expect(link.targetUrl).toBe("https://example.com/landing");
    expect(link.clicks).toBe(0);
  });

  it("creates a shortlink with custom code", () => {
    const link = createShortlink(store, {
      targetUrl: "https://example.com",
      code: "my-custom",
    });
    expect(link.code).toBe("my-custom");
  });

  it("resolves a shortlink with UTM params", () => {
    createShortlink(store, {
      targetUrl: "https://example.com/landing",
      code: "demo",
      utmSource: "chatgpt",
      utmMedium: "ai",
      utmCampaign: "launch",
    });

    const result = resolveShortlink(store, "demo");
    expect(result).not.toBeNull();
    expect(result!.redirectUrl).toContain("utm_source=chatgpt");
    expect(result!.redirectUrl).toContain("utm_medium=ai");
    expect(result!.redirectUrl).toContain("utm_campaign=launch");
  });

  it("increments clicks on resolve", () => {
    createShortlink(store, {
      targetUrl: "https://example.com",
      code: "click-test",
    });

    resolveShortlink(store, "click-test");
    resolveShortlink(store, "click-test");

    const link = store.getShortlink("click-test");
    expect(link!.clicks).toBe(2);
  });

  it("returns null for unknown code", () => {
    expect(resolveShortlink(store, "nope")).toBeNull();
  });

  it("lists all shortlinks", () => {
    createShortlink(store, { targetUrl: "https://a.com", code: "a" });
    createShortlink(store, { targetUrl: "https://b.com", code: "b" });

    const links = listShortlinks(store);
    expect(links).toHaveLength(2);
  });
});

// ── Metrics + HTTP integration ───────────────────────────────────────

describe("metrics endpoint", () => {
  let app: Express;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    // Reset metrics between tests
    register.resetMetrics();

    const store = new MemoryStorage();
    app = createApp(store);
    server = app.listen(0); // random available port
    const addr = server.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("exposes /metrics endpoint with Prometheus format", async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    // Should contain our custom metrics
    expect(text).toContain("llmt_ingest_events_total");
    expect(text).toContain("llmt_http_requests_total");
    expect(text).toContain("llmt_http_request_duration_seconds");
    expect(text).toContain("llmt_shortlink_clicks_total");
    expect(text).toContain("llmt_events_stored_total");
  });

  it("increments ingest counter on POST /ingest", async () => {
    await fetch(`${baseUrl}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "ai_pageview",
        source: "chatgpt",
        operator: "OpenAI",
        siteId: "test-site",
      }),
    });

    const res = await fetch(`${baseUrl}/metrics`);
    const text = await res.text();
    // Default labels include service="llm-telemetry-collector"
    expect(text).toContain('event_type="ai_pageview"');
    expect(text).toContain('source="chatgpt"');
    expect(text).toContain('operator="OpenAI"');
    expect(text).toContain('site_id="test-site"');
  });

  it("increments shortlink clicks counter on redirect", async () => {
    // Create a shortlink first
    await fetch(`${baseUrl}/shortlinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUrl: "https://example.com",
        code: "metrics-test",
        utmSource: "chatgpt",
      }),
    });

    // Follow the redirect (fetch follows by default, so use redirect: manual)
    await fetch(`${baseUrl}/r/metrics-test`, { redirect: "manual" });

    const res = await fetch(`${baseUrl}/metrics`);
    const text = await res.text();
    expect(text).toContain('code="metrics-test"');
    expect(text).toContain('utm_source="chatgpt"');
    expect(text).toContain("llmt_shortlink_clicks_total");
  });

  it("tracks HTTP request metrics", async () => {
    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/events`);

    const res = await fetch(`${baseUrl}/metrics`);
    const text = await res.text();
    expect(text).toContain('route="/health"');
    expect(text).toContain('route="/events"');
    expect(text).toContain('status_code="200"');
    expect(text).toContain("llmt_http_requests_total");
  });

  it("records events_stored gauge", async () => {
    // Insert a few events
    for (let i = 0; i < 3; i++) {
      await fetch(`${baseUrl}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "ai_pageview", source: "test" }),
      });
    }

    const res = await fetch(`${baseUrl}/metrics`);
    const text = await res.text();
    // Gauge value includes default labels
    expect(text).toContain("llmt_events_stored_total");
    // Match the gauge value (with service label)
    const match = text.match(/llmt_events_stored_total\{[^}]+\}\s+(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(3);
  });
});
