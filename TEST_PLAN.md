# Forge Portal (DevDock) — Test Plan

**Version:** 1.0  
**Date:** 2026-04-12  
**Author:** Judge (Staff Engineer) + Claude  
**Stack:** Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · Zustand · React Router v7 · OpenTelemetry

---

## 1. Overview

This document defines the testing strategy for the Forge Portal (DevDock) — an AI-powered developer portal built around MCP servers, multi-provider AI chat, RBAC authentication, and OpenTelemetry observability. The plan covers **unit tests** (Jest + React Testing Library) and **end-to-end tests** (Playwright), targeting full coverage across stores, utilities, components, pages, and critical user flows.

### 1.1 Goals

- Prevent regressions in core business logic (auth, RBAC, AI routing, store persistence)
- Validate all critical user journeys end-to-end in real browser contexts
- Establish a CI/CD gate that blocks merges on test failure
- Generate JUnit XML reports compatible with ALM Octane publishing
- Provide a foundation for future load/performance testing

### 1.2 Out of Scope (Phase 1)

- Load/performance testing (k6/Locust) — planned for Phase 2
- Visual regression testing (Chromatic/Percy) — planned for Phase 2
- Server-side tests for the Fastify backend (`server/`) — separate test plan

---

## 2. Framework Selection

| Layer              | Framework                    | Justification                                                    |
|--------------------|------------------------------|------------------------------------------------------------------|
| Unit (TS/React)    | **Jest** + React Testing Lib | Standard for React 19 + Zustand; fast in-process execution       |
| E2E / Integration  | **Playwright**               | Auto-waiting, tracing, multi-browser support, parallel by default|
| Mocking            | **MSW (Mock Service Worker)**| Intercepts `fetch` at the network level for AI provider mocking  |
| Coverage           | **Jest --coverage** (c8)     | Built-in Istanbul/c8 coverage reporting                          |

---

## 3. Unit Tests (Jest + React Testing Library)

### 3.1 Zustand Stores (`src/store/`)

Each store is the backbone of the app. All store tests follow the pattern: create a fresh store instance, invoke actions, assert state changes.

#### 3.1.1 `useAuthStore` (Auth Store)

| Test Case | Description |
|-----------|-------------|
| `should initialize with unauthenticated status` | Default state has `status: 'unauthenticated'`, `user: null` |
| `should sign in with OAuth provider and set authenticated` | `signIn('github', mockUser, 'token-123')` → status = `authenticated` |
| `should sign in as guest and create guest profile` | `signInAsGuest()` → status = `authenticated`, provider = `guest` |
| `should sign out and clear all auth state` | After signIn → `signOut()` → status = `unauthenticated`, user/token = null |
| `should set loading state` | `setLoading()` → status = `loading` |
| `should update access token` | `setToken('new-token')` → accessToken updated |
| `should auto-provision user account on OAuth sign-in` | Verify `useUserAccountsStore.ensureAccount` is called on `signIn` |
| `should persist auth state to localStorage` | Sign in → verify localStorage key `devdock-auth` contains state |
| `should restore auth state from localStorage on hydration` | Pre-seed localStorage → create store → verify hydrated state |

#### 3.1.2 `useSettingsStore` (Settings Store)

