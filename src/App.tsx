import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { initOTel } from './otel'
import { useSettingsStore, useAuthStore, usePluginStore, useUserAccountsStore } from './store'
import { changeLanguage } from './i18n'
import { BUILT_IN_PLUGINS, usePluginExtensions } from './lib/plugins'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ForumPage } from './pages/ForumPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { SqlToolPage } from './pages/SqlToolPage'
import {
  DashboardPage,
  GitHubPage,
  ADOPage,
  MCPPage,
  TelemetryPageRoute,
  CatalogPage,
  ScaffoldPage,
  DevToolsPage,
  JsonValidatorPage,
  ApiTesterPage,
  DnsLookupPage,
  PingToolPage,
  WhoisLookupPage,
  SslCheckerPage,
  HttpHeadersPage,
  WebSocketDebuggerPage,
  GraphqlExplorerPage,
  TextDiffPage,
  Base64ToolPage,
  RegexTesterPage,
  CsvViewerPage,
  GitGeneratorPage,
  DockerGeneratorPage,
  DocsPage,
  GoogleDrivePage,
  NetworkPage,
  PluginsPage,
  UsersPage,
  SettingsPage,
} from './pages'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const [editMode, setEditMode] = useState(false)
  const settings = useSettingsStore((s) => s.settings)
  const authStatus = useAuthStore((s) => s.status)
  const registerPlugins = usePluginStore((s) => s.registerPlugins)

  // Register built-in plugins on mount
  useEffect(() => {
    registerPlugins(BUILT_IN_PLUGINS)
  }, [registerPlugins])

  // Bootstrap OpenTelemetry on mount (and when config changes)
  useEffect(() => {
    if (settings.otel.enabled) {
      initOTel({
        endpoint: settings.otel.endpoint,
        exportTraces: settings.otel.exportTraces,
        exportMetrics: settings.otel.exportMetrics,
        headers: settings.otel.headers,
      })
    }
  }, [settings.otel.endpoint, settings.otel.enabled])

  // Update document title when branding changes
  useEffect(() => {
    document.title = settings.branding?.appName || 'DevDock'
  }, [settings.branding?.appName])

  // Sync language: user preference → app default → browser
  const user = useAuthStore((s) => s.user)
  const userAccount = useUserAccountsStore((s) => s.accounts.find((a) => a.id === user?.id))
  useEffect(() => {
    const lang = userAccount?.preferences?.language || settings.defaultLanguage || 'en'
    changeLanguage(lang)
  }, [userAccount?.preferences?.language, settings.defaultLanguage])

  // Auth gate — show login page if not authenticated
  if (authStatus === 'unauthenticated') {
    return <LoginPage />
  }

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'var(--bg-primary)',
      }}>
        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-full"
            style={{
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--accent)',
              animation: 'forge-spin 0.7s linear infinite',
            }}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Signing in...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Shell editMode={editMode} onToggleEdit={() => setEditMode((v) => !v)}>
        <PluginRoutes editMode={editMode} />
      </Shell>
    </BrowserRouter>
  )
}

// Route guard for admin-only pages
function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-3" style={{ color: 'var(--text-faint)' }}>🔒</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Access Denied</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>You need admin privileges to access this page.</div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

// Separated so usePluginExtensions runs inside BrowserRouter context
function PluginRoutes({ editMode }: { editMode: boolean }) {
  const { pages } = usePluginExtensions()
  useTheme() // Apply user's theme preferences

  return (
    <Routes>
      <Route path="/"          element={<DashboardPage editMode={editMode} />} />
      <Route path="/github"    element={<GitHubPage />} />
      <Route path="/ado"       element={<ADOPage />} />
      <Route path="/mcp"       element={<MCPPage />} />
      <Route path="/telemetry" element={<TelemetryPageRoute />} />
      <Route path="/catalog"   element={<CatalogPage />} />
      <Route path="/scaffold"  element={<ScaffoldPage />} />
      <Route path="/devtools"         element={<DevToolsPage />} />
      <Route path="/devtools/json"       element={<JsonValidatorPage />} />
      <Route path="/devtools/api"        element={<ApiTesterPage />} />
      <Route path="/devtools/dns"        element={<DnsLookupPage />} />
      <Route path="/devtools/ping"       element={<PingToolPage />} />
      <Route path="/devtools/whois"      element={<WhoisLookupPage />} />
      <Route path="/devtools/ssl"        element={<SslCheckerPage />} />
      <Route path="/devtools/headers"    element={<HttpHeadersPage />} />
      <Route path="/devtools/websocket"  element={<WebSocketDebuggerPage />} />
      <Route path="/devtools/graphql"    element={<GraphqlExplorerPage />} />
      <Route path="/devtools/diff"       element={<TextDiffPage />} />
      <Route path="/devtools/base64"     element={<Base64ToolPage />} />
      <Route path="/devtools/regex"      element={<RegexTesterPage />} />
      <Route path="/devtools/csv"        element={<CsvViewerPage />} />
      <Route path="/devtools/git-gen"    element={<GitGeneratorPage />} />
      <Route path="/devtools/docker-gen" element={<DockerGeneratorPage />} />
      <Route path="/devtools/sql"        element={<SqlToolPage />} />
      <Route path="/docs"               element={<DocsPage />} />
      <Route path="/docs/google-drive"  element={<GoogleDrivePage />} />
      <Route path="/network"   element={<NetworkPage />} />
      <Route path="/plugins"   element={<PluginsPage />} />
      <Route path="/profile"   element={<ProfilePage />} />
      <Route path="/whats-new" element={<WhatsNewPage />} />
      <Route path="/privacy"   element={<PrivacyPage />} />
      <Route path="/forum"                      element={<ForumPage />} />
      <Route path="/forum/:view"                element={<ForumPage />} />
      <Route path="/forum/thread/:threadId"     element={<ForumPage />} />
      <Route path="/analytics" element={<AdminGuard><AnalyticsPage /></AdminGuard>} />
      <Route path="/directory"  element={<AdminGuard><DirectoryPage /></AdminGuard>} />
      <Route path="/users"     element={<AdminGuard><UsersPage /></AdminGuard>} />
      <Route path="/settings"  element={<AdminGuard><SettingsPage /></AdminGuard>} />
      {pages.map(({ path, component: Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Routes>
  )
}
