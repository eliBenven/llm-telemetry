import botsData from "../ai-bots.json";
import referrersData from "../ai-referrers.json";

// ── Types ────────────────────────────────────────────────────────────

export interface BotMatch {
  type: "ua_contains";
  value: string;
}

export interface BotEntry {
  name: string;
  operator: string;
  purpose: string;
  match: BotMatch[];
}

export interface ReferrerMatch {
  type: "domain" | "domain_path";
  value: string;
  param?: string;
  paramValue?: string;
}

export interface ReferrerEntry {
  name: string;
  operator: string;
  match: ReferrerMatch[];
}

export interface BotClassification {
  isBot: true;
  name: string;
  operator: string;
  purpose: string;
}

export interface NotBotClassification {
  isBot: false;
  name: null;
  operator: null;
  purpose: null;
}

export type BotResult = BotClassification | NotBotClassification;

export interface ReferrerClassification {
  isAIReferrer: true;
  name: string;
  operator: string;
}

export interface NotReferrerClassification {
  isAIReferrer: false;
  name: null;
  operator: null;
}

export type ReferrerResult = ReferrerClassification | NotReferrerClassification;

// ── Data ─────────────────────────────────────────────────────────────

export const bots: BotEntry[] = botsData.bots as BotEntry[];
export const referrers: ReferrerEntry[] = referrersData.sources as ReferrerEntry[];

// ── Classification ───────────────────────────────────────────────────

/**
 * Classify a user-agent string as a known AI bot or not.
 */
export function classifyBot(userAgent: string): BotResult {
  if (!userAgent) {
    return { isBot: false, name: null, operator: null, purpose: null };
  }

  const ua = userAgent.toLowerCase();

  for (const bot of bots) {
    for (const rule of bot.match) {
      if (rule.type === "ua_contains") {
        if (ua.includes(rule.value.toLowerCase())) {
          return {
            isBot: true,
            name: bot.name,
            operator: bot.operator,
            purpose: bot.purpose,
          };
        }
      }
    }
  }

  return { isBot: false, name: null, operator: null, purpose: null };
}

/**
 * Classify a referrer URL as a known AI referral source or not.
 */
export function classifyReferrer(referrerUrl: string): ReferrerResult {
  if (!referrerUrl) {
    return { isAIReferrer: false, name: null, operator: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(referrerUrl);
  } catch {
    return { isAIReferrer: false, name: null, operator: null };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullPath = (hostname + parsed.pathname).toLowerCase();

  for (const source of referrers) {
    for (const rule of source.match) {
      if (rule.type === "domain") {
        const matchDomain = rule.value.toLowerCase();
        if (hostname === matchDomain || hostname === "www." + matchDomain) {
          return {
            isAIReferrer: true,
            name: source.name,
            operator: source.operator,
          };
        }
      } else if (rule.type === "domain_path") {
        const matchValue = rule.value.toLowerCase();
        if (fullPath.includes(matchValue)) {
          // If there's a param check, verify it
          if (rule.param && rule.paramValue) {
            if (parsed.searchParams.get(rule.param) === rule.paramValue) {
              return {
                isAIReferrer: true,
                name: source.name,
                operator: source.operator,
              };
            }
          } else {
            return {
              isAIReferrer: true,
              name: source.name,
              operator: source.operator,
            };
          }
        }
      }
    }
  }

  return { isAIReferrer: false, name: null, operator: null };
}

/**
 * Get all registered bot names.
 */
export function getBotNames(): string[] {
  return bots.map((b) => b.name);
}

/**
 * Get all registered referrer source names.
 */
export function getReferrerNames(): string[] {
  return referrers.map((r) => r.name);
}
