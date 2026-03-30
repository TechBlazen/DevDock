import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Upload, Table, ArrowUp, ArrowDown, Download,
  FileSpreadsheet, Trash2,
} from 'lucide-react';
import { Button } from '../ui';

type Delimiter = ',' | '\t' | ';' | '|' | 'auto';

const DELIMITER_OPTIONS: { value: Delimiter; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: ',', label: 'Comma' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon' },
  { value: '|', label: 'Pipe' },
];

const SAMPLE_CSV = `Name,Age,City,Role,Active
Alice Johnson,32,San Francisco,Engineer,true
Bob Smith,28,New York,Designer,true
Carol Williams,45,Chicago,Manager,false
Dave Brown,36,"Los Angeles, CA",DevOps,true
Eve Davis,29,Seattle,"Senior Engineer",true`;

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  const counts: Record<string, number> = { ',': 0, '\t': 0, ';': 0, '|': 0 };
  // Count delimiters outside quotes
  let inQuote = false;
  for (const ch of firstLine) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (!inQuote && ch in counts) counts[ch]++;
  }
  let best = ',';
  let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) { bestCount = c; best = d; }
  }
  return best;
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
        i++;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        if (row.some((f) => f.trim() !== '')) rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  return rows;
}

export const CsvViewer = () => {
  const [rawInput, setRawInput] = useState(SAMPLE_CSV);
  const [delimiterChoice, setDelimiterChoice] = useState<Delimiter>('auto');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const delimiter = useMemo(() => {
    if (delimiterChoice === 'auto') return detectDelimiter(rawInput);
    return delimiterChoice;
  }, [delimiterChoice, rawInput]);

  const parsed = useMemo(() => parseCsv(rawInput, delimiter), [rawInput, delimiter]);
  const headers = parsed[0] ?? [];
  const dataRows = parsed.slice(1);

  const sortedRows = useMemo(() => {
    if (sortCol === null) return dataRows;
    const col = sortCol;
    return [...dataRows].sort((a, b) => {
      const va = (a[col] ?? '').trim();
      const vb = (b[col] ?? '').trim();
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [dataRows, sortCol, sortDir]);

  const handleSort = useCallback((col: number) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }, [sortCol]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setRawInput(text);
        setSortCol(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const exportJson = useCallback(() => {
    if (headers.length === 0) return;
    const json = sortedRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [headers, sortedRows]);

  const hasData = parsed.length > 1;

  return (
    <div className="h-full flex flex-col" style={{ color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex flex-col gap-3 p-4"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Delimiter:
            <select
              className="rounded-md px-2 py-1.5 text-[13px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-primary)',
              }}
              value={delimiterChoice}
              onChange={(e) => setDelimiterChoice(e.target.value as Delimiter)}
            >
              {DELIMITER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={12} /> Upload File
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setRawInput(''); setSortCol(null); }}>
            <Trash2 size={12} /> Clear
          </Button>
          <div className="flex-1" />
          {hasData && (
            <>
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {dataRows.length} row{dataRows.length !== 1 ? 's' : ''} x {headers.length} column{headers.length !== 1 ? 's' : ''}
              </span>
              <Button variant="primary" size="sm" onClick={exportJson}>
                <Download size={12} /> Export JSON
              </Button>
            </>
          )}
        </div>

        {/* Textarea input */}
        <textarea
          className="rounded-md px-3 py-2 text-[13px] outline-none resize-none font-mono"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
            height: 100,
          }}
          placeholder="Paste CSV data here..."
          value={rawInput}
          onChange={(e) => { setRawInput(e.target.value); setSortCol(null); }}
        />
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto" style={{ background: 'var(--bg-inset)' }}>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-faint)' }}>
            <FileSpreadsheet size={32} />
            <span className="text-[13px]">No data loaded</span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Paste CSV text or upload a file to get started
            </span>
          </div>
        ) : (
          <div className="p-4">
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className="text-left px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap"
                        style={{
                          background: 'var(--bg-surface)',
                          borderBottom: '2px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                        }}
                        onClick={() => handleSort(i)}
                      >
                        <div className="flex items-center gap-1">
                          {h}
                          {sortCol === i ? (
                            sortDir === 'asc' ? <ArrowUp size={12} style={{ color: 'var(--accent)' }} /> : <ArrowDown size={12} style={{ color: 'var(--accent)' }} />
                          ) : (
                            <Table size={10} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, ri) => (
                    <tr
                      key={ri}
                      style={{
                        background: ri % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-inset)',
                      }}
                      className="transition-colors duration-100"
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = ri % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-inset)')}
                    >
                      {headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2"
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
