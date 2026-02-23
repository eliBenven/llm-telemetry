/**
 * Classify log entries using the AI bot registry.
 * Wraps the registry's classifyBot for use with parsed log data.
 */

import botsData from "../../registry/ai-bots.json";

interface BotMatch {
  type: "ua_contains";
  value: string;
}

interface BotEntry {
  name: string;
  operator: string;
  purpose: string;
  match: BotMatch[];
}

const bots: BotEntry[] = botsData.bots as BotEntry[];

export interface ClassifiedRequest {
  isBot: boolean;
  botName: string | null;
  operator: string | null;
}

/**
 * Classify a user-agent string as a known AI bot or human.
 */
export function classifyUserAgent(userAgent: string): ClassifiedRequest {
  if (!userAgent) {
    return { isBot: false, botName: null, operator: null };
  }

  const ua = userAgent.toLowerCase();

  for (const bot of bots) {
    for (const rule of bot.match) {
      if (rule.type === "ua_contains") {
        if (ua.includes(rule.value.toLowerCase())) {
          return {
            isBot: true,
            botName: bot.name,
            operator: bot.operator,
          };
        }
      }
    }
  }

  return { isBot: false, botName: null, operator: null };
}