| Test Case | Description |
|-----------|-------------|
| `should initialize with default settings` | Provider = `anthropic`, OTel enabled, default widgets |
| `should update AI provider` | `updateAIProvider('openai')` → settings.ai.provider = `openai` |
| `should update API key for specific provider` | `updateApiKey('anthropic', 'sk-xxx')` → only anthropic key changes |
| `should update OTel config partially` | `updateOTelConfig({ enabled: false })` → enabled = false, endpoint unchanged |
| `should update GitHub config` | `updateGitHubConfig({ accessToken: 'ghp_xxx' })` → token set |
| `should update ADO config` | `updateADOConfig({ organization: 'costco' })` → org set |
| `should update dashboard widgets` | `updateDashboardWidgets(['repos_github'])` → widgets array replaced |
| `should update branding` | `updateBranding({ appName: 'MyPortal' })` → appName changed |
| `should update navigation` | `updateNavigation(customNav)` → navigation replaced |
| `should reset navigation to defaults` | After custom nav → `resetNavigation()` → matches `defaultNavigation` |
| `should toggle AI enabled flag` | `updateAIEnabled(false)` → aiEnabled = false |
| `should update Overwatch config` | `updateOverwatchConfig({ enabled: true, endpoint: '...' })` → merged |
| `should persist settings to localStorage` | Change setting → verify `devdock-settings` key |
| `should merge persisted state with defaults on hydration` | Handles migration of new navigation items into old persisted state |

#### 3.1.3 `useMCPStore` (MCP Server Registry)

| Test Case | Description |
|-----------|-------------|
| `should add a new MCP server` | `addServer(mockServer)` → server appears in list |
| `should remove MCP server by ID` | Add → remove → server gone |
| `should update server status` | `updateStatus(id, 'running')` → status changed |
| `should seed with demo data on init` | Default state includes sample MCP servers |

#### 3.1.4 `useChatStore` (Chat Messages)

| Test Case | Description |
|-----------|-------------|
| `should add a user message` | `addMessage({ role: 'user', ... })` → messages.length = 1 |
| `should add an assistant message with provider/traceId` | Verify provider and traceId fields are stored |
| `should clear messages` | Add messages → `clearMessages()` → empty array |
| `should set loading state` | `setLoading(true)` → loading = true |
| `should handle chat mode switching (devdock/overwatch)` | Messages tagged with correct `chatMode` |

#### 3.1.5 Additional Stores

| Store | Key Test Cases |
|-------|---------------|
| `useRepoStore` | Add/remove GitHub repos, add/remove ADO repos, filter by source |
| `useTelemetryStore` | Add spans, query spans by service name, clear telemetry |
| `useActivityStore` | Push activity events, retrieve recent events |
| `forum-store` | Create thread, add reply, vote on thread, filter by category |
| `vault-store` | Add credential, retrieve by ID, delete credential |
| `search-store` | Execute search, update query, filter by category |
| `builder-store` | Agent builder state management |
| `analytics-store` | Track page views, export analytics data |
| `plugin-submission-store` | Submit plugin, update status |
| `sql-tool-store` | Execute query, store results, handle connection config |

### 3.2 Utility Libraries (`src/lib/`)

#### 3.2.1 `rbac.ts` — Role-Based Access Control

| Test Case | Description |
|-----------|-------------|
| `hashPassword should produce consistent hashes` | Same input → same output |
| `hashPassword should produce different hashes for different inputs` | 'admin' ≠ 'editor' |
| `verifyPassword should return true for correct password` | `verifyPassword('admin', hashPassword('admin'))` = true |
| `verifyPassword should return false for wrong password` | `verifyPassword('wrong', hashPassword('admin'))` = false |
| `ROLE_PERMISSIONS.admin should have full access` | `canManageUsers`, `canManagePlugins`, `canEditDocs` all true |
| `ROLE_PERMISSIONS.editor should not manage users` | `canManageUsers` = false, `canEditDocs` = true |
| `ROLE_PERMISSIONS.viewer should be read-only` | `canEditDocs` = false, `canAccessTerminal` = false |
| `SEED_ACCOUNTS should have valid password hashes` | Each seed account hash matches `hashPassword(knownPassword)` |

#### 3.2.2 `auth.ts` — OAuth & PKCE

