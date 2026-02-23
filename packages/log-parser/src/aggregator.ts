/**
 * Aggregate classified log entries into daily summaries.
 */

export interface AggregateKey {
  date: string;
  botName: string; // "human" for non-bot traffic
  path: string;
  status: number;
}

export interface AggregateRow {
  date: string;
  botName: string;
  path: string;
  status: number;
  count: number;
  totalBytes: number;
}

export interface ClassifiedLogEntry {
  timestamp: string; // raw timestamp string from log
  path: string;
  status: number;
  bodyBytes: number;
  isBot: boolean;
  botName: string | null;
}

/**
 * Extract a date string (YYYY-MM-DD) from nginx timestamp format.
 * Input: "10/Oct/2024:13:55:36 +0000"
 */
function extractDate(timestamp: string): string {
  // Try nginx format: DD/Mon/YYYY:HH:MM:SS +ZZZZ
  const nginxMatch = timestamp.match(
    /(\d{2})\/(\w{3})\/(\d{4})/
  );
  if (nginxMatch) {
    const months: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const month = months[nginxMatch[2]] || "01";
    return `${nginxMatch[3]}-${month}-${nginxMatch[1]}`;
  }

  // Try CloudFront format: YYYY-MM-DD
  const cfMatch = timestamp.match(/(\d{4}-\d{2}-\d{2})/);
  if (cfMatch) return cfMatch[1];

  return "unknown";
}

/**
 * Aggregate classified log entries into daily summaries.
 */
export function aggregate(entries: ClassifiedLogEntry[]): AggregateRow[] {
  const map = new Map<string, AggregateRow>();

  for (const entry of entries) {
    const date = extractDate(entry.timestamp);
    const botName = entry.isBot ? (entry.botName || "unknown-bot") : "human";
    const key = `${date}|${botName}|${entry.path}|${entry.status}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalBytes += entry.bodyBytes;
    } else {
      map.set(key, {
        date,
        botName,
        path: entry.path,
        status: entry.status,
        count: 1,
        totalBytes: entry.bodyBytes,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.botName !== b.botName) return a.botName.localeCompare(b.botName);
    return a.path.localeCompare(b.path);
  });
}

/**
 * Convert aggregate rows to CSV string.
 */
export function toCSV(rows: AggregateRow[]): string {
  const header = "date,bot_name,path,status,count,total_bytes";
  const lines = rows.map(
    (r) => `${r.date},${r.botName},${r.path},${r.status},${r.count},${r.totalBytes}`
  );
  return [header, ...lines].join("\n");
}

/**
 * Convert aggregate rows to JSON string.
 */
export function toJSON(rows: AggregateRow[]): string {
  return JSON.stringify(rows, null, 2);
}
