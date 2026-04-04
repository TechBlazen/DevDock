export type FederatedSourceType = 'rest-api' | 'mcp-tool' | 'opensearch';
export type FederatedAuthType = 'none' | 'api-key' | 'bearer' | 'basic';

export interface FederatedAuthConfig {
  headerName?: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface ResultMapping {
  resultsPath: string;
  titleField: string;
  descriptionField: string;
  urlField: string;
  contentField?: string;
  tagsField?: string;
  iconField?: string;
}

export interface TriggerConfig {
  mode: 'always' | 'prefix' | 'pattern';
  prefix?: string;
  pattern?: string;
}

export interface FederatedSource {
  id: string;
  name: string;
  type: FederatedSourceType;
  endpointUrl: string;
  authType: FederatedAuthType;
  authConfig: FederatedAuthConfig;
  resultMapping: ResultMapping;
  triggerConfig: TriggerConfig;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  documentCount: number;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FederatedDocument {
  id: string;
  sourceId: string;
  title: string;
  description: string;
  url: string;
  icon?: string;
  tags?: string;
  content?: string;
  extra?: string;
  meta?: Record<string, string>;
  fetchedAt: string;
}
