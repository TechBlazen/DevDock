# Role-Based Access Control (RBAC) Documentation

## Overview
This application uses a three-tier role-based access control system with distinct permissions for each group.

## User Roles

### 1. Admin
**Full administrative access to the entire application**

- **Pages**: Access to all pages (`*`)
- **Widgets**: Can view and use all widgets (`*`)
- **Plugins**: Can use all plugins (`*`)
- **Capabilities**:
  - ✅ Manage users (add, remove, edit roles)
  - ✅ Manage plugins (enable/disable)
  - ✅ **Add and remove widgets** (Dashboard management)
  - ✅ Edit documentation
  - ✅ Access terminal
  - ✅ Access network scanning

**Display Label**: Admin  
**Color**: `#ef4444` (Red)

---

### 2. Contributor (Editor)
**Can use all features but cannot manage widgets or plugins**

- **Pages**: Access to most pages:
  - `/` (Dashboard)
  - `/github` (GitHub Repos)
  - `/ado` (Azure DevOps)
  - `/mcp` (MCP Servers)
  - `/telemetry` (Observability)
  - `/catalog` (Widget Catalog - view only)
  - `/scaffold` (Scaffold)
  - `/docs` (Documentation)
  - `/network` (Network)
  - `/plugins` (Plugins - view only)
  
- **Widgets**: Can view and use all widgets (`*`)
- **Plugins**: Can use all plugins (`*`)
- **Capabilities**:
  - ❌ Cannot manage users
  - ❌ **Cannot manage plugins** (enable/disable)
  - ❌ **Cannot add or remove widgets**
  - ✅ Edit documentation
  - ✅ Access terminal
  - ✅ Access network scanning

**Display Label**: Contributor  
**Color**: `#3b82f6` (Blue)

---

### 3. Reader (Viewer)
**Read-only access to most content**

- **Pages**: Limited page access:
  - `/` (Dashboard)
  - `/github` (GitHub Repos)
  - `/ado` (Azure DevOps)
  - `/telemetry` (Observability)
  - `/catalog` (Widget Catalog - view only)
  - `/docs` (Documentation)
  
- **Widgets**: Limited widgets:
  - `repos_github`
  - `repos_ado`
  - `telemetry`
  - `activity_feed`
  
- **Plugins**: Can use all plugins (`*`)
- **Capabilities**:
  - ❌ Cannot manage users
  - ❌ Cannot manage plugins
  - ❌ Cannot add or remove widgets
  - ❌ Cannot edit documentation
  - ❌ Cannot access terminal
  - ❌ Cannot access network scanning

**Display Label**: Reader  
**Color**: `#10b981` (Green)

---

## Widget and Plugin Management Restrictions

### Widget Management (Admin Only)
Only users with the **Admin** role can:
- Add widgets to the dashboard via the "Add Widget" placeholder
- Remove widgets from the dashboard using the X button in edit mode
- Toggle widgets in the Widget Catalog page

**UI Enforcement**:
- Non-admin users will see a warning message on the Catalog page
- Add/Remove buttons are disabled for Contributors and Readers
- The "Add Widget" placeholder only appears for Admins in edit mode

### Plugin Management (Admin Only)
Only users with the **Admin** role can:
- Enable or disable plugins via toggle switches
- Modify plugin settings

**UI Enforcement**:
- Non-admin users will see a warning message on the Plugins page
- Toggle switches are disabled for Contributors and Readers

---

## Implementation Details

### Key Files
1. **`src/lib/rbac.ts`** - Role definitions and permission checks
2. **`src/components/dashboard/DashboardGrid.tsx`** - Dashboard widget management
3. **`src/pages/CatalogPage.tsx`** - Widget catalog
4. **`src/pages/PluginsPage.tsx`** - Plugin management
5. **`src/pages/UsersPage.tsx`** - User management (Admin only)
6. **`src/store/index.ts`** - User account store

### Permission Check Functions
```typescript
// Check if user can access a page
canAccessPage(permissions: Permission, path: string): boolean

// Check if user can view a widget
canAccessWidget(permissions: Permission, widgetId: string): boolean

// Check if user can use a plugin
canAccessPlugin(permissions: Permission, pluginId: string): boolean
```

### Default Seed Accounts

#### Admin Account
- **Username**: `admin`
- **Password**: `admin`
- **Role**: Admin
- **Email**: `admin@forgeportal.dev`

#### Editor/Contributor Account
- **Username**: `editor`
- **Password**: `workbench`
- **Role**: Contributor (Editor)
- **Email**: `editor@forgeportal.dev`

#### Reader/Viewer Account
- **Username**: `reader`
- **Password**: `workbench`
- **Role**: Reader (Viewer)
- **Email**: `reader@forgeportal.dev`

---

## Usage

### Checking User Role in Components
```typescript
import { useAuthStore } from '../store';

const currentUser = useAuthStore((s) => s.user);
const isAdmin = currentUser?.role === 'admin';
```

### Restricting UI Elements
```typescript
{isAdmin && (
  <button onClick={handleAddWidget}>Add Widget</button>
)}
```

### Displaying Role-Based Messages
```typescript
{!isAdmin && (
  <div className="warning-message">
    Only administrators can add or remove widgets.
  </div>
)}
```

---

## Future Enhancements
- Fine-grained widget permissions (allow specific widgets per role)
- Custom roles with granular permissions
- Audit logging for admin actions
- Role hierarchy and inheritance
