# sdk-web

Browser instrumentation.

Goals:
- drop-in script tag (or npm pkg)
- correlate UI actions → AI calls (trace context)
- capture latency + success/failure + model metadata

This will ship events to your backend via OTLP/HTTP or via a lightweight relay endpoint.