| Test Case | Description |
|-----------|-------------|
| `generateCodeVerifier should return base64url string` | No `+`, `/`, or `=` characters |
| `generateCodeChallenge should produce SHA-256 hash` | Given known verifier → expected challenge (deterministic test) |
| `buildOAuthUrl should include PKCE for Microsoft/Google` | URL contains `code_challenge` and `code_challenge_method=S256` |
| `buildOAuthUrl should omit PKCE for GitHub` | GitHub URL has no `code_challenge` param |
| `buildOAuthUrl should include correct scopes per provider` | GitHub: `read:user`, Microsoft: `openid`, Google: `openid` |
| `createGuestUser should return valid UserProfile` | Has id, displayName, role = 'viewer' |

#### 3.2.3 `bookmark-utils.ts` — URL Utilities

| Test Case | Description |
|-----------|-------------|
| `validateUrl should accept valid URLs` | `https://example.com` → true |
| `validateUrl should reject invalid strings` | `not-a-url` → false |
| `parseUrl should return URL object for valid input` | `.hostname` = `example.com` |
| `parseUrl should return null for invalid input` | Empty string → null |
| `detectContentType should identify video URLs` | YouTube, Vimeo → `'video'` |
| `detectContentType should identify image extensions` | `.png`, `.jpg` → `'image'` |
| `detectContentType should identify document extensions` | `.pdf`, `.docx` → `'document'` |

#### 3.2.4 `ai.ts` — AI Provider Client

| Test Case | Description |
|-----------|-------------|
| `callAnthropic should POST to correct endpoint` | MSW intercept verifies URL = `https://api.anthropic.com/v1/messages` |
| `callAnthropic should include x-api-key header` | Header present when API key configured |
| `callAnthropic should call onDone with response text` | Mock 200 → `onDone` receives extracted text |
| `callAnthropic should call onError on HTTP failure` | Mock 401 → `onError` called with error message |
| `callAnthropic should filter system messages from payload` | System role messages excluded from API request body |
| `callOpenAI should POST to OpenAI chat completions` | Correct endpoint and payload structure |
| `callGemini should POST to Gemini generateContent` | Correct endpoint for Gemini API |
| `callLocal should POST to Ollama endpoint` | Uses `localEndpoint` from config |
| `streamChat should route to correct provider` | Provider = 'anthropic' → callAnthropic invoked |

#### 3.2.5 `overwatch.ts` — Overwatch AG-UI Client

| Test Case | Description |
|-----------|-------------|
| `sendOverwatchMessage should POST to configured endpoint` | MSW intercept verifies correct URL |
| `should parse TEXT_MESSAGE_CONTENT events` | SSE stream → onToken called per delta |
| `should parse TOOL_CALL_START/END events` | `onToolCallUpdate` callback receives tool call info |
| `should call onError on network failure` | Fetch rejection → onError invoked |

#### 3.2.6 Other Libraries

| Library | Key Test Cases |
|---------|---------------|
| `search/providers/minisearch-provider.ts` | Index documents, search by query, relevance ranking |
| `search/sources/*.ts` | Each source returns correctly shaped `SearchResult[]` |
| `themes.ts` | Theme objects have required CSS variable keys |
| `icon-registry.ts` | Registry resolves known icon names to components |
| `forum-constants.ts` | Category/tag constants are valid and non-empty |
| `scaffold-agents.ts` | Agent definitions have required fields |
| `builder-templates.ts` | Templates render without errors |
| `api.ts` | API wrapper builds correct URLs; handles error responses |
| `repos.ts` | Fetches GitHub repos with correct auth headers; parses ADO API response |
| `google-drive.ts` | Builds Drive API URLs; handles token refresh; parses file listing |
| `doc-convert.ts` | Converts between document formats; handles edge cases |
| `auto-import-docs.ts` | Discovers doc files; creates DocEntry objects |
| `default-navigation.ts` | Default nav items have required fields; routes are valid |

### 3.3 Hooks (`src/hooks/`)

