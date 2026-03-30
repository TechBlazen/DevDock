import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { initOTel } from './otel'
import { useSettingsStore, useAuthStore, usePluginStore } from './store'
import { BUILT_IN_PLUGINS, usePluginExtensions } from './lib/plugins'
import { LoginPage } from './pages/LoginPage'
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
  DocsPage,
  NetworkPage,
  PluginsPage,
  UsersPage,
  SettingsPage,
} from './pages'

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

  // Auth gate — show login page if not authenticated
  if (authStatus === 'unauthenticated') {
    return <LoginPage />
  }

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: '#f0f2f5',
      }}>
        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-full"
            style={{
              border: '3px solid #e0e0e0',
              borderTopColor: '#005DAA',
              animation: 'forge-spin 0.7s linear infinite',
            }}
          />
          <p className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Signing in...</p>
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
          <div className="text-4xl mb-3" style={{ color: 'rgba(0,0,0,0.15)' }}>🔒</div>
          <div className="text-sm font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>Access Denied</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(0,0,0,0.3)' }}>You need admin privileges to access this page.</div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

// Separated so usePluginExtensions runs inside BrowserRouter context
function PluginRoutes({ editMode }: { editMode: boolean }) {
  const { pages } = usePluginExtensions()

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
      <Route path="/devtools/json"    element={<JsonValidatorPage />} />
      <Route path="/devtools/api"     element={<ApiTesterPage />} />
      <Route path="/docs"      element={<DocsPage />} />
      <Route path="/network"   element={<NetworkPage />} />
      <Route path="/plugins"   element={<PluginsPage />} />
      <Route path="/users"     element={<AdminGuard><UsersPage /></AdminGuard>} />
      <Route path="/settings"  element={<AdminGuard><SettingsPage /></AdminGuard>} />
      {pages.map(({ path, component: Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Routes>
  )
}
