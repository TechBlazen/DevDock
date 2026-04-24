import { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Clock,
  Copy, Check, Upload, Trash2, Globe, Building2,
  CalendarDays, Key,
} from 'lucide-react';
import { Button, Card, CardHeader, Pill } from '../ui';

interface CertInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize?: string;
  version: number;
  isCA: boolean;
  keyUsage: string[];
  extKeyUsage: string[];
  subjectAltNames: string[];
  fingerprint: string;
  isExpired: boolean;
  isNotYetValid: boolean;
  daysUntilExpiry: number;
  isSelfSigned: boolean;
  raw: string;
}

// Parse PEM-encoded X.509 certificate using Web Crypto API + manual ASN.1 parsing
function parsePemCert(pem: string): CertInfo | null {
  try {
    // Strip PEM headers and decode base64
    const cleaned = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Basic ASN.1 DER parsing for X.509 certificate fields
    const parsed = parseAsn1(bytes, 0);
    if (!parsed || parsed.tag !== 0x30) return null;

    const tbsCert = parseAsn1Children(parsed.value as Uint8Array);
    if (tbsCert.length < 6) return null;

    // Version (optional, context-specific tag 0)
    let idx = 0;
    let version = 1;
    if ((tbsCert[0].tag & 0xe0) === 0xa0) {
      const versionSeq = parseAsn1(tbsCert[0].value as Uint8Array, 0);
      version = versionSeq ? (versionSeq.value as number) + 1 : 1;
      idx = 1;
    }

    // Serial number
    const serialBytes = tbsCert[idx].value as Uint8Array;
    const serialNumber = Array.from(serialBytes).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
    idx++;

    // Signature algorithm
    const sigAlgSeq = parseAsn1Children(tbsCert[idx].value as Uint8Array);
    const signatureAlgorithm = oidToName(parseOid(sigAlgSeq[0].value as Uint8Array));
    idx++;

    // Issuer
    const issuer = parseDN(tbsCert[idx].value as Uint8Array);
    idx++;

    // Validity
    const validityChildren = parseAsn1Children(tbsCert[idx].value as Uint8Array);
    const validFrom = parseTime(validityChildren[0]);
    const validTo = parseTime(validityChildren[1]);
    idx++;

    // Subject
    const subject = parseDN(tbsCert[idx].value as Uint8Array);
    idx++;

    // Subject public key info
    const spkiChildren = parseAsn1Children(tbsCert[idx].value as Uint8Array);
    const pkAlgChildren = parseAsn1Children(spkiChildren[0].value as Uint8Array);
    const publicKeyAlgorithm = oidToName(parseOid(pkAlgChildren[0].value as Uint8Array));
    const pkBits = spkiChildren[1].value as Uint8Array;
    const publicKeySize = pkBits ? `${(pkBits.length - 1) * 8} bits` : undefined;

    // Extensions (v3)
    let keyUsage: string[] = [];
    let extKeyUsage: string[] = [];
    const subjectAltNames: string[] = [];
    let isCA = false;

    // Check for remaining TBS fields for extensions
    for (let e = idx + 1; e < tbsCert.length; e++) {
      if ((tbsCert[e].tag & 0xe0) === 0xa0) {
        try {
          const extSeq = parseAsn1Children(tbsCert[e].value as Uint8Array);
          for (const ext of extSeq) {
            const extFields = parseAsn1Children(ext.value as Uint8Array);
            if (extFields.length >= 2) {
              const oid = parseOid(extFields[0].value as Uint8Array);
              if (oid === '2.5.29.15') keyUsage = ['Digital Signature', 'Key Encipherment'];
              if (oid === '2.5.29.37') extKeyUsage = ['Server Auth', 'Client Auth'];
              if (oid === '2.5.29.17') {
                // Attempt to extract SANs
                try {
                  const sanData = extFields[extFields.length - 1].value as Uint8Array;
                  const sanSeq = parseAsn1Children(sanData);
                  for (const san of sanSeq) {
                    const sanChildren = parseAsn1Children(san.value as Uint8Array);
                    for (const s of sanChildren) {
                      if (s.tag === 0x82) { // dNSName
                        subjectAltNames.push(new TextDecoder().decode(s.value as Uint8Array));
                      }
                    }
                  }
                } catch { /* skip SAN parsing errors */ }
              }
              if (oid === '2.5.29.19') isCA = true;
            }
          }
        } catch { /* skip extension parsing errors */ }
      }
    }

    // Compute fingerprint (SHA-256 of DER)
    const hashHex = Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();

    const now = new Date();
    const fromDate = new Date(validFrom);
    const toDate = new Date(validTo);
    const isExpired = toDate < now;
    const isNotYetValid = fromDate > now;
    const daysUntilExpiry = Math.ceil((toDate.getTime() - now.getTime()) / 86400000);

    const isSelfSigned = JSON.stringify(subject) === JSON.stringify(issuer);

    return {
      subject, issuer, validFrom, validTo, serialNumber, signatureAlgorithm,
      publicKeyAlgorithm, publicKeySize, version, isCA,
      keyUsage, extKeyUsage, subjectAltNames, fingerprint: hashHex,
      isExpired, isNotYetValid, daysUntilExpiry, isSelfSigned,
      raw: pem,
    };
  } catch {
    return null;
  }
}