| Hook | Key Test Cases |
|------|---------------|
| `useHotkey` | Registers keyboard shortcut; fires callback on key combo; cleans up on unmount |
| `useTheme` | Applies theme CSS variables; responds to theme changes in store |
| `useUserPreferences` | Returns merged preferences (user + defaults); updates on store change |
| `useSearchSync` | Syncs search state with URL params; debounces input |
| `useAnalyticsTracker` | Tracks page views on route change; batches analytics events |

### 3.4 React Components

All component tests use React Testing Library with `@testing-library/jest-dom` matchers. Components that depend on Zustand stores should use fresh store instances per test.

#### 3.4.1 Layout Components

| Component | Key Test Cases |
|-----------|---------------|
| `Shell` | Renders sidebar + topbar + main content area; toggles edit mode |
| `Sidebar` | Renders nav items from navigation config; highlights active route; collapses/expands |
| `Topbar` | Shows app name from branding; search input present; user avatar renders |
| `Footer` | Renders with version info |

#### 3.4.2 Auth Components

| Component | Key Test Cases |
|-----------|---------------|
| `LoginPage` | Shows OAuth provider buttons (GitHub, Microsoft, Google); shows guest login; handles click events |
| `AdminGuard` | Renders children for admin user; shows "Access Denied" for non-admin |

#### 3.4.3 Chat Components

| Component | Key Test Cases |
|-----------|---------------|
| `ChatPanel` | Renders message input; displays chat history; shows loading spinner during AI call |
| `ChatComponents` | Renders user vs assistant messages with different styles; renders markdown in assistant messages |

#### 3.4.4 Dashboard Components

| Component | Key Test Cases |
|-----------|---------------|
| `DashboardGrid` | Renders configured widgets; handles edit mode (drag/drop) |
| `ActivityWidget` | Renders activity events; empty state when no events |
| `QuickActionsWidget` | Renders action buttons; click handlers fire |
| `FavoritesWidget` | Shows favorited repos; empty state |

#### 3.4.5 MCP Components

| Component | Key Test Cases |
|-----------|---------------|
| `MCPRegistry` | Lists registered servers; shows status badges (running/stopped/error); add server form |

#### 3.4.6 Repository Components

| Component | Key Test Cases |
|-----------|---------------|
| `RepoCard` | Renders repo name, language badge, star count; links to repo detail |
| `RepoList` | Renders filtered list; handles search; empty state |
| `RepoDetailPanel` | Shows full repo info; commit history; merge requests |
| `RegisterRepo` | Form validation for repo URL; submit handler |

#### 3.4.7 DevTools Components

| Component | Key Test Cases |
|-----------|---------------|
| `JsonValidator` | Validates correct JSON; shows error for invalid JSON |
| `JwtDecoder` | Decodes header + payload; shows error for malformed token |
| `Base64Tool` | Encodes and decodes correctly |
| `UuidGenerator` | Generates valid v4 UUIDs |
| `RegexTester` | Highlights matches; handles invalid regex gracefully |
| `CsvViewer` | Parses CSV into table rows |
| `TextDiff` | Shows diff between two text inputs |

#### 3.4.8 Forum Components

| Component | Key Test Cases |
|-----------|---------------|
| `ForumListView` | Renders thread list; filters by category |
| `ForumThreadView` | Renders thread + replies; answer form present |
| `ForumVoteControl` | Upvote/downvote buttons; vote count display |
| `ForumAskModal` | Form validation; submit creates thread |

#### 3.4.9 Search Components

| Component | Key Test Cases |
|-----------|---------------|
| `CommandPalette` | Opens on keyboard shortcut (Cmd+K); renders search results; navigates on select |
| `SearchResultItem` | Renders title, category badge, description |

#### 3.4.10 UI Primitives (`components/ui/`)

| Component | Key Test Cases |
|-----------|---------------|
| `Button` | Renders with variants (primary, ghost, danger); disabled state; click handler |
| `Card` | Renders children; applies glass-morphism classes |
| `Badge` | Renders with color variants |
| `Input` | Controlled value; onChange handler; placeholder text |
| `Toggle` | Checked/unchecked states; onChange fires |

