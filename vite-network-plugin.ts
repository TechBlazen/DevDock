import type { Plugin } from 'vite';
import { exec } from 'child_process';
import os from 'os';
import dns from 'dns';

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  interface: string;
}

function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const results: { ip: string; subnet: string; iface: string }[] = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        results.push({ ip: addr.address, subnet: addr.cidr ?? `${addr.address}/24`, iface: name });
      }
    }
  }
  return results;
}

function parseArpTable(): Promise<NetworkDevice[]> {
  return new Promise((resolve) => {
    exec('arp -a', (err, stdout) => {
      if (err) { resolve([]); return; }
      const devices: NetworkDevice[] = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        // macOS format: hostname (ip) at mac on iface [...]
        const match = line.match(/^(\S+)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+(\S+)\s+on\s+(\S+)/);
        if (match) {
          const [, hostname, ip, mac, iface] = match;
          if (mac === '(incomplete)' || mac === 'ff:ff:ff:ff:ff:ff') continue;
          devices.push({
            ip,
            mac,
            hostname: hostname === '?' ? '' : hostname,
            vendor: guessVendor(mac),
            interface: iface,
          });
        }
        // Linux format: hostname (ip) at mac [ether] on iface
        const linuxMatch = line.match(/(\S+)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+(\S+)\s+\[ether\]\s+on\s+(\S+)/);
        if (linuxMatch) {
          const [, hostname, ip, mac, iface] = linuxMatch;
          if (mac === '(incomplete)') continue;
          devices.push({
            ip,
            mac,
            hostname: hostname === '?' ? '' : hostname,
            vendor: guessVendor(mac),
            interface: iface,
          });
        }
      }
      resolve(devices);
    });
  });
}

// Reverse DNS lookup for hostnames
async function resolveHostnames(devices: NetworkDevice[]): Promise<void> {
  const lookups = devices.map(async (device) => {
    if (device.hostname || device.mac === 'local') return;
    try {
      const hostnames = await dns.promises.reverse(device.ip);
      if (hostnames.length > 0) {
        device.hostname = hostnames[0].replace(/\.$/, '');
      }
    } catch {
      // Also try mDNS/Bonjour via dns-sd or host command
      try {
        const result = await new Promise<string>((resolve, reject) => {
          exec(`host ${device.ip}`, { timeout: 2000 }, (err, stdout) => {
            if (err) return reject(err);
            const match = stdout.match(/pointer\s+(.+)\.$/);
            resolve(match ? match[1] : '');
          });
        });
        if (result) device.hostname = result;
      } catch {
        // no hostname found
      }
    }
  });
  await Promise.all(lookups);
}

// Simple MAC prefix -> vendor lookup
function guessVendor(mac: string): string {
  const prefix = mac.substring(0, 8).toLowerCase();
  const vendors: Record<string, string> = {
    '00:50:56': 'VMware', '00:0c:29': 'VMware', '00:1c:42': 'Parallels',
    'ac:de:48': 'Apple', '3c:22:fb': 'Apple', 'a4:83:e7': 'Apple', 'f0:18:98': 'Apple',
    '00:1a:2b': 'Apple', '14:7d:da': 'Apple', '88:66:5a': 'Apple', 'bc:d0:74': 'Apple',
    'd0:03:4b': 'Apple', '8c:85:90': 'Apple', 'a8:51:5b': 'Apple',
    'b8:27:eb': 'Raspberry Pi', 'dc:a6:32': 'Raspberry Pi', 'e4:5f:01': 'Raspberry Pi',
    '00:e0:4c': 'Realtek', '50:6a:03': 'Netgear', '44:94:fc': 'Ubiquiti',
    '00:17:88': 'Philips Hue', '00:1e:c2': 'Cisco', '00:26:f2': 'Netgear',
    'b0:be:76': 'TP-Link', '30:b5:c2': 'TP-Link', '54:af:97': 'TP-Link',
    '18:d6:c7': 'TP-Link', 'ec:08:6b': 'TP-Link',
    '00:11:32': 'Synology', '00:14:d1': 'TrendNet',
    '68:ff:7b': 'Google', 'f4:f5:d8': 'Google', '54:60:09': 'Google',
    '30:fd:38': 'Google', 'a4:77:33': 'Google',
    'fc:65:de': 'Amazon', '44:65:0d': 'Amazon', 'a0:02:dc': 'Amazon',
    '74:c6:3b': 'Amazon', '38:f7:3d': 'Amazon',
    '28:6c:07': 'Xiaomi', '64:cc:2e': 'Xiaomi',
    '70:b3:d5': 'Intel', '00:1b:21': 'Intel',
    '00:15:5d': 'Hyper-V', '08:00:27': 'VirtualBox',
  };
  return vendors[prefix] ?? '';
}

export function networkPlugin(): Plugin {
  return {
    name: 'forge-network',
    configureServer(server) {
      // API endpoint for network scan
      server.middlewares.use('/api/network/scan', async (_req, res) => {
        try {
          const localInfo = getLocalNetworkInfo();
          const devices = await parseArpTable();

          // Add local machine
          const hostname = os.hostname();
          for (const local of localInfo) {
            devices.unshift({
              ip: local.ip,
              mac: 'local',
              hostname,
              vendor: 'This Machine',
              interface: local.iface,
            });
          }

          // Resolve hostnames via reverse DNS
          await resolveHostnames(devices);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            localInfo,
            devices,
            scannedAt: new Date().toISOString(),
            hostname,
            platform: os.platform(),
            arch: os.arch(),
          }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // Ping sweep to populate ARP table (optional, makes scan more complete)
      server.middlewares.use('/api/network/ping-sweep', async (_req, res) => {
        try {
          const localInfo = getLocalNetworkInfo();
          if (localInfo.length === 0) {
            res.end(JSON.stringify({ status: 'no_interface' }));
            return;
          }
          const baseIp = localInfo[0].ip.split('.').slice(0, 3).join('.');

          // Ping sweep in background (fast, parallel)
          const promises: Promise<void>[] = [];
          for (let i = 1; i <= 254; i++) {
            promises.push(new Promise((resolve) => {
              exec(`ping -c 1 -W 1 ${baseIp}.${i}`, () => resolve());
            }));
          }
          // Run in batches of 50
          for (let i = 0; i < promises.length; i += 50) {
            await Promise.all(promises.slice(i, i + 50));
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'complete', subnet: `${baseIp}.0/24` }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}
