import { useMemo, useState } from 'react';
import { Settings as SettingsIcon, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store';

// /grafana — embeds the configured Grafana instance in an iframe.
// Settings → grafana.url + grafana.dashboardUid drive the embed URL. The
// docker-compose.observability.yml stack provisions a "DevDock Overview"
// dashboard at uid=devdock-overview; pointing at a different Grafana just
// needs a URL change in Settings.
//
// Grafana must allow embedding from this origin — the local docker stack
// sets GF_SECURITY_ALLOW_EMBEDDING=true so that works out of the box.
// For self-hosted Grafana, the user's grafana.ini needs the same flag.

export const GrafanaPage = () => {
  const grafana = useSettingsStore((s) => s.settings.grafana);
  // `key` forces an iframe remount on Refresh so the user can reload without
  // touching the browser refresh button (which would also reload the SPA).
  const [reloadKey, setReloadKey] = useState(0);

  const embedUrl = useMemo(() => {
    if (!grafana?.url) return '';
    const base = grafana.url.replace(/\/$/, '');
    if (grafana.dashboardUid) {
      // `kiosk=tv` hides Grafana's chrome (top nav + sidebar) so the iframe
      // looks integrated rather than a window-in-a-window. `theme=dark`
      // matches DevDock's default theme.
      return `${base}/d/${grafana.dashboardUid}?kiosk=tv&theme=dark`;
    }
    return `${base}/?kiosk=tv&theme=dark`;
  }, [grafana?.url, grafana?.dashboardUid]);

  if (!grafana?.url) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
        <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Grafana isn't configured yet
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Set the Grafana URL in Settings to embed your dashboard here.
          </div>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
          style={{
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
          }}
        >
          <SettingsIcon size={12} /> Open Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — open in new tab + reload, plus a hint about the data source. */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
      >
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Grafana
        </span>
        <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-faint)' }} title={embedUrl}>
          {grafana.url}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload dashboard"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
          >
            <RefreshCw size={11} />
            Reload
          </button>
          <a
            href={embedUrl.replace(/[?&]kiosk=tv/, '')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
          >
            <ExternalLink size={11} />
            Open in new tab
          </a>
        </div>
      </div>

      <iframe
        key={reloadKey}
        src={embedUrl}
        title="Grafana"
        className="flex-1 w-full"
        style={{ border: 'none', background: 'var(--bg-primary)' }}
      />
    </div>
  );
};
