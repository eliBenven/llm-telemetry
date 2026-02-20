# sdk-node

Node.js / server-side instrumentation.

Planned adapters:
- OpenAI (Responses + ChatCompletions)
- Anthropic
- Google Gemini
- Azure OpenAI

Exports:
- `instrumentOpenAI(client, options)`
- `instrumentAnthropic(client, options)`
- `withLLMSpan(name, attrs, fn)`

This SDK emits OpenTelemetry spans/metrics/logs using the schema in `packages/semantic-conventions`.
