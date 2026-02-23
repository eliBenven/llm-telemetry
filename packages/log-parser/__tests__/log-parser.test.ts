import { describe, it, expect } from "vitest";
import { parseNginxLine, parseNginxLog } from "../src/parsers/nginx";
import {
  parseCloudFrontLine,
  parseCloudFrontLog,
} from "../src/parsers/cloudfront";
import { classifyUserAgent } from "../src/classifier";
import { aggregate, toCSV, toJSON } from "../src/aggregator";
import type { ClassifiedLogEntry } from "../src/aggregator";

// ── nginx parser ─────────────────────────────────────────────────────

describe("nginx parser", () => {
  it("parses a standard combined log line", () => {
    const line =
      '66.249.66.1 - - [10/Oct/2024:13:55:36 +0000] "GET /page HTTP/1.1" 200 2326 "-" "Mozilla/5.0 (compatible; GPTBot/1.0)"';
    const entry = parseNginxLine(line);
    expect(entry).not.toBeNull();
    expect(entry!.remoteAddr).toBe("66.249.66.1");
    expect(entry!.method).toBe("GET");
    expect(entry!.path).toBe("/page");
    expect(entry!.status).toBe(200);
    expect(entry!.bodyBytes).toBe(2326);
    expect(entry!.userAgent).toBe("Mozilla/5.0 (compatible; GPTBot/1.0)");
  });

  it("parses line with referer", () => {
    const line =
      '10.0.0.1 - admin [10/Oct/2024:14:00:00 +0000] "POST /api HTTP/2.0" 201 128 "https://example.com" "curl/7.81"';
    const entry = parseNginxLine(line);
    expect(entry).not.toBeNull();
    expect(entry!.remoteUser).toBe("admin");
    expect(entry!.method).toBe("POST");
    expect(entry!.referer).toBe("https://example.com");
  });

  it("returns null for malformed lines", () => {
    expect(parseNginxLine("not a log line")).toBeNull();
    expect(parseNginxLine("")).toBeNull();
  });

  it("parses multi-line content", () => {
    const content = [
      '1.2.3.4 - - [10/Oct/2024:13:55:36 +0000] "GET / HTTP/1.1" 200 100 "-" "Chrome/120"',
      '5.6.7.8 - - [10/Oct/2024:13:55:37 +0000] "GET /about HTTP/1.1" 200 200 "-" "GPTBot/1.0"',
    ].join("\n");
    const entries = parseNginxLog(content);
    expect(entries).toHaveLength(2);
  });
});

// ── CloudFront parser ────────────────────────────────────────────────

describe("CloudFront parser", () => {
  it("parses a standard CloudFront log line", () => {
    const line = [
      "2024-10-10",
      "13:55:36",
      "IAD89-C1",
      "2326",
      "66.249.66.1",
      "GET",
      "example.com",
      "/page",
      "200",
      "-",
      "Mozilla/5.0%20(compatible;%20GPTBot/1.0)",
      "-",
    ].join("\t");
    const entry = parseCloudFrontLine(line);
    expect(entry).not.toBeNull();
    expect(entry!.date).toBe("2024-10-10");
    expect(entry!.clientIp).toBe("66.249.66.1");
    expect(entry!.path).toBe("/page");
    expect(entry!.status).toBe(200);
    expect(entry!.userAgent).toBe("Mozilla/5.0 (compatible; GPTBot/1.0)");
  });

  it("skips comment lines", () => {
    expect(parseCloudFrontLine("#Version: 1.0")).toBeNull();
    expect(parseCloudFrontLine("#Fields: date time ...")).toBeNull();
  });

  it("parses multi-line content, skipping headers", () => {
    const content = [
      "#Version: 1.0",
      "#Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query",
      "2024-10-10\t13:55:36\tIAD89\t100\t1.2.3.4\tGET\texample.com\t/\t200\t-\tChrome\t-",
    ].join("\n");
    const entries = parseCloudFrontLog(content);
    expect(entries).toHaveLength(1);
  });
});

// ── Classifier ───────────────────────────────────────────────────────

describe("classifyUserAgent", () => {
  it("identifies GPTBot", () => {
    const result = classifyUserAgent("Mozilla/5.0 (compatible; GPTBot/1.0)");
    expect(result.isBot).toBe(true);
    expect(result.botName).toBe("gptbot");
  });

  it("identifies ClaudeBot", () => {
    const result = classifyUserAgent("ClaudeBot/1.0");
    expect(result.isBot).toBe(true);
    expect(result.botName).toBe("claudebot");
  });

  it("identifies Bytespider", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (Linux; Android) AppleWebKit Bytespider"
    );
    expect(result.isBot).toBe(true);
    expect(result.botName).toBe("bytespider");
  });

  it("returns human for Chrome UA", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0 Safari/537.36"
    );
    expect(result.isBot).toBe(false);
    expect(result.botName).toBeNull();
  });
});

// ── Aggregator ───────────────────────────────────────────────────────

describe("aggregator", () => {
  const entries: ClassifiedLogEntry[] = [
    {
      timestamp: "10/Oct/2024:13:55:36 +0000",
      path: "/",
      status: 200,
      bodyBytes: 100,
      isBot: true,
      botName: "gptbot",
    },
    {
      timestamp: "10/Oct/2024:14:00:00 +0000",
      path: "/",
      status: 200,
      bodyBytes: 200,
      isBot: true,
      botName: "gptbot",
    },
    {
      timestamp: "10/Oct/2024:14:01:00 +0000",
      path: "/about",
      status: 200,
      bodyBytes: 150,
      isBot: false,
      botName: null,
    },
  ];

  it("aggregates entries by date/bot/path/status", () => {
    const rows = aggregate(entries);
    expect(rows.length).toBe(2); // gptbot / + human /about
    const gptRow = rows.find((r) => r.botName === "gptbot");
    expect(gptRow).toBeDefined();
    expect(gptRow!.count).toBe(2);
    expect(gptRow!.totalBytes).toBe(300);
  });

  it("generates valid CSV", () => {
    const rows = aggregate(entries);
    const csv = toCSV(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,bot_name,path,status,count,total_bytes");
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it("generates valid JSON", () => {
    const rows = aggregate(entries);
    const json = toJSON(rows);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });
});
