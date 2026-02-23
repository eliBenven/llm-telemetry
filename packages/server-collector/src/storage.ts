/**
 * Storage adapter interface for the server-collector.
 *
 * Two implementations:
 *  - MemoryStorage   — in-process, no deps, good for dev/testing
 *  - SqliteStorage   — persistent, uses better-sqlite3
 */

// ── Types ────────────────────────────────────────────────────────────

export interface IngestEvent {
  id?: string;
  event: string; // "ai_pageview" | "ai_conversion" | custom
  source: string;
  operator?: string | null;
  referrer?: string;
  page?: string;
  url?: string;
  timestamp: string;
  sessionId?: string;
  siteId?: string;
  [key: string]: unknown;
}

export interface Shortlink {
  code: string;
  targetUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
  clicks: number;
}

export interface StorageAdapter {
  /** Store an ingest event. */
  insertEvent(event: IngestEvent): void;

  /** Get all events, optionally filtered. */
  getEvents(opts?: { siteId?: string; limit?: number }): IngestEvent[];

  /** Store a shortlink. */
  insertShortlink(link: Shortlink): void;

  /** Resolve a shortlink code to its record. */
  getShortlink(code: string): Shortlink | null;

  /** Increment click count for a shortlink. */
  incrementClicks(code: string): void;

  /** Get all shortlinks. */
  getShortlinks(): Shortlink[];
}

// ── Memory implementation ────────────────────────────────────────────

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return String(Date.now()) + Math.random().toString(36).slice(2);
}

export class MemoryStorage implements StorageAdapter {
  private events: IngestEvent[] = [];
  private shortlinks: Map<string, Shortlink> = new Map();

  insertEvent(event: IngestEvent): void {
    this.events.push({ ...event, id: makeId() });
  }

  getEvents(opts?: { siteId?: string; limit?: number }): IngestEvent[] {
    let result = [...this.events];
    if (opts?.siteId) {
      result = result.filter((e) => e.siteId === opts.siteId);
    }
    if (opts?.limit) {
      result = result.slice(-opts.limit);
    }
    return result;
  }

  insertShortlink(link: Shortlink): void {
    this.shortlinks.set(link.code, { ...link });
  }

  getShortlink(code: string): Shortlink | null {
    return this.shortlinks.get(code) ?? null;
  }

  incrementClicks(code: string): void {
    const link = this.shortlinks.get(code);
    if (link) link.clicks += 1;
  }

  getShortlinks(): Shortlink[] {
    return Array.from(this.shortlinks.values());
  }
}

// ── SQLite implementation ────────────────────────────────────────────

export class SqliteStorage implements StorageAdapter {
  private db: import("better-sqlite3").Database;

  constructor(dbPath: string = "llm-telemetry.db") {
    // Dynamic require so the package stays optional
    const Database = require("better-sqlite3");
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        source TEXT,
        operator TEXT,
        referrer TEXT,
        page TEXT,
        url TEXT,
        timestamp TEXT,
        session_id TEXT,
        site_id TEXT,
        extra TEXT
      );

      CREATE TABLE IF NOT EXISTS shortlinks (
        code TEXT PRIMARY KEY,
        target_url TEXT NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        created_at TEXT,
        clicks INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_events_site ON events(site_id);
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp);
    `);
  }

  insertEvent(event: IngestEvent): void {
    const id = makeId();
    const { event: evt, source, operator, referrer, page, url, timestamp, sessionId, siteId, ...rest } = event;
    const stmt = this.db.prepare(
      `INSERT INTO events (id, event, source, operator, referrer, page, url, timestamp, session_id, site_id, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      evt,
      source ?? null,
      operator ?? null,
      referrer ?? null,
      page ?? null,
      url ?? null,
      timestamp,
      sessionId ?? null,
      siteId ?? null,
      Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    );
  }

  getEvents(opts?: { siteId?: string; limit?: number }): IngestEvent[] {
    let sql = "SELECT * FROM events";
    const params: unknown[] = [];
    if (opts?.siteId) {
      sql += " WHERE site_id = ?";
      params.push(opts.siteId);
    }
    sql += " ORDER BY timestamp DESC";
    if (opts?.limit) {
      sql += " LIMIT ?";
      params.push(opts.limit);
    }
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as string,
      event: row.event as string,
      source: row.source as string,
      operator: row.operator as string | null,
      referrer: row.referrer as string,
      page: row.page as string,
      url: row.url as string,
      timestamp: row.timestamp as string,
      sessionId: row.session_id as string,
      siteId: row.site_id as string,
    }));
  }

  insertShortlink(link: Shortlink): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO shortlinks (code, target_url, utm_source, utm_medium, utm_campaign, created_at, clicks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      link.code,
      link.targetUrl,
      link.utmSource ?? null,
      link.utmMedium ?? null,
      link.utmCampaign ?? null,
      link.createdAt,
      link.clicks
    );
  }

  getShortlink(code: string): Shortlink | null {
    const row = this.db.prepare("SELECT * FROM shortlinks WHERE code = ?").get(code) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      code: row.code as string,
      targetUrl: row.target_url as string,
      utmSource: row.utm_source as string | undefined,
      utmMedium: row.utm_medium as string | undefined,
      utmCampaign: row.utm_campaign as string | undefined,
      createdAt: row.created_at as string,
      clicks: row.clicks as number,
    };
  }

  incrementClicks(code: string): void {
    this.db.prepare("UPDATE shortlinks SET clicks = clicks + 1 WHERE code = ?").run(code);
  }

  getShortlinks(): Shortlink[] {
    const rows = this.db.prepare("SELECT * FROM shortlinks ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map((row) => ({
      code: row.code as string,
      targetUrl: row.target_url as string,
      utmSource: row.utm_source as string | undefined,
      utmMedium: row.utm_medium as string | undefined,
      utmCampaign: row.utm_campaign as string | undefined,
      createdAt: row.created_at as string,
      clicks: row.clicks as number,
    }));
  }
}
