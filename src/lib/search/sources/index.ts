import type { SearchSource } from '../types';
import { useRepoStore, useMCPStore, useDocsStore, usePluginStore, useTelemetryStore, useActivityStore, useForumStore } from '../../../store';
import { createRepoSource } from './repo-source';
import { createMCPSource } from './mcp-source';
import { createDocsSource } from './docs-source';
import { createPluginSource } from './plugin-source';
import { createScaffoldSource } from './scaffold-source';
import { createTelemetrySource } from './telemetry-source';
import { createActivitySource } from './activity-source';
import { createForumSource } from './forum-source';
import { createFederatedSource } from './federated-source';

export function createSearchSources(): SearchSource[] {
  return [
    createRepoSource(useRepoStore.getState),
    createMCPSource(useMCPStore.getState),
    createDocsSource(useDocsStore.getState),
    createPluginSource(usePluginStore.getState),
    createScaffoldSource(),
    createTelemetrySource(useTelemetryStore.getState),
    createActivitySource(useActivityStore.getState),
    createForumSource(useForumStore.getState),
    createFederatedSource(),
  ];
}
