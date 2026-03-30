import { useState, useMemo } from 'react';
import { Container, Copy, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui';

type DockerOperation =
  | 'run' | 'build' | 'exec' | 'pull' | 'push'
  | 'compose-up' | 'compose-down' | 'images' | 'ps' | 'logs';

interface PortMapping { host: string; container: string }
interface VolumeMount { host: string; container: string }
interface EnvVar { key: string; value: string }

const ALL_OPERATIONS: DockerOperation[] = [
  'run', 'build', 'exec', 'pull', 'push',
  'compose-up', 'compose-down', 'images', 'ps', 'logs',
];

const RESTART_POLICIES = ['no', 'always', 'on-failure', 'unless-stopped'] as const;

export const DockerGenerator = () => {
  const [operation, setOperation] = useState<DockerOperation>('run');
  const [imageName, setImageName] = useState('nginx:latest');
  const [containerName, setContainerName] = useState('');
  const [ports, setPorts] = useState<PortMapping[]>([{ host: '8080', container: '80' }]);
  const [volumes, setVolumes] = useState<VolumeMount[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [network, setNetwork] = useState('');
  const [restartPolicy, setRestartPolicy] = useState<string>('no');
  const [detached, setDetached] = useState(true);
  const [interactive, setInteractive] = useState(false);
  const [removeOnExit, setRemoveOnExit] = useState(false);
  const [privileged, setPrivileged] = useState(false);
  const [buildContext, setBuildContext] = useState('.');
  const [dockerfile, setDockerfile] = useState('');
  const [tag, setTag] = useState('');
  const [execCommand, setExecCommand] = useState('/bin/sh');
  const [composeFile, setComposeFile] = useState('');
  const [tail, setTail] = useState('');
  const [follow, setFollow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOperationChange = (op: DockerOperation) => {
    setOperation(op);
  };

  // Dynamic row helpers
  const addPort = () => setPorts([...ports, { host: '', container: '' }]);
  const removePort = (i: number) => setPorts(ports.filter((_, idx) => idx !== i));
  const updatePort = (i: number, field: keyof PortMapping, v: string) =>
    setPorts(ports.map((p, idx) => (idx === i ? { ...p, [field]: v } : p)));

  const addVolume = () => setVolumes([...volumes, { host: '', container: '' }]);
  const removeVolume = (i: number) => setVolumes(volumes.filter((_, idx) => idx !== i));
  const updateVolume = (i: number, field: keyof VolumeMount, v: string) =>
    setVolumes(volumes.map((vol, idx) => (idx === i ? { ...vol, [field]: v } : vol)));

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (i: number) => setEnvVars(envVars.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: keyof EnvVar, v: string) =>
    setEnvVars(envVars.map((ev, idx) => (idx === i ? { ...ev, [field]: v } : ev)));

  const command = useMemo(() => {
    const parts: string[] = [];

    switch (operation) {
      case 'run': {
        parts.push('docker run');
        if (detached) parts.push('-d');
        if (interactive) parts.push('-it');
        if (removeOnExit) parts.push('--rm');
        if (privileged) parts.push('--privileged');
        if (containerName) parts.push(`--name ${containerName}`);
        if (network) parts.push(`--network ${network}`);
        if (restartPolicy !== 'no') parts.push(`--restart ${restartPolicy}`);
        for (const p of ports) {
          if (p.host && p.container) parts.push(`-p ${p.host}:${p.container}`);
        }
        for (const v of volumes) {
          if (v.host && v.container) parts.push(`-v ${v.host}:${v.container}`);
        }
        for (const e of envVars) {
          if (e.key) parts.push(`-e ${e.key}=${e.value}`);
        }
        if (imageName) parts.push(imageName);
        break;
      }
      case 'build': {
        parts.push('docker build');
        if (tag) parts.push(`-t ${tag}`);
        if (dockerfile) parts.push(`-f ${dockerfile}`);
        for (const e of envVars) {
          if (e.key) parts.push(`--build-arg ${e.key}=${e.value}`);
        }
        parts.push(buildContext);
        break;
      }
      case 'exec': {
        parts.push('docker exec');
        if (interactive) parts.push('-it');
        if (containerName) parts.push(containerName);
        if (execCommand) parts.push(execCommand);
        break;
      }
      case 'pull': {
        parts.push('docker pull');
        if (imageName) parts.push(imageName);
        break;
      }
      case 'push': {
        parts.push('docker push');
        if (imageName) parts.push(imageName);
        break;
      }
      case 'compose-up': {
        parts.push('docker compose');
        if (composeFile) parts.push(`-f ${composeFile}`);
        parts.push('up');
        if (detached) parts.push('-d');
        break;
      }
      case 'compose-down': {
        parts.push('docker compose');
        if (composeFile) parts.push(`-f ${composeFile}`);
        parts.push('down');
        if (removeOnExit) parts.push('-v');
        break;
      }
      case 'images': {
        parts.push('docker images');
        if (imageName && imageName !== 'nginx:latest') parts.push(imageName);
        break;
      }
      case 'ps': {
        parts.push('docker ps');
        if (detached) parts.push('-a');
        break;
      }
      case 'logs': {
        parts.push('docker logs');
        if (follow) parts.push('-f');
        if (tail) parts.push(`--tail ${tail}`);
        if (containerName) parts.push(containerName);
        break;
      }
    }

    return parts.join(' ');
  }, [
    operation, imageName, containerName, ports, volumes, envVars,
    network, restartPolicy, detached, interactive, removeOnExit,
    privileged, buildContext, dockerfile, tag, execCommand,
    composeFile, tail, follow,
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const showPorts = ['run'].includes(operation);
  const showVolumes = ['run'].includes(operation);
  const showEnvVars = ['run', 'build'].includes(operation);
  const showNetwork = ['run'].includes(operation);
  const showRestart = ['run'].includes(operation);

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.border = '1px solid var(--accent)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.border = '1px solid var(--border-input)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <Container size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Docker Command Generator
        </span>

        <div className="relative ml-2">
          <select
            value={operation}
            onChange={(e) => handleOperationChange(e.target.value as DockerOperation)}
            className="appearance-none rounded-md px-3 py-1.5 pr-7 text-[12px] font-mono font-semibold outline-none cursor-pointer"
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            {ALL_OPERATIONS.map((op) => (
              <option key={op} value={op}>
                docker {op.replace('-', ' ')}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Image / Container name row */}
        <div className="grid grid-cols-2 gap-3">
          {['run', 'pull', 'push', 'images'].includes(operation) && (
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Image Name
              </label>
              <input
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="nginx:latest"
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          )}
          {['run', 'exec', 'logs'].includes(operation) && (
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Container Name
              </label>
              <input
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                placeholder="my-container"
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          )}
        </div>

        {/* Build-specific fields */}
        {operation === 'build' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Tag (-t)
              </label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="myapp:latest"
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Dockerfile (-f)
              </label>
              <input
                value={dockerfile}
                onChange={(e) => setDockerfile(e.target.value)}
                placeholder="Dockerfile"
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Build Context
              </label>
              <input
                value={buildContext}
                onChange={(e) => setBuildContext(e.target.value)}
                placeholder="."
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>
        )}

        {/* Exec-specific */}
        {operation === 'exec' && (
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Command
            </label>
            <input
              value={execCommand}
              onChange={(e) => setExecCommand(e.target.value)}
              placeholder="/bin/sh"
              className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        )}

        {/* Compose-specific */}
        {(operation === 'compose-up' || operation === 'compose-down') && (
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Compose File (-f)
            </label>
            <input
              value={composeFile}
              onChange={(e) => setComposeFile(e.target.value)}
              placeholder="docker-compose.yml"
              className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        )}

        {/* Logs-specific */}
        {operation === 'logs' && (
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Tail (lines)
            </label>
            <input
              value={tail}
              onChange={(e) => setTail(e.target.value)}
              placeholder="100"
              className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        )}

        {/* Flags */}
        <div>
          <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Flags
          </label>
          <div className="flex flex-wrap gap-2">
            {['run', 'compose-up', 'ps'].includes(operation) && (
              <FlagButton label="Detached (-d)" active={detached} onToggle={() => setDetached(!detached)} />
            )}
            {['run', 'exec'].includes(operation) && (
              <FlagButton label="Interactive (-it)" active={interactive} onToggle={() => setInteractive(!interactive)} />
            )}
            {['run', 'compose-down'].includes(operation) && (
              <FlagButton label={operation === 'compose-down' ? 'Remove volumes (-v)' : 'Remove on exit (--rm)'} active={removeOnExit} onToggle={() => setRemoveOnExit(!removeOnExit)} />
            )}
            {operation === 'run' && (
              <FlagButton label="Privileged" active={privileged} onToggle={() => setPrivileged(!privileged)} />
            )}
            {operation === 'logs' && (
              <FlagButton label="Follow (-f)" active={follow} onToggle={() => setFollow(!follow)} />
            )}
          </div>
        </div>

        {/* Network & Restart */}
        {(showNetwork || showRestart) && (
          <div className="grid grid-cols-2 gap-3">
            {showNetwork && (
              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Network
                </label>
                <input
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  placeholder="bridge"
                  className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            )}
            {showRestart && (
              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Restart Policy
                </label>
                <select
                  value={restartPolicy}
                  onChange={(e) => setRestartPolicy(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none cursor-pointer"
                  style={inputStyle}
                  onFocus={handleFocus as React.FocusEventHandler<HTMLSelectElement>}
                  onBlur={handleBlur as React.FocusEventHandler<HTMLSelectElement>}
                >
                  {RESTART_POLICIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Port mappings */}
        {showPorts && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Port Mappings
              </label>
              <Button variant="ghost" size="sm" onClick={addPort}>
                <Plus size={12} /> Add Port
              </Button>
            </div>
            <div className="space-y-2">
              {ports.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={p.host}
                    onChange={(e) => updatePort(i, 'host', e.target.value)}
                    placeholder="Host port"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <span className="text-[12px] font-mono" style={{ color: 'var(--text-faint)' }}>:</span>
                  <input
                    value={p.container}
                    onChange={(e) => updatePort(i, 'container', e.target.value)}
                    placeholder="Container port"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    onClick={() => removePort(i)}
                    className="p-1 flex-shrink-0 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Volume mounts */}
        {showVolumes && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Volume Mounts
              </label>
              <Button variant="ghost" size="sm" onClick={addVolume}>
                <Plus size={12} /> Add Volume
              </Button>
            </div>
            <div className="space-y-2">
              {volumes.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={v.host}
                    onChange={(e) => updateVolume(i, 'host', e.target.value)}
                    placeholder="Host path"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <span className="text-[12px] font-mono" style={{ color: 'var(--text-faint)' }}>:</span>
                  <input
                    value={v.container}
                    onChange={(e) => updateVolume(i, 'container', e.target.value)}
                    placeholder="Container path"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    onClick={() => removeVolume(i)}
                    className="p-1 flex-shrink-0 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environment variables */}
        {showEnvVars && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {operation === 'build' ? 'Build Args' : 'Environment Variables'}
              </label>
              <Button variant="ghost" size="sm" onClick={addEnvVar}>
                <Plus size={12} /> Add {operation === 'build' ? 'Arg' : 'Var'}
              </Button>
            </div>
            <div className="space-y-2">
              {envVars.map((ev, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={ev.key}
                    onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                    placeholder="KEY"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <span className="text-[12px] font-mono" style={{ color: 'var(--text-faint)' }}>=</span>
                  <input
                    value={ev.value}
                    onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono outline-none"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    onClick={() => removeEnvVar(i)}
                    className="p-1 flex-shrink-0 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated command */}
      <div
        className="flex-shrink-0 p-4"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-faint)' }}
          >
            Generated Command
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div
          className="rounded-md p-3 font-mono text-[13px] overflow-x-auto whitespace-pre"
          style={{
            background: 'var(--code-bg)',
            color: 'var(--code-text)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {command}
        </div>
      </div>
    </div>
  );
};

// Small helper component for flag toggle buttons
function FlagButton({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-all"
      style={
        active
          ? {
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }
          : {
              background: 'var(--bg-surface)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-input)',
            }
      }
    >
      {label}
    </button>
  );
}
