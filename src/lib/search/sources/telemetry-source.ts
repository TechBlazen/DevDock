import type { SearchSource, SearchDocument } from '../types';
import type { TraceSpan } from '../../../types';

interface TelemetryStoreState {
  spans: TraceSpan[];
}

export function createTelemetrySource(getState: () => TelemetryStoreState): SearchSource {
  return {
    category: 'telemetry',
    label: 'Telemetry',
    icon: 'Activity',
    getDocuments(): SearchDocument[] {
      return getState().spans.map((span) => ({
        id: `telemetry:${span.spanId}`,
        category: 'telemetry',
        title: `${span.service} / ${span.operation}`,
        description: `Trace ${span.traceId.slice(0, 8)}... — ${span.status}`,
        url: '/telemetry',
        icon: 'Activity',
        extra: `${span.service} ${span.operation} ${span.status}`,
        meta: {
          status: span.status,
          duration: `${span.duration}ms`,
        },
      }));
    },
  };
}
