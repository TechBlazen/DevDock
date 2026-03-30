import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const SERVICE_NAME = 'devdock';
const SERVICE_VERSION = '0.1.0';

let tracerProvider: WebTracerProvider | null = null;
let meterProvider: MeterProvider | null = null;

export interface OTelInitOptions {
  endpoint: string;
  exportTraces: boolean;
  exportMetrics: boolean;
  headers?: Record<string, string>;
}

export function initOTel(options: OTelInitOptions): void {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  if (options.exportTraces) {
    const traceExporter = new OTLPTraceExporter({
      url: `${options.endpoint}/v1/traces`,
      headers: options.headers ?? {},
    });
    tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });
    tracerProvider.register();
    console.info('[OTel] Trace provider →', options.endpoint);
  }

  if (options.exportMetrics) {
    const metricExporter = new OTLPMetricExporter({
      url: `${options.endpoint}/v1/metrics`,
      headers: options.headers ?? {},
    });
    meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 15_000,
        }),
      ],
    });
    console.info('[OTel] Metric provider registered');
  }
}

export function shutdownOTel(): Promise<void[]> {
  const shutdowns: Promise<void>[] = [];
  if (tracerProvider) shutdowns.push(tracerProvider.shutdown());
  if (meterProvider) shutdowns.push(meterProvider.shutdown());
  return Promise.all(shutdowns);
}

export function getTracer(name = SERVICE_NAME): Tracer {
  return trace.getTracer(name, SERVICE_VERSION);
}

export async function withSpan<T>(
  name: string,
  fn: (span: ReturnType<Tracer['startSpan']>) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

export function traceAICall(provider: string, model: string) {
  const span = getTracer().startSpan('ai.chat.completion', {
    attributes: { 'ai.provider': provider, 'ai.model': model },
  });
  return {
    end: (status: 'ok' | 'error' = 'ok', error?: string) => {
      span.setStatus({
        code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message: error,
      });
      span.end();
      return span.spanContext().traceId;
    },
  };
}

export function traceRepoFetch(source: string, operation: string) {
  const span = getTracer().startSpan(`repo.${source}.${operation}`, {
    attributes: { 'repo.source': source, 'repo.operation': operation },
  });
  return {
    end: (status: 'ok' | 'error' = 'ok') => {
      span.setStatus({ code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      span.end();
    },
  };
}
