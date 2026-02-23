import express from "express";
import { MemoryStorage, SqliteStorage } from "./storage";
import type { StorageAdapter, IngestEvent } from "./storage";
import { createShortlink, resolveShortlink, listShortlinks } from "./shortlinks";

// ── Config ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3456", 10);
const STORAGE_TYPE = process.env.STORAGE || "memory"; // "memory" | "sqlite"
const DB_PATH = process.env.DB_PATH || "llm-telemetry.db";
const COOKIE_NAME = "__llmt_src";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Storage ──────────────────────────────────────────────────────────

function createStorageInstance(): StorageAdapter {
  if (STORAGE_TYPE === "sqlite") {
    console.log(`Using SQLite storage at ${DB_PATH}`);
    return new SqliteStorage(DB_PATH);
  }
  console.log("Using in-memory storage");
  return new MemoryStorage();
}

// ── App ──────────────────────────────────────────────────────────────

export function createApp(storage?: StorageAdapter) {
  const store = storage || createStorageInstance();
  const app = express();

  // Parse JSON bodies (with generous limit for beacon payloads)
  app.use(express.json({ limit: "100kb" }));

  // CORS headers (permissive for snippet usage)
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // ── Health check ─────────────────────────────────────────────────

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── POST /ingest — receive beacon data ───────────────────────────

  app.post("/ingest", (req, res) => {
    const body = req.body;
    if (!body || !body.event) {
      return res.status(400).json({ error: "Missing 'event' field" });
    }

    const event: IngestEvent = {
      event: body.event,
      source: body.source || "unknown",
      operator: body.operator || null,
      referrer: body.referrer || null,
      page: body.page || null,
      url: body.url || null,
      timestamp: body.timestamp || new Date().toISOString(),
      sessionId: body.sessionId || null,
      siteId: body.siteId || null,
    };

    store.insertEvent(event);
    res.status(202).json({ accepted: true });
  });

  // ── GET /events — query stored events (for dashboards/debugging) ─

  app.get("/events", (req, res) => {
    const siteId = req.query.siteId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const events = store.getEvents({ siteId, limit });
    res.json({ count: events.length, events });
  });

  // ── GET /r/:code — redirect shortlink with cookie + UTMs ────────

  app.get("/r/:code", (req, res) => {
    const result = resolveShortlink(store, req.params.code);
    if (!result) {
      return res.status(404).json({ error: "Shortlink not found" });
    }

    // Set first-party attribution cookie
    res.cookie(COOKIE_NAME, result.link.utmSource || result.link.code, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
    });

    res.redirect(302, result.redirectUrl);
  });

  // ── POST /shortlinks — create a new shortlink ───────────────────

  app.post("/shortlinks", (req, res) => {
    const { targetUrl, code, utmSource, utmMedium, utmCampaign } = req.body;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'targetUrl'" });
    }
    const link = createShortlink(store, {
      targetUrl,
      code,
      utmSource,
      utmMedium,
      utmCampaign,
    });
    res.status(201).json(link);
  });

  // ── GET /shortlinks — list all shortlinks ────────────────────────

  app.get("/shortlinks", (_req, res) => {
    const links = listShortlinks(store);
    res.json({ count: links.length, links });
  });

  return app;
}

// ── Start server if run directly ─────────────────────────────────────

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`llm-telemetry server-collector listening on http://localhost:${PORT}`);
    console.log(`  POST /ingest       - receive beacon events`);
    console.log(`  GET  /events       - query stored events`);
    console.log(`  GET  /r/:code      - redirect shortlink`);
    console.log(`  POST /shortlinks   - create shortlink`);
    console.log(`  GET  /shortlinks   - list shortlinks`);
    console.log(`  GET  /health       - health check`);
  });
}
