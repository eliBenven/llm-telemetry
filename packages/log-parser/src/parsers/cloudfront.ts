/**
 * Parse AWS CloudFront log format (tab-separated).
 *
 * CloudFront logs are tab-delimited with a 2-line header:
 *   #Version: 1.0
 *   #Fields: date time x-edge-location ...
 *
 * Standard fields (W3C Extended):
 *   date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem
 *   sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie)
 *   x-edge-result-type x-edge-request-id x-host-header cs-protocol
 *   cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher
 *   x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields
 *   c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len
 *   sc-range-start sc-range-end
 */

export interface CloudFrontLogEntry {
  date: string;
  time: string;
  edgeLocation: string;
  scBytes: number;
  clientIp: string;
  method: string;
  host: string;
  path: string;
  status: number;
  referer: string;
  userAgent: string;
  queryString: string;
}

export function parseCloudFrontLine(line: string): CloudFrontLogEntry | null {
  // Skip comment lines
  if (line.startsWith("#")) return null;

  const fields = line.split("\t");
  if (fields.length < 12) return null;

  return {
    date: fields[0],
    time: fields[1],
    edgeLocation: fields[2],
    scBytes: parseInt(fields[3], 10),
    clientIp: fields[4],
    method: fields[5],
    host: fields[6],
    path: fields[7],
    status: parseInt(fields[8], 10),
    referer: decodeURIComponent(fields[9] === "-" ? "" : fields[9]),
    userAgent: decodeURIComponent(fields[10] === "-" ? "" : fields[10]),
    queryString: fields[11] === "-" ? "" : fields[11],
  };
}

/**
 * Parse a multi-line CloudFront log string into entries.
 */
export function parseCloudFrontLog(content: string): CloudFrontLogEntry[] {
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(parseCloudFrontLine)
    .filter((entry): entry is CloudFrontLogEntry => entry !== null);
}
