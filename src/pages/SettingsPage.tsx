import { useState } from 'react';
import { Key, Activity, GitFork, GitBranch, Code2, Save, Check, Lock, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '../store';
import { initOTel } from '../otel';
import { SectionTitle, Input, Toggle, Button, Card, CardHeader } from '../components/ui';
import type { AIProvider } from '../types';

const providers: { id: AIProvider; label: string; color: string; placeholder: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)',  color: '#cc785c', placeholder: 'sk-ant-api03-...' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',     color: '#10a37f', placeholder: 'sk-proj-...' },
  { id: 'gemini',    label: 'Google Gemini',       color: '#4285f4', placeholder: 'AIza...' },
  { id: 'local',     label: 'Local (Ollama)',      color: '#b388ff', placeholder: 'no key needed' },
];

export const SettingsPage = () => {
  const {
    settings,
    updateApiKey,
    updateOTelConfig,
    updateGitHubConfig,
    updateADOConfig,
  } = useSettingsStore();

  const [saved, setSaved] = useState(false);
  const [otelApplied, setOtelApplied] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleApplyOTel = () => {
    initOTel({
      endpoint: settings.otel.endpoint,
      exportTraces: settings.otel.exportTraces,
      exportMetrics: settings.otel.exportMetrics,
    });
    setOtelApplied(true);
    setTimeout(() => setOtelApplied(false), 2500);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionTitle sub="Configure AI providers, OpenTelemetry, and version control integrations">
        Settings
      </SectionTitle>

      {/* ── AI Provider Keys ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <Key size={14} className="text-[#2a6fff]" />
          <span className="text-xs font-bold font-mono text-[#5a6a8a] uppercase tracking-wider">AI Provider API Keys</span>
        </CardHeader>
        <div className="p-5 space-y-4">
          {providers.map(({ id, label, color, placeholder }) => (
            <div key={id}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-mono font-semibold" style={{ color }}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-[#2a3a5a] flex-shrink-0" />
                <input
                  type="password"
                  value={settings.ai.apiKeys[id]}
                  onChange={(e) => updateApiKey(id, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-[#060c18] border border-[#1c2840] rounded-lg px-3 py-2 text-[#c8d8ff] text-xs font-mono outline-none focus:border-[#2a6fff66] transition-colors placeholder:text-[#2a3a5a]"
                />
              </div>
            </div>
          ))}

          {/* Local endpoint */}
          <div>
            <Input
              label="Local Ollama Endpoint"
              value={settings.ai.localEndpoint}
              onChange={(e) => updateApiKey('local', e.target.value)}
              placeholder="http://localhost:11434/v1"
            />
          </div>

          <div className="flex items-start gap-2 bg-[#2a6fff08] border border-[#2a6fff1a] rounded-xl p-3">
            <Lock size={12} className="text-[#2a6fff] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#4a5a7a] leading-snug">
              Keys are stored in <code className="text-[#2a6fff] bg-[#2a6fff12] px-1 rounded font-mono">localStorage</code> only.
              They are sent <strong className="text-[#c8d8ff]">directly to the provider</strong> — never to any third-party server.
            </p>
          </div>
        </div>
      </Card>

      {/* ── OpenTelemetry ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <Activity size={14} className="text-[#00e5a0]" />
          <span className="text-xs font-bold font-mono text-[#5a6a8a] uppercase tracking-wider">OpenTelemetry</span>
        </CardHeader>
        <div className="p-5 space-y-4">
          <Input
            label="OTLP Collector Endpoint"
            value={settings.otel.endpoint}
            onChange={(e) => updateOTelConfig({ endpoint: e.target.value })}
            placeholder="http://localhost:4317"
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#060c18] border border-[#1c2840] rounded-xl p-3">
              <Toggle
                checked={settings.otel.exportTraces}
                onChange={(v) => updateOTelConfig({ exportTraces: v })}
                label="Traces"
                color="#2a6fff"
              />
            </div>
            <div className="bg-[#060c18] border border-[#1c2840] rounded-xl p-3">
              <Toggle
                checked={settings.otel.exportMetrics}
                onChange={(v) => updateOTelConfig({ exportMetrics: v })}
                label="Metrics"
                color="#00e5a0"
              />
            </div>
            <div className="bg-[#060c18] border border-[#1c2840] rounded-xl p-3">
              <Toggle
                checked={settings.otel.exportLogs}
                onChange={(v) => updateOTelConfig({ exportLogs: v })}
                label="Logs"
                color="#f5a623"
              />
            </div>
          </div>

          <Button
            variant="success"
            onClick={handleApplyOTel}
          >
            {otelApplied ? <><Check size={13} /> Applied!</> : <><Activity size={13} /> Apply OTel Config</>}
          </Button>
        </div>
      </Card>

      {/* ── GitHub ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <GitFork size={14} className="text-[#8090b0]" />
          <span className="text-xs font-bold font-mono text-[#5a6a8a] uppercase tracking-wider">GitHub Integration</span>
        </CardHeader>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-[#2a3a5a] flex-shrink-0" />
            <input
              type="password"
              value={settings.github.accessToken}
              onChange={(e) => updateGitHubConfig({ accessToken: e.target.value })}
              placeholder="ghp_..."
              className="flex-1 bg-[#060c18] border border-[#1c2840] rounded-lg px-3 py-2 text-[#c8d8ff] text-xs font-mono outline-none focus:border-[#2a6fff66] transition-colors placeholder:text-[#2a3a5a]"
            />
          </div>
          <Input
            label="Organizations (comma-separated)"
            value={settings.github.orgs.join(', ')}
            onChange={(e) => updateGitHubConfig({ orgs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="my-org, another-org"
          />
          <Toggle
            checked={settings.github.includePersonal}
            onChange={(v) => updateGitHubConfig({ includePersonal: v })}
            label="Include personal repositories"
            color="#2a6fff"
          />
        </div>
      </Card>

      {/* ── Azure DevOps ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <GitBranch size={14} className="text-[#0078d4]" />
          <span className="text-xs font-bold font-mono text-[#5a6a8a] uppercase tracking-wider">Azure DevOps Integration</span>
        </CardHeader>
        <div className="p-5 space-y-4">
          <Input
            label="Organization"
            value={settings.ado.organization}
            onChange={(e) => updateADOConfig({ organization: e.target.value })}
            placeholder="my-organization"
          />
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-[#2a3a5a] flex-shrink-0" />
            <input
              type="password"
              value={settings.ado.personalAccessToken}
              onChange={(e) => updateADOConfig({ personalAccessToken: e.target.value })}
              placeholder="Personal Access Token..."
              className="flex-1 bg-[#060c18] border border-[#1c2840] rounded-lg px-3 py-2 text-[#c8d8ff] text-xs font-mono outline-none focus:border-[#2a6fff66] transition-colors placeholder:text-[#2a3a5a]"
            />
          </div>
          <Input
            label="Projects (comma-separated)"
            value={settings.ado.projects.join(', ')}
            onChange={(e) => updateADOConfig({ projects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="Platform, DevOps, Overwatch"
          />
        </div>
      </Card>

      {/* ── VS Code Extension ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <Code2 size={14} className="text-[#007acc]" />
          <span className="text-xs font-bold font-mono text-[#5a6a8a] uppercase tracking-wider">VS Code Extension</span>
        </CardHeader>
        <div className="p-5 space-y-3">
          <p className="text-xs text-[#4a5a7a] leading-relaxed">
            Install the <strong className="text-[#c8d8ff]">DevDock VS Code Extension</strong> to open
            repos directly from the browser into your local IDE, and get AI-assisted code review
            powered by DevDock AI and your configured MCP servers.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open('vscode:extension/devdock.devdock-vscode', '_blank')}>
              <Code2 size={12} /> Install from VS Code Marketplace
            </Button>
          </div>
          <div className="flex items-start gap-2 bg-[#f5a62308] border border-[#f5a62322] rounded-xl p-3">
            <AlertTriangle size={12} className="text-[#f5a623] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#4a5a7a]">
              Extension is in preview. Install manually via{' '}
              <code className="text-[#f5a623] bg-[#f5a62312] px-1 rounded font-mono">VSIX</code> until
              marketplace listing is live.
            </p>
          </div>
        </div>
      </Card>

      {/* Save */}
      <Button variant="primary" size="lg" onClick={handleSave}>
        {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Settings</>}
      </Button>
    </div>
  );
};
