/**
 * @llm-telemetry/referral-snippet
 *
 * Drop-in browser script that detects AI-referred traffic and sends
 * beacon events to a configurable endpoint.
 *
 * Usage:
 *   <script src="snippet.js"
 *     data-endpoint="https://yoursite.com/api/ingest"
 *     data-site-id="my-site">
 *   </script>
 */

// ── Embedded referrer registry (inlined at build time) ───────────────

interface ReferrerRule {
  type: "domain" | "domain_path";
  value: string;
  param?: string;
  paramValue?: string;
}

interface ReferrerSource {
  name: string;
  operator: string;
  match: ReferrerRule[];
}

const AI_REFERRERS: ReferrerSource[] = [
  { name: "chatgpt", operator: "OpenAI", match: [{ type: "domain", value: "chat.openai.com" }, { type: "domain", value: "chatgpt.com" }] },
  { name: "searchgpt", operator: "OpenAI", match: [{ type: "domain", value: "search.chatgpt.com" }] },
  { name: "perplexity", operator: "Perplexity AI", match: [{ type: "domain", value: "www.perplexity.ai" }, { type: "domain", value: "perplexity.ai" }] },
  { name: "gemini", operator: "Google", match: [{ type: "domain", value: "gemini.google.com" }] },
  { name: "copilot", operator: "Microsoft", match: [{ type: "domain", value: "copilot.microsoft.com" }, { type: "domain", value: "www.bing.com/chat" }] },
  { name: "claude", operator: "Anthropic", match: [{ type: "domain", value: "claude.ai" }] },
  { name: "you", operator: "You.com", match: [{ type: "domain", value: "you.com" }, { type: "domain", value: "www.you.com" }] },
  { name: "phind", operator: "Phind", match: [{ type: "domain", value: "www.phind.com" }, { type: "domain", value: "phind.com" }] },
  { name: "kagi", operator: "Kagi", match: [{ type: "domain", value: "kagi.com" }, { type: "domain", value: "www.kagi.com" }] },
  { name: "brave-ai", operator: "Brave", match: [{ type: "domain", value: "search.brave.com" }] },
  { name: "deepseek", operator: "DeepSeek", match: [{ type: "domain", value: "chat.deepseek.com" }, { type: "domain", value: "deepseek.com" }] },
  { name: "grok", operator: "xAI", match: [{ type: "domain", value: "x.ai" }, { type: "domain", value: "grok.x.ai" }] },
  { name: "huggingchat", operator: "Hugging Face", match: [{ type: "domain", value: "huggingface.co/chat" }] },
  { name: "mistral-le-chat", operator: "Mistral AI", match: [{ type: "domain", value: "chat.mistral.ai" }] },
];

// ── Helpers ──────────────────────────────────────────────────────────

function classifyReferrer(url: string): { name: string; operator: string } | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullPath = (hostname + parsed.pathname).toLowerCase();

  for (const source of AI_REFERRERS) {
    for (const rule of source.match) {
      if (rule.type === "domain") {
        const matchDomain = rule.value.toLowerCase();
        if (hostname === matchDomain || hostname === "www." + matchDomain) {
          return { name: source.name, operator: source.operator };
        }
      } else if (rule.type === "domain_path") {
        if (fullPath.includes(rule.value.toLowerCase())) {
          if (rule.param && rule.paramValue) {
            if (parsed.searchParams.get(rule.param) === rule.paramValue) {
              return { name: source.name, operator: source.operator };
            }
          } else {
            return { name: source.name, operator: source.operator };
          }
        }
      }
    }
  }

  return null;
}

function getSessionId(): string {
  const key = "__llmt_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const val = params.get(key);
    if (val) utms[key] = val;
  }
  return utms;
}

function getScriptConfig(): { endpoint: string; siteId: string } {
  const script = document.currentScript as HTMLScriptElement | null;
  return {
    endpoint: script?.getAttribute("data-endpoint") || "/api/ingest",
    siteId: script?.getAttribute("data-site-id") || window.location.hostname,
  };
}

function sendBeacon(endpoint: string, payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }
}

// ── Main ─────────────────────────────────────────────────────────────

(function llmTelemetrySnippet() {
  const config = getScriptConfig();
  const referrer = document.referrer;
  const classification = classifyReferrer(referrer);
  const sessionId = getSessionId();
  const utms = getUtmParams();

  // Only fire events if this is an AI referral (or has AI-related UTMs)
  const isAiTraffic = classification !== null || utms.utm_source?.includes("ai") || utms.utm_medium === "ai";

  if (!isAiTraffic) return;

  // Emit ai_pageview
  const pageviewPayload = {
    event: "ai_pageview",
    source: classification?.name || utms.utm_source || "unknown",
    operator: classification?.operator || null,
    referrer,
    page: window.location.pathname,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    sessionId,
    siteId: config.siteId,
    ...utms,
  };

  sendBeacon(config.endpoint, pageviewPayload);

  // Expose conversion helper on window
  (window as any).__llmTelemetry = {
    trackConversion(conversionName: string, value?: number, metadata?: Record<string, unknown>) {
      const conversionPayload = {
        event: "ai_conversion",
        conversion: conversionName,
        value: value ?? null,
        source: classification?.name || utms.utm_source || "unknown",
        operator: classification?.operator || null,
        referrer,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        sessionId,
        siteId: config.siteId,
        ...(metadata || {}),
      };
      sendBeacon(config.endpoint, conversionPayload);
    },
  };
})();