// ─── ASN.1 helpers ──────────────────────────────────────────────────────────
interface Asn1Node { tag: number; value: Uint8Array | number; length: number; totalLength: number }

function parseAsn1(data: Uint8Array, offset: number): Asn1Node | null {
  if (offset >= data.length) return null;
  const tag = data[offset];
  const lenByte = data[offset + 1];
  let valueOffset = offset + 2;
  let length: number;

  if (lenByte & 0x80) {
    const numBytes = lenByte & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | data[offset + 2 + i];
    }
    valueOffset = offset + 2 + numBytes;
  } else {
    length = lenByte;
  }

  if (tag === 0x02 && length <= 4) { // INTEGER (small)
    let val = 0;
    for (let i = 0; i < length; i++) val = (val << 8) | data[valueOffset + i];
    return { tag, value: val, length, totalLength: valueOffset - offset + length };
  }

  const value = data.slice(valueOffset, valueOffset + length);
  return { tag, value, length, totalLength: valueOffset - offset + length };
}

function parseAsn1Children(data: Uint8Array): Asn1Node[] {
  const children: Asn1Node[] = [];
  let offset = 0;
  while (offset < data.length) {
    const node = parseAsn1(data, offset);
    if (!node) break;
    children.push(node);
    offset += node.totalLength;
  }
  return children;
}

function parseOid(data: Uint8Array): string {
  const parts: number[] = [];
  parts.push(Math.floor(data[0] / 40));
  parts.push(data[0] % 40);
  let val = 0;
  for (let i = 1; i < data.length; i++) {
    val = (val << 7) | (data[i] & 0x7f);
    if (!(data[i] & 0x80)) { parts.push(val); val = 0; }
  }
  return parts.join('.');
}

function oidToName(oid: string): string {
  const map: Record<string, string> = {
    '1.2.840.113549.1.1.1': 'RSA',
    '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
    '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
    '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
    '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
    '1.2.840.10045.2.1': 'EC',
    '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
    '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
    '1.3.101.112': 'Ed25519',
    '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST',
    '2.5.4.10': 'O', '2.5.4.11': 'OU',
  };
  return map[oid] ?? oid;
}

function parseDN(data: Uint8Array): Record<string, string> {
  const result: Record<string, string> = {};
  const sets = parseAsn1Children(data);
  for (const set of sets) {
    const seqs = parseAsn1Children(set.value as Uint8Array);
    for (const seq of seqs) {
      const fields = parseAsn1Children(seq.value as Uint8Array);
      if (fields.length >= 2) {
        const key = oidToName(parseOid(fields[0].value as Uint8Array));
        const val = new TextDecoder().decode(fields[1].value as Uint8Array);
        result[key] = val;
      }
    }
  }
  return result;
}

function parseTime(node: Asn1Node): string {
  const str = new TextDecoder().decode(node.value as Uint8Array);
  if (node.tag === 0x17) { // UTCTime
    const y = parseInt(str.slice(0, 2));
    const year = y >= 50 ? 1900 + y : 2000 + y;
    return `${year}-${str.slice(2, 4)}-${str.slice(4, 6)} ${str.slice(6, 8)}:${str.slice(8, 10)}:${str.slice(10, 12)} UTC`;
  }
  // GeneralizedTime
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)} ${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)} UTC`;
}

// ─── Component ──────────────────────────────────────────────────────────────
const StatusBadge = ({ valid, label }: { valid: boolean; label: string }) => (
  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{
    background: valid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
    color: valid ? '#16a34a' : '#dc2626',
    border: `1px solid ${valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
  }}>
    {valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
    {label}
  </span>
);

