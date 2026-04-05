# OpenTelemetry Onboarding Guide

This guide covers how OpenTelemetry (OTel) is integrated into DevDock, how to set up a collector, and how to add tracing to new components.

---

## Architecture Overview

DevDock uses the **OpenTelemetry Web SDK** running in the browser. Traces and metrics are exported via **OTLP over HTTP** to a configurable collector endpoint.

```
┌──────────────┐     OTLP/HTTP      ┌──────────────────┐
│   DevDock    │ ──────────────────► │   OTel Collector  │
│  (Browser)   │   /v1/traces       │  (Jaeger, Tempo,  │
│              │   /v1/metrics      │   SigNoz, etc.)   │
└──────────────┘                    └──────────────────┘
```

**SDK Components:**
- `WebTracerProvider` — creates and manages trace spans
- `MeterProvider` — records metrics (counters, histograms)
- `OTLPTraceExporter` — exports spans via HTTP
- `OTLPMetricExporter` — exports metrics every 15 seconds
- `BatchSpanProcessor` — batches spans before export

---

## Configuration

Navigate to **Settings → OpenTelemetry** to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| OTLP Collector Endpoint | `http://localhost:4317` | Base URL of your OTLP-compatible collector |
| Export Traces | Enabled | Toggle trace span export |
| Export Metrics | Enabled | Toggle metric export |
| Export Logs | Disabled | Toggle log export (future) |
| Headers | — | Custom headers for auth (e.g., API keys) |

Click **Apply** after changing settings to reinitialize the SDK.

---

## Setting Up a Collector

You need an OTLP-compatible collector running. Here are common options:

### Jaeger (Quickstart)

```bash
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

- Collector: `http://localhost:4317`
- UI: `http://localhost:16686`

### Grafana Tempo + Alloy

```bash
# docker-compose.yml
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317:4317"
      - "3200:3200"
    command: ["-config.file=/etc/tempo.yaml"]

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

### OpenTelemetry Collector

```bash
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  otel/opentelemetry-collector:latest
```

### SaaS Options

| Provider | Endpoint Format | Auth Header |
|----------|----------------|-------------|
| **Honeycomb** | `https://api.honeycomb.io` | `x-honeycomb-team: <API_KEY>` |
| **Datadog** | `https://otel.datadoghq.com` | `DD-API-KEY: <API_KEY>` |
| **New Relic** | `https://otlp.nr-data.net` | `api-key: <LICENSE_KEY>` |
| **Grafana Cloud** | `https://otlp-gateway-<region>.grafana.net/otlp` | `Authorization: Basic <base64>` |

Set the endpoint and headers in **Settings → OpenTelemetry**.

---

## What's Currently Instrumented

### AI Chat Completions

Every LLM call is traced with provider and model attributes:

```typescript
import { traceAICall } from '../otel';

const tracer = traceAICall('anthropic', 'claude-sonnet-4');
try {
  const result = await callLLM(...);
  const traceId = tracer.end('ok');
  // traceId is stored on the chat message for correlation
} catch (e) {
  tracer.end('error', String(e));
}
```

**Span attributes:** `ai.provider`, `ai.model`

### Repository Fetches

GitHub and ADO repo enumeration is traced:

```typescript
import { traceRepoFetch } from '../otel';

const span = traceRepoFetch('github', 'list_repos');
try {
  const repos = await fetchRepos(...);
  span.end('ok');
} catch (e) {
  span.end('error');
  throw e;
}
```

**Span attributes:** `repo.source`, `repo.operation`

---

## Adding Tracing to New Components

### Option 1: `withSpan` (Recommended for async operations)

The simplest way to trace an async operation:

```typescript
import { withSpan } from '../otel';

async function fetchData() {
  return withSpan('data.fetch', async (span) => {
    span.setAttribute('data.source', 'api');
    span.setAttribute('data.count', 42);
    const result = await api.getData();
    return result;
  });
}
```

The span automatically records duration and error status.

### Option 2: `getTracer` (Manual span management)

For more control over span lifecycle:

```typescript
import { getTracer } from '../otel';

const tracer = getTracer('my-module');

async function processItems(items: Item[]) {
  const span = tracer.startSpan('items.process', {
    attributes: {
      'items.count': items.length,
    },
  });

  try {
    for (const item of items) {
      // Create child spans for sub-operations
      const childSpan = tracer.startSpan('item.transform');
      await transform(item);
      childSpan.end();
    }
    span.setStatus({ code: 1 }); // OK
  } catch (e) {
    span.setStatus({ code: 2, message: String(e) }); // ERROR
    span.recordException(e as Error);
    throw e;
  } finally {
    span.end();
  }
}
```

### Option 3: Pre-built helpers

Use `traceAICall` or `traceRepoFetch` for standardized spans:

```typescript
// AI calls
const t = traceAICall('openai', 'gpt-4o');
// ... do work ...
t.end('ok'); // or t.end('error', 'message')

// Repo operations
const s = traceRepoFetch('ado', 'fetch_commits');
// ... do work ...
s.end('ok');
```

---

## Suggested Instrumentation Opportunities

Areas not yet traced that could benefit from OTel:

| Area | What to Trace | Helper |
|------|--------------|--------|
| MCP Server calls | Tool invocations, response times | `withSpan('mcp.tool_call', ...)` |
| Doc import/export | File fetch from GitHub/ADO | `withSpan('docs.import', ...)` |
| Page navigation | Route changes, load times | `withSpan('navigation', ...)` |
| Search queries | Command palette searches | `withSpan('search.query', ...)` |
| Auth flows | Login/logout, token refresh | `withSpan('auth.login', ...)` |
| Build status checks | CI/CD polling | `withSpan('builds.fetch', ...)` |

---

## Viewing Traces in DevDock

The **Observability** page (`/telemetry`) shows:

- **Metrics Bar** — req/sec, P99 latency, error rate, active spans, total traces
- **Trace List** — filterable by status (ok/error) and service name
- **Span Details** — click any trace to expand and view attributes, span ID, and duration

Traces from AI calls include a `traceId` that links back to the chat message that triggered them.

---

## Dependencies

The following OTel packages are installed:

```
@opentelemetry/api
@opentelemetry/sdk-trace-web
@opentelemetry/sdk-trace-base
@opentelemetry/sdk-metrics
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/exporter-metrics-otlp-http
@opentelemetry/instrumentation-fetch
@opentelemetry/resources
@opentelemetry/semantic-conventions
```

---

## Troubleshooting

**Traces not appearing in collector:**
1. Check the endpoint URL in Settings (default: `http://localhost:4317`)
2. Ensure the collector is running and accepts OTLP HTTP on that port
3. Check browser console for CORS errors — the collector must allow the DevDock origin
4. Verify "Export Traces" is enabled in Settings
5. Click **Apply** after changing any OTel settings

**CORS issues with collector:**
Add CORS headers to your collector config:
```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        cors:
          allowed_origins: ["http://localhost:5173"]
          allowed_headers: ["*"]
```

**High memory usage:**
The `BatchSpanProcessor` batches spans before export. If your collector is down, spans accumulate in memory. Restart the collector or disable trace export temporarily.