### 3.5 Error Boundaries & Edge Cases

| Test Case | Description |
|-----------|-------------|
| `App should show login page when unauthenticated` | Auth status = unauthenticated → LoginPage rendered |
| `App should show loading spinner during auth check` | Auth status = loading → spinner visible |
| `App should render Shell with routes when authenticated` | Auth status = authenticated → Shell + routes |
| `OTel init should not throw when endpoint is unreachable` | Graceful degradation |
| `Settings store should handle corrupted localStorage` | Malformed JSON → falls back to defaults |
| `AI client should handle empty response body` | Empty `content` array → empty string, no crash |
| `Chat store should handle rapid concurrent message adds` | Race condition safety |

---

## 4. End-to-End Tests (Playwright)

### 4.1 Test Infrastructure

#### Page Object Model

Each page gets a dedicated Page Object class following Playwright best practices. All selectors use `data-testid` attributes where possible.

```
tests/
├── e2e/
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   ├── chat.spec.ts
│   ├── mcp.spec.ts
│   ├── repos.spec.ts
│   ├── settings.spec.ts
│   ├── devtools.spec.ts
│   ├── forum.spec.ts
│   ├── search.spec.ts
│   ├── navigation.spec.ts
│   └── accessibility.spec.ts
├── pages/
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── ChatPanel.ts
│   ├── MCPPage.ts
│   ├── SettingsPage.ts
│   ├── GitHubReposPage.ts
│   ├── ADOReposPage.ts
│   ├── DevToolsPage.ts
│   ├── ForumPage.ts
│   └── SearchPalette.ts
├── fixtures/
│   └── test-fixtures.ts
└── playwright.config.ts
```

#### Test Data Strategy

- **Auth bypass fixture**: Pre-seed `localStorage` with authenticated state to skip login for non-auth tests
- **MSW handlers**: Mock AI provider APIs, GitHub API, ADO API at the network level
- **Isolated state**: Each test clears `localStorage` in `beforeEach` to prevent cross-test contamination

### 4.2 E2E Test Suites

#### 4.2.1 Authentication Flow (`auth.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should display login page with all OAuth providers` | P0 |
| `should display guest login option` | P0 |
| `should sign in as guest and redirect to dashboard` | P0 |
| `should persist auth state across page reload` | P0 |
| `should sign out and return to login page` | P0 |
| `should show Access Denied for non-admin on /users` | P1 |
| `should show Access Denied for non-admin on /settings` | P1 |

#### 4.2.2 Dashboard (`dashboard.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should render all configured dashboard widgets` | P0 |
| `should display correct app name from branding` | P1 |
| `should toggle edit mode for widget rearrangement` | P1 |
| `should show activity feed with recent events` | P1 |
| `should navigate to repos page from quick actions` | P1 |

#### 4.2.3 AI Chat (`chat.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should open chat panel and display input field` | P0 |
| `should send a message and display user bubble` | P0 |
| `should display assistant response (mocked API)` | P0 |
| `should show loading indicator while waiting for response` | P1 |
| `should switch between AI providers` | P1 |
| `should switch between DevDock and Overwatch chat modes` | P1 |
| `should display error message on API failure` | P1 |
| `should clear chat history` | P2 |

#### 4.2.4 MCP Server Management (`mcp.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /mcp and display server registry` | P0 |
| `should display server status badges (running/stopped/error)` | P0 |
| `should add a new MCP server via form` | P1 |
| `should remove an MCP server` | P1 |
| `should show server details (port, transport, capabilities)` | P2 |

#### 4.2.5 Repository Browsing (`repos.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /github and display repo list` | P0 |
| `should navigate to /ado and display ADO repo list` | P0 |
| `should filter repos by search query` | P1 |
| `should open repo detail panel on card click` | P1 |
| `should register a new repo via form` | P1 |
| `should display repo metadata (language, stars, branch)` | P2 |