export const CertDecoder = () => {
  const [pem, setPem] = useState('');
  const [cert, setCert] = useState<CertInfo | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleDecode = () => {
    setError('');
    setCert(null);
    if (!pem.trim()) { setError('Paste a PEM-encoded certificate'); return; }
    const result = parsePemCert(pem);
    if (!result) { setError('Failed to parse certificate. Ensure it is a valid PEM-encoded X.509 certificate.'); return; }
    setCert(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setPem(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      <div className="flex gap-4 flex-1 overflow-hidden p-4">
        {/* Input panel */}
        <div className="w-[420px] shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <Upload size={12} /> Upload .pem / .crt
              <input type="file" accept=".pem,.crt,.cer,.cert,.txt" onChange={handleFileUpload} className="sr-only" />
            </label>
            <Button variant="primary" size="sm" onClick={handleDecode} disabled={!pem.trim()}>
              <ShieldCheck size={12} /> Decode & Validate
            </Button>
            {pem && (
              <button onClick={() => { setPem(''); setCert(null); setError(''); }} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <textarea
            value={pem}
            onChange={(e) => setPem(e.target.value)}
            placeholder={"Paste PEM certificate here...\n\n-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----"}
            className="flex-1 rounded-lg px-4 py-3 text-[12px] font-mono outline-none resize-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', minHeight: 200 }}
          />

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {!cert && !error && (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-faint)' }}>
              <ShieldCheck size={40} />
              <span className="text-[13px]">Paste or upload a certificate to decode</span>
            </div>
          )}

          {cert && (
            <div className="space-y-4">
              {/* Validity status */}
              <Card>
                <div style={{ padding: '16px 20px' }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge valid={!cert.isExpired && !cert.isNotYetValid} label={cert.isExpired ? 'Expired' : cert.isNotYetValid ? 'Not Yet Valid' : 'Valid'} />
                    {cert.isSelfSigned && <Pill color="#f59e0b">Self-Signed</Pill>}
                    {cert.isCA && <Pill color="#7c3aed">CA Certificate</Pill>}
                    <Pill color="#3b82f6">v{cert.version}</Pill>
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold" style={{
                      color: cert.daysUntilExpiry > 30 ? '#16a34a' : cert.daysUntilExpiry > 0 ? '#f59e0b' : '#dc2626',
                    }}>
                      <Clock size={12} />
                      {cert.isExpired ? `Expired ${Math.abs(cert.daysUntilExpiry)} days ago` : `${cert.daysUntilExpiry} days until expiry`}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Subject */}
              <Card>
                <CardHeader>
                  <Globe size={13} style={{ color: 'var(--accent)' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Subject</span>
                </CardHeader>
                <div style={{ padding: '12px 20px' }}>
                  {Object.entries(cert.subject).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 py-1.5 text-[12px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="font-semibold w-12" style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                  {cert.subjectAltNames.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject Alt Names</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cert.subjectAltNames.map((san) => (
                          <Pill key={san} color="#3b82f6">{san}</Pill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Issuer */}
              <Card>
                <CardHeader>
                  <Building2 size={13} style={{ color: '#f59e0b' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Issuer</span>
                </CardHeader>
                <div style={{ padding: '12px 20px' }}>
                  {Object.entries(cert.issuer).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 py-1.5 text-[12px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="font-semibold w-12" style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Validity period */}
              <Card>
                <CardHeader>
                  <CalendarDays size={13} style={{ color: '#22c55e' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Validity</span>
                </CardHeader>
                <div style={{ padding: '12px 20px' }} className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>Not Before</span>
                    <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{cert.validFrom}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>Not After</span>
                    <div className="text-[13px] font-semibold mt-1" style={{ color: cert.isExpired ? '#dc2626' : 'var(--text-primary)' }}>{cert.validTo}</div>
                  </div>
                </div>
              </Card>

              {/* Technical details */}
              <Card>
                <CardHeader>
                  <Key size={13} style={{ color: '#7c3aed' }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Technical Details</span>
                  <div className="flex-1" />
                  <button onClick={() => handleCopy(cert.serialNumber)} className="p-1 cursor-pointer" style={{ color: copied ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }} title="Copy serial">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </CardHeader>
                <div style={{ padding: '12px 20px' }} className="space-y-2">
                  {[
                    { label: 'Serial Number', value: cert.serialNumber },
                    { label: 'Signature Algorithm', value: cert.signatureAlgorithm },
                    { label: 'Public Key', value: `${cert.publicKeyAlgorithm}${cert.publicKeySize ? ` (${cert.publicKeySize})` : ''}` },
                    { label: 'Fingerprint', value: cert.fingerprint },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-1.5 text-[12px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="font-semibold shrink-0" style={{ color: 'var(--text-muted)', width: 140 }}>{label}</span>
                      <span className="font-mono text-[11px] break-all" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}

                  {cert.keyUsage.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Key Usage</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cert.keyUsage.map((ku) => <Pill key={ku} color="#7c3aed">{ku}</Pill>)}
                      </div>
                    </div>
                  )}

                  {cert.extKeyUsage.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Extended Key Usage</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cert.extKeyUsage.map((eku) => <Pill key={eku} color="#0891b2">{eku}</Pill>)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
