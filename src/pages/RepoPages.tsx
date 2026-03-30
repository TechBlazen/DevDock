import { RepoList } from '../components/repos/RepoList';
import { MCPRegistry } from '../components/mcp/MCPRegistry';
import { TelemetryPage } from '../components/telemetry';
import { SectionTitle } from '../components/ui';

export const GitHubPage = () => (
  <div className="p-6">
    <SectionTitle sub="Browse, open, or clone your GitHub repositories">
      GitHub Repositories
    </SectionTitle>
    <RepoList source="github" />
  </div>
);

export const ADOPage = () => (
  <div className="p-6">
    <SectionTitle sub="Browse and manage Azure DevOps repositories">
      Azure DevOps Repositories
    </SectionTitle>
    <RepoList source="ado" />
  </div>
);

export const MCPPage = () => (
  <div className="p-6">
    <SectionTitle sub="Manage Model Context Protocol servers used by DevDock AI">
      MCP Server Registry
    </SectionTitle>
    <MCPRegistry />
  </div>
);

export const TelemetryPageRoute = () => <TelemetryPage />;