#### 4.2.6 Settings (`settings.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /settings page` | P0 |
| `should update AI provider selection` | P1 |
| `should save and persist API key input` | P1 |
| `should toggle OTel export on/off` | P1 |
| `should update branding (app name)` | P2 |
| `should update navigation and see changes in sidebar` | P2 |

#### 4.2.7 DevTools (`devtools.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /devtools and see tool grid` | P0 |
| `should validate JSON in JSON Validator tool` | P1 |
| `should decode a JWT token` | P1 |
| `should encode/decode Base64` | P1 |
| `should generate UUID` | P1 |
| `should test regex with sample input` | P2 |
| `should show diff between two text blocks` | P2 |

#### 4.2.8 Forum (`forum.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /forum and display thread list` | P0 |
| `should filter threads by category` | P1 |
| `should open a thread and view replies` | P1 |
| `should create a new thread via Ask modal` | P1 |
| `should upvote/downvote a thread` | P2 |

#### 4.2.9 Global Search (`search.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should open command palette with Cmd+K / Ctrl+K` | P0 |
| `should display search results matching query` | P0 |
| `should navigate to selected search result` | P1 |
| `should categorize results (repos, MCP, docs, etc.)` | P1 |
| `should close palette on Escape` | P2 |

#### 4.2.10 SQL Tool (`sqltool.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /sql-tool and display query editor` | P1 |
| `should configure database connection` | P1 |
| `should execute a query and display results table` | P1 |
| `should show error for invalid SQL syntax` | P2 |

#### 4.2.11 Code Playground (`playground.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /playground and display code editor` | P1 |
| `should switch between languages` | P1 |
| `should execute code and display output` | P1 |

#### 4.2.12 Analytics (`analytics.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should navigate to /analytics and display dashboard` | P1 |
| `should display page view metrics` | P2 |

#### 4.2.13 Navigation & Routing (`navigation.spec.ts`) {#nav-e2e}

| Test Case | Priority |
|-----------|----------|
| `should render all sidebar navigation items` | P0 |
| `should highlight active route in sidebar` | P0 |
| `should navigate to each top-level route without errors` | P0 |
| `should collapse/expand sidebar` | P1 |
| `should render 404 or fallback for unknown routes` | P2 |

#### 4.2.14 Accessibility (`accessibility.spec.ts`)

| Test Case | Priority |
|-----------|----------|
| `should have no critical axe-core violations on login page` | P0 |
| `should have no critical axe-core violations on dashboard` | P0 |
| `should support keyboard navigation through sidebar` | P1 |
| `should have proper ARIA labels on interactive elements` | P1 |
| `should maintain focus management in modals` | P2 |

---

## 5. `data-testid` Attribute Requirements

To support reliable Playwright selectors, the following `data-testid` attributes must be added to key elements:

| Component | Attribute | Element |
|-----------|-----------|---------|
| LoginPage | `data-testid="login-github"` | GitHub OAuth button |
| LoginPage | `data-testid="login-microsoft"` | Microsoft OAuth button |
| LoginPage | `data-testid="login-google"` | Google OAuth button |
| LoginPage | `data-testid="login-guest"` | Guest login button |
| Shell | `data-testid="sidebar"` | Sidebar nav container |
| Shell | `data-testid="topbar"` | Top bar container |
| Shell | `data-testid="main-content"` | Main content area |
| ChatPanel | `data-testid="chat-input"` | Message input field |
| ChatPanel | `data-testid="chat-send"` | Send button |
| ChatPanel | `data-testid="chat-messages"` | Messages container |
| DashboardGrid | `data-testid="widget-{id}"` | Each dashboard widget |
| MCPRegistry | `data-testid="mcp-server-{id}"` | Each server card |
| RepoCard | `data-testid="repo-card-{id}"` | Each repo card |
| CommandPalette | `data-testid="command-palette"` | Palette overlay |
| CommandPalette | `data-testid="search-input"` | Search input |

