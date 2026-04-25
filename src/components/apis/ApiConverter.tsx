import { useState } from 'react';
import { ArrowRight, Copy, Download, FileJson, RefreshCw } from 'lucide-react';
import axios from 'axios';

type SpecFormat = 'openapi_3' | 'swagger_2';
type SpecSyntax = 'json' | 'yaml';

export const ApiConverter = () => {
  const [inputSpec, setInputSpec] = useState('');
  const [outputSpec, setOutputSpec] = useState('');
  const [fromFormat, setFromFormat] = useState<SpecFormat>('swagger_2');
  const [toFormat, setToFormat] = useState<SpecFormat>('openapi_3');
  const [syntax, setSyntax] = useState<SpecSyntax>('json');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectFormat, setDetectFormat] = useState<string | null>(null);

  const loadSample = async (sampleFile: string) => {
    try {
      const response = await fetch(`/data/samples/${sampleFile}`);
      if (!response.ok) throw new Error('Failed to load sample');
      const text = await response.text();
      setInputSpec(text);
      setError(null);
      
      // Auto-detect format
      const token = localStorage.getItem('devdock-api-token');
      const detection = await axios.post('/api/convert/detect', { spec: text }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (detection.data.detected) {
        setFromFormat(detection.data.format);
        setDetectFormat(detection.data.format);
        // Auto-set target format to the opposite
        setToFormat(detection.data.format === 'swagger_2' ? 'openapi_3' : 'swagger_2');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sample');
    }
  };

  const handleConvert = async () => {
    if (!inputSpec.trim()) {
      setError('Please provide an input specification');
      return;
    }

    setConverting(true);
    setError(null);
    try {
      const token = localStorage.getItem('devdock-api-token');
      const result = await axios.post('/api/convert/spec', {
        spec: inputSpec,
        from: fromFormat,
        to: toFormat,
        syntax,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setOutputSpec(result.data.spec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed');
      setOutputSpec('');
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadSpec = (spec: string, format: string) => {
    const blob = new Blob([spec], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spec-${format}.${syntax === 'yaml' ? 'yaml' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            API Spec Converter
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Convert between OpenAPI 3.0 and Swagger 2.0 formats
          </p>
        </div>
      </div>

      {/* Sample loaders */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Load sample:
        </span>
        <button
          onClick={() => loadSample('weather-api-swagger2.json')}
          className="px-3 py-1.5 text-xs rounded transition-colors"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          Weather API (Swagger 2.0)
        </button>
        <button
          onClick={() => loadSample('petstore-openapi3.json')}
          className="px-3 py-1.5 text-xs rounded transition-colors"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          Petstore API (OpenAPI 3.0)
        </button>
      </div>

      {detectFormat && (
        <div className="text-xs px-3 py-2 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
          <FileJson size={12} className="inline mr-1" />
          Detected format: <strong>{detectFormat === 'swagger_2' ? 'Swagger 2.0' : 'OpenAPI 3.0'}</strong>
        </div>
      )}

      {error && (
        <div
          className="text-xs px-3 py-2 rounded"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Input Specification
            </label>
            <div className="flex gap-2">
              <select
                value={fromFormat}
                onChange={(e) => setFromFormat(e.target.value as SpecFormat)}
                className="text-xs px-2 py-1 rounded outline-none"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="swagger_2">Swagger 2.0</option>
                <option value="openapi_3">OpenAPI 3.0</option>
              </select>
              {inputSpec && (
                <button
                  onClick={() => copyToClipboard(inputSpec)}
                  className="p-1.5 rounded transition-colors"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  title="Copy to clipboard"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
          </div>
          <textarea
            value={inputSpec}
            onChange={(e) => setInputSpec(e.target.value)}
            placeholder='Paste your API specification here (JSON or YAML)...'
            className="w-full h-96 px-3 py-2 text-xs font-mono rounded outline-none resize-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Converted Specification
            </label>
            <div className="flex gap-2">
              <select
                value={toFormat}
                onChange={(e) => setToFormat(e.target.value as SpecFormat)}
                className="text-xs px-2 py-1 rounded outline-none"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="swagger_2">Swagger 2.0</option>
                <option value="openapi_3">OpenAPI 3.0</option>
              </select>
              <select
                value={syntax}
                onChange={(e) => setSyntax(e.target.value as SpecSyntax)}
                className="text-xs px-2 py-1 rounded outline-none"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
              </select>
              {outputSpec && (
                <>
                  <button
                    onClick={() => copyToClipboard(outputSpec)}
                    className="p-1.5 rounded transition-colors"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title="Copy to clipboard"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => downloadSpec(outputSpec, toFormat)}
                    className="p-1.5 rounded transition-colors"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={outputSpec}
            readOnly
            placeholder="Converted specification will appear here..."
            className="w-full h-96 px-3 py-2 text-xs font-mono rounded outline-none resize-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Convert button */}
      <div className="flex justify-center">
        <button
          onClick={handleConvert}
          disabled={converting || !inputSpec.trim()}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded transition-all"
          style={{
            background: converting || !inputSpec.trim() ? 'var(--bg-inset)' : 'var(--accent)',
            color: converting || !inputSpec.trim() ? 'var(--text-muted)' : 'white',
            border: 'none',
            cursor: converting || !inputSpec.trim() ? 'not-allowed' : 'pointer',
            opacity: converting || !inputSpec.trim() ? 0.5 : 1,
          }}
        >
          {converting ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Converting...
            </>
          ) : (
            <>
              Convert
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
