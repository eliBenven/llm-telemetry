# referral-snippet

Drop-in JS snippet to track **AI-referred human traffic**.

Emits events:
- `ai_pageview`
- `ai_conversion`

Fields:
- `ai_source` (chatgpt, perplexity, gemini, copilot, claude, unknown)
- `referrer`
- `utm_*`
- `landing_path`
- `session_id`

Destinations (planned):
- webhook
- PostHog
- GA4 measurement protocol