---

## 6. Coverage Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Statements** | ≥ 80% | Across all `src/` files |
| **Branches** | ≥ 75% | Focus on store reducers and auth paths |
| **Functions** | ≥ 80% | All exported functions in `lib/` |
| **Lines** | ≥ 80% | Overall line coverage |
| **E2E P0 pass rate** | 100% | All P0 tests must pass to merge |
| **E2E P1 pass rate** | ≥ 95% | Allowance for environment flakiness |

---

## 7. Test Directory Structure

```
forge-portal-clean/
├── jest.config.ts
├── playwright.config.ts
├── src/
│   └── __tests__/
│       ├── store/
│       │   ├── auth-store.test.ts
│       │   ├── settings-store.test.ts
│       │   ├── mcp-store.test.ts
│       │   ├── chat-store.test.ts
│       │   ├── repo-store.test.ts
│       │   ├── telemetry-store.test.ts
│       │   ├── forum-store.test.ts
│       │   ├── vault-store.test.ts
│       │   ├── search-store.test.ts
│       │   └── builder-store.test.ts
│       ├── lib/
│       │   ├── rbac.test.ts
│       │   ├── auth.test.ts
│       │   ├── bookmark-utils.test.ts
│       │   ├── ai.test.ts
│       │   ├── overwatch.test.ts
│       │   ├── themes.test.ts
│       │   └── search-provider.test.ts
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Shell.test.tsx
│       │   │   ├── Sidebar.test.tsx
│       │   │   └── Topbar.test.tsx
│       │   ├── chat/
│       │   │   ├── ChatPanel.test.tsx
│       │   │   └── ChatComponents.test.tsx
│       │   ├── dashboard/
│       │   │   ├── DashboardGrid.test.tsx
│       │   │   ├── ActivityWidget.test.tsx
│       │   │   └── QuickActionsWidget.test.tsx
│       │   ├── mcp/
│       │   │   └── MCPRegistry.test.tsx
│       │   ├── repos/
│       │   │   ├── RepoCard.test.tsx
│       │   │   ├── RepoList.test.tsx
│       │   │   └── RegisterRepo.test.tsx
│       │   ├── devtools/
│       │   │   ├── JsonValidator.test.tsx
│       │   │   ├── JwtDecoder.test.tsx
│       │   │   ├── Base64Tool.test.tsx
│       │   │   └── UuidGenerator.test.tsx
│       │   ├── forum/
│       │   │   ├── ForumListView.test.tsx
│       │   │   ├── ForumThreadView.test.tsx
│       │   │   └── ForumVoteControl.test.tsx
│       │   ├── search/
│       │   │   └── CommandPalette.test.tsx
│       │   └── ui/
│       │       ├── Button.test.tsx
│       │       ├── Card.test.tsx
│       │       ├── Badge.test.tsx
│       │       └── Toggle.test.tsx
│       └── pages/
│           ├── App.test.tsx
│           └── LoginPage.test.tsx
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── chat.spec.ts
│   │   ├── mcp.spec.ts
│   │   ├── repos.spec.ts
│   │   ├── settings.spec.ts
│   │   ├── devtools.spec.ts
│   │   ├── forum.spec.ts
│   │   ├── search.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── accessibility.spec.ts
│   ├── pages/
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── ChatPanel.ts
│   │   ├── MCPPage.ts
│   │   ├── SettingsPage.ts
│   │   ├── GitHubReposPage.ts
│   │   ├── DevToolsPage.ts
│   │   └── ForumPage.ts
│   └── fixtures/
│       ├── test-fixtures.ts
│       └── msw-handlers.ts
└── .github/
    └── workflows/
        └── test.yml
```

---

## 8. Configuration Files

