# semantic-conventions

This package is the **source of truth** for the LLM/AI telemetry schema.

## Principles
- Align with OpenTelemetry conventions where possible.
- Be provider-agnostic (OpenAI/Anthropic/Gemini/Azure/local).
- Prefer **metadata** by default; prompt/response capture is optional and must support redaction.

## Canonical span
Create a span per model invocation:
- `llm.request` (span name)

### Required attributes
- `llm.provider` (e.g. `openai`, `anthropic`, `google`, `azure-openai`, `local`)
- `llm.model` (e.g. `gpt-4.1`, `claude-3-7-sonnet`)
- `llm.operation` (`chat.completions`, `responses`, `embeddings`, `rerank`, `moderations`)
- `llm.streaming` (bool)

### Token + cost
- `llm.usage.input_tokens`
- `llm.usage.output_tokens`
- `llm.usage.total_tokens`
- `llm.cost.usd` (optional; derived or reported)

### Correlation / product analytics
- `app.feature` (string)
- `enduser.id` (hashed)
- `session.id` (hashed)

### Errors
- `llm.error.type` (rate_limit, timeout, safety, invalid_request, provider_unavailable, tool_error)
- `llm.error.code` (provider-specific)

## Events
- `llm.tool.call` / `llm.tool.result`
- `llm.retry`
- `llm.fallback`

(We’ll add a formal JSON schema + semconv generator.)
