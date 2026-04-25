import { ExternalLink, GitBranch, Trash2 } from 'lucide-react';
import { Card, Pill } from '../ui';
import { useApiStore, type ApiSpec } from '../../store/api-store';
import { useAuthStore } from '../../store';

interface ApiCardProps {
  api: ApiSpec;
  onSelect: (api: ApiSpec) => void;
}

export const ApiCard = ({ api, onSelect }: ApiCardProps) => {
  const removeApi = useApiStore((s) => s.removeApi);
  const user = useAuthStore((s) => s.user);
  const canDelete = user?.role === 'admin' || (api.addedBy && api.addedBy === user?.id);

  const kindColor = api.specKind === 'openapi' ? '#005DAA' : '#7c3aed';

  return (
    <Card onClick={() => onSelect(api)} className="p-4 group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {api.name}
            </h3>
            <Pill color={kindColor}>
              {api.specKind === 'openapi' ? 'OpenAPI' : 'Swagger'} {api.specVersion ?? ''}
            </Pill>
          </div>
          {api.description && (
            <p className="text-[12px] mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {api.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            {api.sourceRepoName && (
              <span className="flex items-center gap-1">
                <GitBranch size={11} /> {api.sourceRepoName}
              </span>
            )}
            {api.baseUrl && (
              <span className="flex items-center gap-1 font-mono truncate max-w-[280px]" title={api.baseUrl}>
                <ExternalLink size={11} /> {api.baseUrl}
              </span>
            )}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove "${api.name}" from the API catalog?`)) {
                void removeApi(api.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-opacity"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Remove API"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </Card>
  );
};