### 8.1 Jest Configuration (`jest.config.ts`)

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  setupFilesAfterSetup: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'results',
      outputName: 'jest-junit.xml',
    }],
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true,
    }],
  },
};

export default config;
```

### 8.2 Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results/playwright-junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev:client',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

---

## 9. CI/CD Pipeline (GitHub Actions)

See `.github/workflows/test.yml` for the full workflow. Key stages:

1. **Install** — `npm ci` + Playwright browser install
2. **Lint** — `npm run lint`
3. **Unit Tests** — `npx jest --coverage --ci` → JUnit XML
4. **Build** — `npm run build` (TypeScript check + Vite build)
5. **E2E Tests** — `npx playwright test` → JUnit XML + traces
6. **Publish to ALM Octane** — Push JUnit results via Octane plugin
7. **Archive Artifacts** — Upload coverage reports, Playwright traces, screenshots

### Merge Requirements

- All P0 E2E tests pass
- Unit test coverage meets thresholds
- Lint passes with zero errors
- Build succeeds without TypeScript errors

---

## 10. Flaky Test Policy

Following the QA Engineering skill guidance:

1. **Diagnosis order**: Timing → Test data → Environment → Selector drift → Test order dependency
2. **Mandatory `data-testid`**: Never rely on CSS class selectors for E2E tests
3. **Auto-retry in CI**: Playwright configured with 2 retries in CI only
4. **Tracking**: Any test marked as flaky MUST have a corresponding GitHub issue linked
5. **Never silently skip**: No `test.skip()` or `x-describe` without a tracked issue

---

## 11. NPM Scripts (to add to `package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## 12. Dependencies to Install

### Unit Testing

```bash
npm install -D jest ts-jest @types/jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  identity-obj-proxy jest-junit msw
```

### E2E Testing

```bash
npm install -D @playwright/test
npx playwright install
```

### Accessibility Testing (for Playwright)

```bash
npm install -D @axe-core/playwright
```

---

## 13. Prioritized Implementation Roadmap

| Phase | Scope | Estimated Effort | Priority |
|-------|-------|------------------|----------|
| **Phase 1** | Store unit tests (auth, settings, MCP, chat) + RBAC/auth lib tests | 2–3 days | P0 |
| **Phase 2** | AI client tests (with MSW mocks) + bookmark utils + search provider | 1–2 days | P0 |
| **Phase 3** | E2E auth flow + dashboard + navigation | 2–3 days | P0 |
| **Phase 4** | Component tests (layout, chat, dashboard, UI primitives) | 3–4 days | P1 |
| **Phase 5** | E2E chat, MCP, repos, settings | 2–3 days | P1 |
| **Phase 6** | DevTools component + E2E tests | 2 days | P1 |
| **Phase 7** | Forum, search, accessibility E2E tests | 2 days | P2 |
| **Phase 8** | Edge cases, error boundaries, corrupted state handling | 1–2 days | P2 |
| **Phase 9** | CI/CD pipeline + ALM Octane integration | 1 day | P0 |

**Total estimated effort: 16–22 days**

---

## Appendix A: Sample Page Object

```typescript
// tests/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly githubButton: Locator;
  readonly microsoftButton: Locator;
  readonly googleButton: Locator;
  readonly guestButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.githubButton = page.getByTestId('login-github');
    this.microsoftButton = page.getByTestId('login-microsoft');
    this.googleButton = page.getByTestId('login-google');
    this.guestButton = page.getByTestId('login-guest');
  }

  async loginAsGuest() {
    await this.guestButton.click();
    await this.page.waitForURL('**/');
  }
}
```

## Appendix B: Sample MSW Handler

```typescript
// tests/fixtures/msw-handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello from mock Anthropic!' }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 8 },
    });
  }),

  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{ message: { role: 'assistant', content: 'Hello from mock OpenAI!' } }],
    });
  }),
];
```
