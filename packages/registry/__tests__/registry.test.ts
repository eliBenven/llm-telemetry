import { describe, it, expect } from "vitest";
import {
  classifyBot,
  classifyReferrer,
  getBotNames,
  getReferrerNames,
  bots,
  referrers,
} from "../src/index";

// ── Bot classification ───────────────────────────────────────────────

describe("classifyBot", () => {
  it("identifies GPTBot", () => {
    const result = classifyBot(
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)"
    );
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("gptbot");
      expect(result.operator).toBe("OpenAI");
    }
  });

  it("identifies ChatGPT-User", () => {
    const result = classifyBot(
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)"
    );
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("chatgpt-user");
    }
  });

  it("identifies ClaudeBot", () => {
    const result = classifyBot("ClaudeBot/1.0");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("claudebot");
      expect(result.operator).toBe("Anthropic");
    }
  });

  it("identifies anthropic-ai", () => {
    const result = classifyBot("anthropic-ai/1.0");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("anthropic-ai");
    }
  });

  it("identifies PerplexityBot", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; PerplexityBot/1.0)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("perplexitybot");
    }
  });

  it("identifies Google-Extended", () => {
    const result = classifyBot(
      "Mozilla/5.0 (compatible; Google-Extended) Googlebot/2.1"
    );
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("google-extended");
    }
  });

  it("identifies Amazonbot", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; Amazonbot/0.1)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("amazonbot");
      expect(result.operator).toBe("Amazon");
    }
  });

  it("identifies Bytespider", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; Bytespider)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("bytespider");
      expect(result.operator).toBe("ByteDance / TikTok");
    }
  });

  it("identifies Meta-ExternalAgent", () => {
    const result = classifyBot(
      "Mozilla/5.0 (compatible; Meta-ExternalAgent/1.0)"
    );
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("meta-externalagent");
    }
  });

  it("identifies CCBot", () => {
    const result = classifyBot("CCBot/2.0 (https://commoncrawl.org/faq/)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("ccbot");
    }
  });

  it("identifies Diffbot", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; Diffbot/0.1)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("diffbot");
    }
  });

  it("identifies AhrefsBot", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; AhrefsBot/7.0)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("ahrefsbot");
    }
  });

  it("identifies DataForSeoBot", () => {
    const result = classifyBot("Mozilla/5.0 (compatible; DataForSeoBot/1.0)");
    expect(result.isBot).toBe(true);
    if (result.isBot) {
      expect(result.name).toBe("dataforseobot");
    }
  });

  it("returns isBot=false for a normal browser UA", () => {
    const result = classifyBot(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    expect(result.isBot).toBe(false);
    expect(result.name).toBeNull();
  });

  it("returns isBot=false for empty string", () => {
    const result = classifyBot("");
    expect(result.isBot).toBe(false);
  });

  it("is case-insensitive", () => {
    const result = classifyBot("gptbot/1.0");
    expect(result.isBot).toBe(true);
  });
});

// ── Referrer classification ──────────────────────────────────────────

describe("classifyReferrer", () => {
  it("identifies ChatGPT referrer (chatgpt.com)", () => {
    const result = classifyReferrer("https://chatgpt.com/");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("chatgpt");
      expect(result.operator).toBe("OpenAI");
    }
  });

  it("identifies ChatGPT referrer (chat.openai.com)", () => {
    const result = classifyReferrer("https://chat.openai.com/c/abc");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("chatgpt");
    }
  });

  it("identifies Perplexity referrer", () => {
    const result = classifyReferrer("https://www.perplexity.ai/search/abc");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("perplexity");
    }
  });

  it("identifies Gemini referrer", () => {
    const result = classifyReferrer("https://gemini.google.com/app/abc");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("gemini");
    }
  });

  it("identifies Copilot referrer", () => {
    const result = classifyReferrer("https://copilot.microsoft.com/");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("copilot");
    }
  });

  it("identifies Claude referrer", () => {
    const result = classifyReferrer("https://claude.ai/chat/abc");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("claude");
    }
  });

  it("identifies You.com referrer", () => {
    const result = classifyReferrer("https://you.com/search?q=test");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("you");
    }
  });

  it("identifies Phind referrer", () => {
    const result = classifyReferrer("https://www.phind.com/search?q=test");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("phind");
    }
  });

  it("identifies Kagi referrer", () => {
    const result = classifyReferrer("https://kagi.com/search?q=test");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("kagi");
    }
  });

  it("identifies DeepSeek referrer", () => {
    const result = classifyReferrer("https://chat.deepseek.com/");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("deepseek");
    }
  });

  it("identifies Grok referrer", () => {
    const result = classifyReferrer("https://grok.x.ai/");
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("grok");
    }
  });

  it("identifies Brave Search referrer", () => {
    const result = classifyReferrer(
      "https://search.brave.com/search?q=test&source=ai"
    );
    expect(result.isAIReferrer).toBe(true);
    if (result.isAIReferrer) {
      expect(result.name).toBe("brave-ai");
    }
  });

  it("returns isAIReferrer=false for Google organic", () => {
    const result = classifyReferrer("https://www.google.com/search?q=test");
    expect(result.isAIReferrer).toBe(false);
    expect(result.name).toBeNull();
  });

  it("returns isAIReferrer=false for empty string", () => {
    const result = classifyReferrer("");
    expect(result.isAIReferrer).toBe(false);
  });

  it("returns isAIReferrer=false for invalid URL", () => {
    const result = classifyReferrer("not-a-url");
    expect(result.isAIReferrer).toBe(false);
  });
});

// ── Data integrity ───────────────────────────────────────────────────

describe("registry data integrity", () => {
  it("has 20+ bot entries", () => {
    expect(bots.length).toBeGreaterThanOrEqual(20);
  });

  it("has 10+ referrer entries", () => {
    expect(referrers.length).toBeGreaterThanOrEqual(10);
  });

  it("all bots have name, operator, purpose, and at least one match rule", () => {
    for (const bot of bots) {
      expect(bot.name).toBeTruthy();
      expect(bot.operator).toBeTruthy();
      expect(bot.purpose).toBeTruthy();
      expect(bot.match.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all referrers have name, operator, and at least one match rule", () => {
    for (const ref of referrers) {
      expect(ref.name).toBeTruthy();
      expect(ref.operator).toBeTruthy();
      expect(ref.match.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("bot names are unique", () => {
    const names = getBotNames();
    expect(new Set(names).size).toBe(names.length);
  });

  it("referrer names are unique", () => {
    const names = getReferrerNames();
    expect(new Set(names).size).toBe(names.length);
  });
});
