import { useState, useEffect } from 'react';
import {
  RefreshCw, Monitor, Smartphone, Wifi, Server, HardDrive,
  Globe, Cpu, Search, Loader2,
} from 'lucide-react';
import { Card, Badge, Pill, Button, Spinner, EmptyState } from '../ui';

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  interface: string;
}

interface ScanResult {
  localInfo: { ip: string; subnet: string; iface: string }[];
  devices: NetworkDevice[];
  scannedAt: string;
  hostname: string;
  platform: string;
  arch: string;
}

function getDeviceIcon(device: NetworkDevice) {
  const v = device.vendor.toLowerCase();
  if (device.mac === 'local') return Server;
  if (v.includes('apple') || v.includes('iphone') || v.includes('ipad')) return Smartphone;
  if (v.includes('google') || v.includes('amazon') || v.includes('philips')) return Wifi;
  if (v.includes('vmware') || v.includes('virtualbox') || v.includes('hyper-v') || v.includes('parallels')) return HardDrive;
  if (v.includes('raspberry')) return Cpu;
  if (v.includes('synology')) return HardDrive;
  if (device.hostname) return Monitor;
  return Globe;
}

interface NetworkMapProps {
  compact?: boolean;
}

export const NetworkMap = ({ compact = false }: NetworkMapProps) => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const scan = async (withSweep = false) => {
    setError('');
    setScanning(true);

    try {
      if (withSweep) {
        setSweeping(true);
        await fetch('/api/network/ping-sweep');
        setSweeping(false);
        // Brief pause for ARP table to populate
        await new Promise((r) => setTimeout(r, 500));
      }

      const res = await fetch('/api/network/scan');
      if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
      const data = await res.json();
      setScanResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
      setSweeping(false);
    }
  };

  // Auto-scan on mount
  useEffect(() => { scan(); }, []);

  const devices = scanResult?.devices ?? [];
  const filtered = filter
    ? devices.filter((d) =>
        d.ip.includes(filter) ||
        d.hostname.toLowerCase().includes(filter.toLowerCase()) ||
        d.mac.includes(filter.toLowerCase()) ||
        d.vendor.toLowerCase().includes(filter.toLowerCase())
      )
    : devices;

  if (compact) {
    return (
      <div>
        {scanning ? (
          <div className="flex items-center justify-center py-8"><Spinner size={20} /></div>
        ) : devices.length === 0 ? (
          <EmptyState title="No devices found" body="Run a network scan to discover devices." />
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {devices.length} device{devices.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => scan()} className="p-1 transition-colors" style={{ color: 'var(--text-faint)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}>
                <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
              </button>
            </div>
            {devices.slice(0, 8).map((d) => {
              const Icon = getDeviceIcon(d);
              return (
                <div key={`${d.ip}-${d.mac}`} className="flex items-center gap-2 py-1.5 px-2 rounded-xl text-[11px]" style={{
                  background: d.mac === 'local' ? 'rgba(59,130,246,0.06)' : 'transparent',
                  border: d.mac === 'local' ? '1px solid rgba(59,130,246,0.15)' : '1px solid transparent',
                }}>
                  <Icon size={13} style={{ color: d.mac === 'local' ? '#3b82f6' : 'var(--text-faint)' }} />
                  <span className="font-mono flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {d.hostname || d.ip}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-faint)' }}>{d.ip}</span>
                </div>
              );
            })}
            {devices.length > 8 && (
              <div className="text-[10px] text-center pt-1" style={{ color: 'var(--text-faint)' }}>
                +{devices.length - 8} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 flex-1 max-w-xs" style={{
          background: 'var(--bg-inset)',
          border: '1px solid var(--border-subtle)',
        }}>
          <Search size={13} style={{ color: 'var(--text-faint)' }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by IP, hostname, MAC..."
            className="bg-transparent border-none outline-none text-xs flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => scan(false)} disabled={scanning}>
          {scanning && !sweeping ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Quick Scan
        </Button>
        <Button variant="primary" size="sm" onClick={() => scan(true)} disabled={scanning}>
          {sweeping ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
          Deep Scan
        </Button>
        {scanResult && (
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-faint)' }}>
            {devices.length} devices · {new Date(scanResult.scannedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded-xl" style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      {scanResult && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Host', value: scanResult.hostname, color: '#3b82f6' },
            { label: 'Platform', value: `${scanResult.platform}/${scanResult.arch}`, color: '#8b5cf6' },
            { label: 'Devices', value: devices.length, color: '#10b981' },
            { label: 'Interface', value: scanResult.localInfo[0]?.iface ?? '-', color: '#f59e0b' },
            { label: 'Subnet', value: scanResult.localInfo[0]?.subnet ?? '-', color: '#6366f1' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl px-4 py-2.5" style={{
              background: `${color}08`, border: `1px solid ${color}20`,
            }}>
              <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Device list */}
      {scanning && !scanResult ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner size={24} />
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              {sweeping ? 'Running ping sweep...' : 'Scanning network...'}
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No devices found" body={filter ? `No matches for "${filter}"` : 'Run a scan to discover devices.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((device) => {
            const Icon = getDeviceIcon(device);
            const isLocal = device.mac === 'local';
            return (
              <Card key={`${device.ip}-${device.mac}`} highlight={isLocal}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: isLocal ? 'rgba(59,130,246,0.1)' : 'var(--bg-inset)',
                    border: isLocal ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-subtle)',
                  }}>
                    <Icon size={18} style={{ color: isLocal ? '#3b82f6' : 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {device.hostname || device.ip}
                      </span>
                      {isLocal && <Pill color="#3b82f6">this machine</Pill>}
                      {device.vendor && <Pill color="#8b5cf6">{device.vendor}</Pill>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span>{device.ip}</span>
                      {device.mac !== 'local' && <span>{device.mac}</span>}
                      <span>{device.interface}</span>
                    </div>
                  </div>
                  <Badge variant={isLocal ? 'running' : 'ok'} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
