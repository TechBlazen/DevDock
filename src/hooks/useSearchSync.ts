import { useEffect } from 'react';
import { useSearchStore, useRepoStore, useMCPStore, useDocsStore, usePluginStore, useTelemetryStore, useActivityStore, useForumStore } from '../store';

export function useSearchSync() {
  const reindex = useSearchStore((s) => s.reindex);

  const githubRepos = useRepoStore((s) => s.githubRepos);
  const adoRepos = useRepoStore((s) => s.adoRepos);
  const servers = useMCPStore((s) => s.servers);
  const docs = useDocsStore((s) => s.docs);
  const plugins = usePluginStore((s) => s.plugins);
  const spans = useTelemetryStore((s) => s.spans);
  const events = useActivityStore((s) => s.events);

  useEffect(() => { reindex('repository'); }, [githubRepos, adoRepos, reindex]);
  useEffect(() => { reindex('mcp-server'); }, [servers, reindex]);
  useEffect(() => { reindex('doc'); }, [docs, reindex]);
  useEffect(() => { reindex('plugin'); }, [plugins, reindex]);
  useEffect(() => { reindex('telemetry'); }, [spans, reindex]);
  useEffect(() => { reindex('activity'); }, [events, reindex]);

  const threads = useForumStore((s) => s.threads);
  useEffect(() => { reindex('forum'); }, [threads, reindex]);
}
