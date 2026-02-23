/**
 * Shortlink management: create, resolve, track.
 */

import type { StorageAdapter, Shortlink } from "./storage";

/**
 * Generate a random alphanumeric code.
 */
function generateCode(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface CreateShortlinkInput {
  targetUrl: string;
  code?: string; // custom code, or auto-generate
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Create a new shortlink.
 */
export function createShortlink(
  storage: StorageAdapter,
  input: CreateShortlinkInput
): Shortlink {
  const code = input.code || generateCode();
  const link: Shortlink = {
    code,
    targetUrl: input.targetUrl,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    createdAt: new Date().toISOString(),
    clicks: 0,
  };
  storage.insertShortlink(link);
  return link;
}

/**
 * Resolve a shortlink code to a redirect URL with UTM parameters appended.
 * Returns null if the code does not exist.
 */
export function resolveShortlink(
  storage: StorageAdapter,
  code: string
): { redirectUrl: string; link: Shortlink } | null {
  const link = storage.getShortlink(code);
  if (!link) return null;

  // Increment click count
  storage.incrementClicks(code);

  // Build redirect URL with UTMs
  const url = new URL(link.targetUrl);
  if (link.utmSource) url.searchParams.set("utm_source", link.utmSource);
  if (link.utmMedium) url.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign);

  return { redirectUrl: url.toString(), link };
}

/**
 * List all shortlinks.
 */
export function listShortlinks(storage: StorageAdapter): Shortlink[] {
  return storage.getShortlinks();
}
