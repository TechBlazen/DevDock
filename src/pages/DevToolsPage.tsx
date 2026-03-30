import { useNavigate } from 'react-router-dom';
import { Braces, Send, Wrench, ArrowRight, type LucideIcon } from 'lucide-react';
import { JsonValidator } from '../components/devtools/JsonValidator';
import { ApiTester } from '../components/devtools/ApiTester';
import { SectionTitle, Card } from '../components/ui';

interface ToolDef {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  color: string;
  tags: string[];
}

const TOOLS: ToolDef[] = [
  {
    id: 'json',
    name: 'JSON Validator',
    description: 'Validate, format, and minify JSON documents. Includes syntax error detection with line numbers, pretty-print, and stats.',
    path: '/devtools/json',
    icon: Braces,
    color: '#f59e0b',
    tags: ['json', 'validation', 'formatting'],
  },
  {
    id: 'api',
    name: 'API Tester',
    description: 'Send HTTP requests and inspect responses. Supports GET, POST, PUT, PATCH, DELETE with custom headers, request body, and history.',
    path: '/devtools/api',
    icon: Send,
    color: '#3b82f6',
    tags: ['http', 'rest', 'api', 'postman'],
  },
];

export const JsonValidatorPage = () => (
  <div className="h-full flex flex-col">
    <div className="px-6 pt-5 pb-3">
      <h1 className="text-lg font-bold" style={{ color: 'rgba(0,0,0,0.85)' }}>JSON Validator</h1>
      <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Validate, format, and minify JSON.</p>
    </div>
    <div className="flex-1 overflow-hidden mx-4 mb-4 rounded-[20px]" style={{
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.35)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(31,38,135,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <JsonValidator />
    </div>
  </div>
);

export const ApiTesterPage = () => (
  <div className="h-full flex flex-col">
    <div className="px-6 pt-5 pb-3">
      <h1 className="text-lg font-bold" style={{ color: 'rgba(0,0,0,0.85)' }}>API Tester</h1>
      <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Send HTTP requests and inspect responses — like Postman in your browser.</p>
    </div>
    <div className="flex-1 overflow-hidden mx-4 mb-4 rounded-[20px]" style={{
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.35)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(31,38,135,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <ApiTester />
    </div>
  </div>
);

export const DevToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <SectionTitle sub="Built-in utilities for developers — validate data, test APIs, and debug faster.">
        Developer Tools
      </SectionTitle>

      {/* Summary */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <Wrench size={14} style={{ color: '#8b5cf6' }} />
          <span className="text-[12px] font-semibold" style={{ color: '#8b5cf6' }}>{TOOLS.length} tools available</span>
        </div>
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.id} onClick={() => navigate(tool.path)}>
              <div className="p-5 flex flex-col gap-3 cursor-pointer group h-full">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `${tool.color}12`,
                    border: `1px solid ${tool.color}25`,
                    boxShadow: `0 4px 16px ${tool.color}15`,
                  }}
                >
                  <Icon size={22} style={{ color: tool.color }} />
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-[14px] font-bold" style={{ color: 'rgba(0,0,0,0.85)' }}>
                    {tool.name}
                  </h3>
                  <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'rgba(0,0,0,0.5)' }}>
                    {tool.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap mt-auto">
                  {tool.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{
                      background: `${tool.color}0a`,
                      color: `${tool.color}cc`,
                      border: `1px solid ${tool.color}20`,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Open link */}
                <div className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: tool.color }}>
                  Open tool <ArrowRight size={12} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
