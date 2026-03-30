import type { SearchSource, SearchDocument } from '../types';
import type { ActivityEvent } from '../../../types';

interface ActivityStoreState {
  events: ActivityEvent[];
}

export function createActivitySource(getState: () => ActivityStoreState): SearchSource {
  return {
    category: 'activity',
    label: 'Activity',
    icon: 'Zap',
    getDocuments(): SearchDocument[] {
      return getState().events.map((event) => ({
        id: `activity:${event.id}`,
        category: 'activity',
        title: `${event.action} ${event.target}`,
        description: `${event.user} — ${event.targetType}`,
        url: '/',
        icon: 'Zap',
        extra: `${event.user} ${event.action} ${event.target} ${event.targetType}`,
        meta: {
          user: event.user,
          type: event.targetType,
        },
      }));
    },
  };
}
