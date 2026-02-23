/**
 * Parse nginx combined log format.
 *
 * Format:
 *   $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
 *
 * Example:
 *   66.249.66.1 - - [10/Oct/2024:13:55:36 +0000] "GET /page HTTP/1.1" 200 2326 "-" "Mozilla/5.0 (compatible; GPTBot/1.0)"
 */

export interface NginxLogEntry {
  remoteAddr: string;
  remoteUser: string;
  timestamp: string;
  method: string;
  path: string;
  protocol: string;
  status: number;
  bodyBytes: number;
  referer: string;
  userAgent: string;
}

// Regex for nginx combined log format
const NGINX_REGEX =
  /^(\S+) - (\S+) \[([^\]]+)\] "(\S+)\s+(\S+)\s+(\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;

export function parseNginxLine(line: string): NginxLogEntry | null {
  const match = line.match(NGINX_REGEX);
  if (!match) return null;

  return {
    remoteAddr: match[1],
    remoteUser: match[2],
    timestamp: match[3],
    method: match[4],
    path: match[5],
    protocol: match[6],
    status: parseInt(match[7], 10),
    bodyBytes: parseInt(match[8], 10),
    referer: match[9],
    userAgent: match[10],
  };
}

/**
 * Parse a multi-line nginx log string into entries.
 */
export function parseNginxLog(content: string): NginxLogEntry[] {
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(parseNginxLine)
    .filter((entry): entry is NginxLogEntry => entry !== null);
}
