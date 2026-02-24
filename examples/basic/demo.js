// Demo helper — sends simulated AI referral events to the collector
const ENDPOINT = "http://localhost:3456/ingest";

const SOURCES = [
  { source: "chatgpt", operator: "OpenAI" },
  { source: "perplexity", operator: "Perplexity AI" },
  { source: "gemini", operator: "Google" },
  { source: "claude", operator: "Anthropic" },
  { source: "copilot", operator: "Microsoft" },
  { source: "deepseek", operator: "DeepSeek" },
  { source: "you.com", operator: "You.com" },
  { source: "phind", operator: "Phind" },
  { source: "kagi", operator: "Kagi" },
];

const PAGES = [
  "/", "/pricing", "/docs", "/blog", "/about",
  "/blog/ai-search-seo", "/docs/getting-started",
  "/enterprise", "/changelog", "/contact",
];

function log(msg, type) {
  var el = document.getElementById("log");
  var entry = document.createElement("div");
  entry.className = "log-entry " + (type || "");
  entry.textContent = new Date().toLocaleTimeString() + "  " + msg;
  el.prepend(entry);
}

function sendEvent(source, operator) {
  var page = PAGES[Math.floor(Math.random() * PAGES.length)];
  var payload = {
    event: "ai_pageview",
    source: source,
    operator: operator,
    page: page,
    url: "https://demo.example.com" + page,
    referrer: "https://" + source + ".com/",
    timestamp: new Date().toISOString(),
    sessionId: "sess-" + Math.random().toString(36).slice(2, 8),
    siteId: "demo-site",
  };

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(function () {
      log("ai_pageview from " + source + " → " + page, "ok");
    })
    .catch(function (err) {
      log("Error: " + err.message, "");
    });
}

function sendConversion(source, operator, name) {
  var payload = {
    event: "ai_conversion",
    source: source,
    operator: operator,
    page: "/signup",
    url: "https://demo.example.com/signup",
    referrer: "https://" + source + ".com/",
    timestamp: new Date().toISOString(),
    sessionId: "sess-" + Math.random().toString(36).slice(2, 8),
    siteId: "demo-site",
  };

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(function () {
      log("ai_conversion: " + name + " from " + source, "info");
    })
    .catch(function (err) {
      log("Error: " + err.message, "");
    });
}

function sendBatch(count) {
  log("Sending " + count + " randomized events...", "info");
  var sent = 0;

  function next() {
    if (sent >= count) {
      log("Batch complete: " + count + " events sent", "ok");
      return;
    }

    var src = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    // 85% pageviews, 15% conversions
    if (Math.random() < 0.85) {
      sendEvent(src.source, src.operator);
    } else {
      sendConversion(src.source, src.operator, "batch_conversion");
    }
    sent++;

    // Stagger to avoid overwhelming, ~50ms between events
    setTimeout(next, 20 + Math.random() * 40);
  }

  next();
}
