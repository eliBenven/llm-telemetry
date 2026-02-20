# registry

Source of truth for identifying:
- AI crawlers/bots (user agents, IP ranges when available, robots.txt hints)
- AI referrers (domains + patterns)

Outputs:
- machine-readable JSON
- versioned releases

Acceptance:
- `ai-bots.json` and `ai-referrers.json` exist
- docs explain how to contribute new entries + tests
