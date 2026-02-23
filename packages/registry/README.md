# @llm-telemetry/registry

Source of truth for identifying:
- **AI crawlers/bots** (30+ entries) -- user-agent string matching
- **AI referrers** (19 entries) -- domain/URL matching

## Usage

```ts
import { classifyBot, classifyReferrer } from "@llm-telemetry/registry";

const bot = classifyBot("GPTBot/1.0");
// { isBot: true, name: "gptbot", operator: "OpenAI", purpose: "Training data..." }

const ref = classifyReferrer("https://chatgpt.com/");
// { isAIReferrer: true, name: "chatgpt", operator: "OpenAI" }
```

## Data files

- `ai-bots.json` -- Bot entries with `ua_contains` match rules
- `ai-referrers.json` -- Referrer entries with `domain` and `domain_path` match rules

## Contributing a new entry

1. Add the entry to `ai-bots.json` or `ai-referrers.json`
2. Add a test case in `__tests__/registry.test.ts`
3. Run `npm test` to verify all tests pass
4. Submit a PR

### Bot entry format

```json
{
  "name": "mybot",
  "operator": "My Company",
  "purpose": "What this bot does",
  "match": [{ "type": "ua_contains", "value": "MyBot" }]
}
```

### Referrer entry format

```json
{
  "name": "myservice",
  "operator": "My Company",
  "match": [{ "type": "domain", "value": "chat.myservice.com" }]
}
```

## Building

```bash
npm run build   # Compile TypeScript
npm test        # Run tests
```
