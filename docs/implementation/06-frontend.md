# Phase 6: Frontend Integration - Desktop LaTeX Editor + SaaS Backend

## Overview

This phase integrates the existing Wails desktop LaTeX editor with the Phase 1-5 SaaS backend. The desktop app becomes a rich client that submits builds to the SaaS service with:

- **Clerk OAuth authentication** for SaaS access
- **Efficient delta-sync caching** to minimize upload payloads
- **Monorepo structure** for shared UI components (future web app)
- **Complete feature preservation** (local/remote compiler options remain)
- **SaaS dashboard** (build history, billing, account management)

**Architecture Decision**: Desktop app remains the primary editor; backend provides compilation service only. Web UI components are split out for potential future web application.

---

## Architecture Overview

### Deployment Model

```
┌─────────────────────────────────┐
│  Wails Desktop App (Go + React) │
│  ├─ Local/Remote Build Options  │  (PRESERVED)
│  ├─ Monaco Editor               │  (PRESERVED)
│  ├─ PDF Preview                 │  (PRESERVED)
│  └─ Clerk OAuth Integration     │  (NEW)
│         │
│         ├─ SaaS Backend (localhost:9000)
│         │   ├─ Clerk Auth verification
│         │   ├─ Build queue + Docker compilation
│         │   ├─ Artifact storage + signed URLs
│         │   └─ Billing (Razorpay)
│         │
│         └─ (Optional) Local Docker Renderer
│             └─ Direct LaTeX compilation
└─────────────────────────────────┘

Future: Web app reuses @treefrog/ui, @treefrog/services, @treefrog/hooks
```

### Monorepo Structure

```
treefrog/
├── pnpm-workspace.yaml
├── packages/                          # Shared code (NEW)
│   ├── types/                         # API & domain types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── api.ts                 # Backend response types
│   │       ├── build.ts               # Build/compilation
│   │       ├── user.ts                # User/subscription
│   │       ├── billing.ts             # Razorpay
│   │       └── cache.ts               # Delta-sync cache
│   │
│   ├── ui/                            # Shadcn/Radix components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Dialog.tsx
│   │       └── ... (30+ components)
│   │
│   ├── hooks/                         # Shared React hooks
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── useAuth.ts             # Clerk session
│   │       ├── useBuildCache.ts       # Delta-sync
│   │       └── useClerk.ts            # Auth helpers
│   │
│   └── services/                      # API service layer
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── apiClient.ts           # HTTP client
│           ├── buildService.ts        # Build endpoints
│           ├── userService.ts         # User endpoints
│           └── billingService.ts      # Subscription endpoints
│
├── frontend/                          # Desktop app (Wails)
│   ├── package.json                   # UPDATED: +workspace deps
│   ├── src/
│   │   ├── components/                # UPDATED: Import from @treefrog/ui
│   │   ├── hooks/                     # UPDATED: Import from @treefrog/hooks
│   │   ├── pages/
│   │   │   ├── Editor.tsx             # PRESERVED
│   │   │   ├── Settings.tsx           # ENHANCED: +auth tabs
│   │   │   ├── Home.tsx               # PRESERVED
│   │   │   ├── Auth.tsx               # NEW: Clerk login flow
│   │   │   ├── AuthCallback.tsx       # NEW: OAuth callback
│   │   │   ├── Dashboard.tsx          # NEW: Build history
│   │   │   ├── Build.tsx              # NEW: Build details
│   │   │   ├── Billing.tsx            # NEW: Subscription
│   │   │   └── Account.tsx            # NEW: User settings
│   │   ├── services/
│   │   │   ├── api.ts                 # UPDATED: Auth headers
│   │   │   ├── buildService.ts        # UPDATED: Delta-sync
│   │   │   └── buildServiceSaaS.ts    # NEW: SaaS-specific
│   │   ├── stores/
│   │   │   ├── appStore.ts            # PRESERVED: Compiler settings
│   │   │   ├── authStore.ts           # NEW: User session
│   │   │   └── cacheStore.ts          # NEW: Build cache
│   │   ├── utils/
│   │   │   ├── checksum.ts            # NEW: SHA256 hashing
│   │   │   └── projectId.ts           # NEW: Project ID generation
│   │   ├── router.tsx                 # UPDATED: Auth routes
│   │   └── main.tsx                   # UPDATED: ClerkProvider
│   ├── tsconfig.json                  # UPDATED: Path aliases
│   ├── vite.config.ts                 # UPDATED: Workspace resolution
│   └── index.html                     # PRESERVED
│
├── latex-compiler/                    # Backend (NO CHANGES)
├── wails/                             # Desktop bindings (MINOR UPDATES)
└── docs/implementation/               # This documentation
```

---

## Implementation Phases

### Phase 6.1: Monorepo Setup (2-3 hours)

**Goal**: Establish pnpm workspaces with shared packages.

**Deliverables**:
- ✅ `pnpm-workspace.yaml` configured
- ✅ `packages/types` with API type definitions
- ✅ `packages/hooks` with Clerk hooks
- ✅ `packages/services` with HTTP client
- ✅ `packages/ui` with Radix components
- ✅ `frontend/package.json` updated to reference workspace deps

**Key Files**:
```
✅ pnpm-workspace.yaml
✅ packages/types/package.json
✅ packages/types/src/api.ts
✅ packages/types/src/build.ts
✅ packages/types/src/user.ts
✅ packages/types/src/billing.ts
✅ packages/types/src/cache.ts
✅ packages/ui/package.json
✅ packages/ui/vite.config.ts
✅ packages/ui/src/index.ts
✅ packages/hooks/package.json
✅ packages/hooks/src/useAuth.ts
✅ packages/hooks/src/useBuildCache.ts
✅ packages/services/package.json
✅ packages/services/src/apiClient.ts
✅ packages/services/src/buildService.ts
📝 frontend/package.json
📝 frontend/vite.config.ts
📝 frontend/tsconfig.json
```

**Testing**:
```bash
pnpm install                    # Verify workspace links
pnpm build                      # Verify all packages build
pnpm -F frontend dev            # Verify desktop app runs
```

---

### Phase 6.2: Clerk OAuth Integration (3-4 hours)

**Goal**: Add Clerk authentication with OAuth browser redirect.

**Clerk Integration Flow**:
```
1. User clicks "Sign In" button
2. Wails calls OpenExternalURL() → Browser opens to Clerk login
3. User completes OAuth → Clerk redirects to http://localhost:5173/auth/callback?code=...
4. React captures code → Exchanges for Clerk session token
5. JWT stored in Zustand authStore + localStorage
6. Auto-refresh token 5 min before expiry
7. All API calls include: Authorization: Bearer {jwt}
```

**New Stores**:

```typescript
// authStore.ts - User session management
interface AuthState {
  user: ClerkUser | null
  sessionToken: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: () => void                    // Opens Clerk login in browser
  logout: () => void                   // Clears JWT
  refreshToken: () => Promise<void>    // Refresh JWT before expiry
  setUser: (user: ClerkUser) => void
}

// cacheStore.ts - Build cache state
interface BuildCacheEntry {
  path: string
  checksum: string                     // SHA256
  uploaded: boolean
  uploadedAt?: Date
  size: number
}

interface CacheState {
  projectId: string
  lastBuildId: string | null
  entries: Map<string, BuildCacheEntry>
  
  // Actions
  getChangedFiles: () => BuildCacheEntry[]
  updateEntry: (path, checksum, uploaded) => void
  getProjectCache: (projectId) => CacheState
  clear: () => void
}
```

**New Pages**:
- `/auth/login` - Clerk login button + redirect
- `/auth/callback` - OAuth callback handler
- Protected routes (redirect to `/auth/login` if not authenticated)

**Key Files**:
```
✅ frontend/src/pages/Auth.tsx
✅ frontend/src/pages/AuthCallback.tsx
✅ frontend/src/stores/authStore.ts
✅ frontend/src/stores/cacheStore.ts
✅ packages/hooks/src/useAuth.ts
✅ packages/hooks/src/useClerk.ts
📝 frontend/package.json (+@clerk/clerk-react)
📝 frontend/src/main.tsx (ClerkProvider wrapper)
📝 frontend/src/router.tsx (auth routes)
📝 frontend/src/services/api.ts (auth headers)
```

**Testing**:
```bash
pnpm -F frontend dev
# Navigate to localhost:5173
# Click "Sign In" → Browser opens
# Complete OAuth flow
# Verify JWT in localStorage
# Verify subsequent API calls have Authorization header
```

---

### Phase 6.3: Efficient Build Submission with Delta-Sync (4-5 hours)

**Goal**: Implement smart caching that only uploads changed files.

**Delta-Sync Strategy**:

```
Build Submission Flow:

1. User clicks "Build" in editor
2. Compute SHA256 checksum for each file in project
3. Compare against local cache (cacheStore)
4. Identify changed files only

5. POST /api/builds/init
   Request: { projectId, compilerSettings }
   Response: { buildId, existingFiles: {...} }

6. Determine upload set:
   - New files (not in server cache)
   - Modified files (checksum changed)
   - Skip unchanged files (use cached reference)

7. POST /api/builds/{buildId}/upload (multipart)
   - Upload only changed files
   - Include cached file checksums

8. POST /api/builds/{buildId}/compile
   - Start compilation with all files (changed + cached)

9. Poll: GET /api/builds/{buildId}/status
   - Until completed/failed

10. Download artifacts via signed URLs
    - GET /api/builds/{buildId}/artifacts/pdf/signed-url
    - Response: { url: "http://backend/artifacts/...?signature=...&expires=..." }

11. Update local cache with:
    - lastBuildId
    - File checksums
    - uploadedAt timestamps
```

**Project ID Computation** (for cache stability):
```typescript
// Hash project root path to create stable projectId
// Allows cache persistence across sessions
import { sha256 } from 'crypto-js'
const projectId = sha256(projectRootPath).toString()
```

**Cache Persistence** (localStorage):
```
Key: treefrog-build-cache-{projectId}
Value: { entries: Map<path, checksum>, lastBuildId, timestamp }
Cleanup: Remove entries older than 7 days
Max size: ~50MB (auto-prune if exceeded)
```

**Payload Reduction Example**:
```
First build: Upload 100 files = 50MB
Second build (1 file changed): Upload 1 file + checksums = 500KB
Result: 99% reduction in upload size
```

**Key Files**:
```
✅ packages/services/src/buildService.ts (Delta-sync API)
✅ frontend/src/services/buildServiceSaaS.ts (SaaS-specific)
✅ frontend/src/utils/checksum.ts (SHA256 computation)
✅ frontend/src/utils/projectId.ts (Project ID generation)
📝 frontend/src/hooks/useBuild.ts (Switch to delta-sync)
📝 frontend/src/pages/Editor.tsx (Show upload progress)
📝 packages/services/src/apiClient.ts (Multipart support)
```

**Testing**:
```bash
# Scenario 1: First build
# - 10 files uploaded
# - Verify all 10 in server cache

# Scenario 2: Edit 1 file, re-build
# - Only 1 file uploaded
# - Verify 99% payload reduction
# - Verify server merges cached + new files

# Scenario 3: New session
# - Cache miss on server
# - Re-upload all files (expected)
```

---

### Phase 6.4: SaaS Dashboard Pages (3-4 hours)

**Goal**: Create UI for build history, subscriptions, account management.

**New Pages**:

| Page | Purpose | Components |
|------|---------|------------|
| `/dashboard` | Build history + overview | BuildHistoryTable, StorageUsage, SubscriptionStatus |
| `/build/{id}` | Build details & logs | BuildLogs, ArtifactDownload, Duration |
| `/billing` | Subscription management | PlanComparison, RazorpayCheckout, CouponInput |
| `/account` | User settings | ProfileInfo, APITokens, Logout |

**Build History Dashboard**:
```tsx
- Table of recent builds (past 30 days)
- Columns: Date, Project, File, Engine, Status, Duration, Storage, Actions
- Filters: Status, Date range, Engine
- Sorting: Date (default), Status, Duration
- Pagination: 20 per page
- Real-time indicators (pending, compiling, completed, failed)
- Actions: View Logs, Download PDF, Delete, Copy URL

Data: GET /api/builds?limit=20&offset=0
Response: {
  builds: [{
    id, userId, projectId, mainFile, engine, status,
    createdAt, updatedAt, completedAt, storageBytes, logUrl
  }],
  total, page, limit
}
```

**Build Details Page**:
```tsx
- Build metadata: ID, Status, Engine, Shell-Escape, Time
- Compilation logs (monospace, colorized, scrollable)
- Artifacts section:
  - Download PDF button (signed URL)
  - Download SyncTeX button (if available)
  - View logs modal
- Actions: Delete, Share, Copy build ID
- TTL warning (if expiring soon)

Endpoints:
- GET /api/builds/{buildId}
- GET /api/builds/{buildId}/artifacts/pdf/signed-url
- GET /api/builds/{buildId}/artifacts/synctex/signed-url
- DELETE /api/builds/{buildId}
```

**Billing / Subscription Page**:
```tsx
- Current plan display
- Plan comparison table (Free/Pro/Enterprise):
  - Builds/month limit
  - Storage limit (1GB/10GB/100GB)
  - Price
  - Features checklist
- "Upgrade" button for each plan → Razorpay checkout
- Coupon input field
- Subscription history (past 12 months)
- Cancel subscription button (confirmation modal)

Endpoints:
- GET /api/user/subscription
- GET /api/subscriptions/plans
- POST /api/subscriptions/create (returns Razorpay order)
- POST /api/subscriptions/verify (handles payment)
- POST /api/coupons/validate
```

**Account Settings Page**:
```tsx
- User info: Name, Email, Plan, Storage used/limit
- API Token section:
  - Display token (masked)
  - Regenerate button (warning: breaks existing integrations)
  - Copy to clipboard
- Actions:
  - Change plan (redirect to /billing)
  - Download data export
  - Logout (clear JWT, redirect to /auth/login)
  - Delete account (warning modal, irreversible)
```

**Navigation Updates**:

```tsx
// Settings page - add tabs
const tabs: SettingsTab[] = [
  { id: "compiler", label: "LaTeX Compiler", icon: <Zap /> },    // EXISTING
  { id: "appearance", label: "Appearance", icon: <Palette /> },   // EXISTING
  { id: "account", label: "Account", icon: <User /> },            // NEW
  { id: "billing", label: "Subscription", icon: <CreditCard /> }, // NEW
]

// Toolbar - add user menu
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>
      {user?.profileImageUrl ? <img src={...} /> : <UserIcon />}
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>View Profile</DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
      Build History
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/billing')}>
      Billing
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Key Files**:
```
✅ frontend/src/pages/Dashboard.tsx
✅ frontend/src/pages/Build.tsx
✅ frontend/src/pages/Billing.tsx
✅ frontend/src/pages/Account.tsx
✅ frontend/src/components/BuildHistoryTable.tsx
✅ frontend/src/components/StorageUsageWidget.tsx
✅ frontend/src/components/SubscriptionStatusCard.tsx
✅ frontend/src/components/PlanComparisonTable.tsx
✅ frontend/src/components/RazorpayCheckout.tsx
✅ frontend/src/components/UserMenu.tsx
📝 frontend/src/router.tsx (Add routes)
📝 frontend/src/pages/Settings.tsx (Add tabs)
📝 frontend/src/components/Toolbar.tsx (Add user menu)
```

**Testing**:
```bash
# Navigation
- Click "Dashboard" → View build history
- Click build row → View details
- Click "Download PDF" → Verify download works
- Click user avatar → Dropdown shows account options

# Billing
- Click "Upgrade Pro" → Razorpay modal opens
- Complete test payment → Subscription updates
- Verify build limits updated

# Account
- View current plan and storage
- Regenerate API token → New token works
- Logout → Redirects to /auth/login
```

---

### Phase 6.5: Artifact Download & Signed URLs (2-3 hours)

**Goal**: Secure, time-bound artifact delivery.

**Signed URL Flow**:

```typescript
// Backend: Generate signed URL (already implemented in Phase 4)
GET /api/builds/{buildId}/artifacts/pdf/signed-url?expires=300
Response: { url: "http://backend/artifacts/...?signature=xyz&expires=..." }

// Frontend: Download artifact
const downloadArtifact = async (buildId: string, type: 'pdf' | 'logs') => {
  const { url } = await fetch(`/api/builds/${buildId}/artifacts/${type}/signed-url`)
    .then(r => r.json())
  window.open(url, '_blank')  // Browser downloads file
}

// Backend: Verify and stream
GET /artifacts/{buildId}/pdf?signature=xyz&expires=...
- Verify HMAC-SHA256 signature matches
- Check if token expired
- Stream file with Content-Disposition: attachment; filename="build.pdf"
```

**Key Features**:
- 5-minute expiry (configurable)
- HMAC-SHA256 signature verification
- Content-Disposition headers for download
- No direct file access (only via signed URLs)

**Key Files**:
```
📝 frontend/src/pages/Build.tsx (Add download buttons)
📝 frontend/src/components/BuildHistoryTable.tsx (Add action links)
```

**Testing**:
```bash
# Build project → Generate artifact
# Navigate to /build/{id}
# Click "Download PDF" → Browser downloads build.pdf
# Verify file contains valid PDF
# Wait 5+ minutes → Click download again → Get 401 (expired)
# Generate new signed URL → Download works
```

---

## Feature Preservation & Regression Prevention

### Current Features to Preserve

| Feature | Location | Preservation Strategy | Risk |
|---------|----------|----------------------|------|
| Local Docker Renderer | Settings | Keep unchanged, new auth tabs don't affect | Low |
| Remote Compiler Override | appStore | Still supported in fallback path | Low |
| Build Options (Engine, Shell-Escape) | BuildButton | Preserve exactly | Low |
| File Browser | Sidebar | No changes | Low |
| Monaco Editor | EditorPane | No changes | Low |
| PDF Preview | PreviewPane | No changes | Low |
| Git Integration | gitService | No changes | Low |
| Settings UI | Settings page | Add new tabs, don't modify existing | Low |

### Regression Testing Checklist

```
EDITOR FUNCTIONALITY
□ Open project from file picker
□ Edit .tex file → Content saved
□ Build with pdflatex/xelatex/lualatex
□ Build with shell-escape enabled/disabled
□ SyncTeX click-to-source works
□ PDF preview renders

BUILD OPTIONS
□ BuildButton dropdown shows engines
□ Engine changes persist
□ Shell-escape toggle works
□ Recent options remembered

LOCAL RENDERER
□ Start/stop Docker renderer
□ Status indicator updates
□ Port configuration works
□ Auto-start toggle works

CUSTOM COMPILER
□ Set custom compiler URL (no SaaS)
□ Build using custom compiler
□ Verify falls back to old flow

FILES & PROJECT
□ Create/rename/delete files
□ Create/rename/delete directories
□ Drag-drop files works
□ Context menu works
□ File tree search works

GIT INTEGRATION
□ View git status
□ Commit changes
□ Push/pull operations

APPEARANCE
□ Theme toggle (light/dark/system) works
□ Theme persists across sessions
```

### Backward Compatibility Strategy

1. **Dual Build Paths**:
   - If user logged in + SaaS enabled → Use delta-sync path
   - If user not logged in OR custom compiler → Use old zip-upload path

2. **Preserve All Existing Stores**:
   - Don't modify `appStore.ts` compiler/renderer fields
   - New stores: `authStore.ts`, `cacheStore.ts`

3. **Service Routing Logic**:
   ```typescript
   // buildService.ts
   export async function triggerBuild(file, engine, shell) {
     if (isLoggedIn && useSaaSBackend) {
       return buildServiceSaaS(file, engine, shell)  // Delta-sync
     } else {
       return buildServiceLegacy(file, engine, shell)  // Old flow
     }
   }
   ```

4. **Feature Flags** (optional, for safe rollout):
   ```bash
   VITE_USE_SAAS_BUILD_SERVICE=true|false
   ```

---

## Frontend Environment Variables

```bash
# Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# API Configuration
VITE_API_URL=http://localhost:9000/api
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_USE_SAAS_BUILD_SERVICE=true
VITE_ENABLE_BUILD_CACHE=true

# Logging
VITE_LOG_LEVEL=debug|info|warn|error
```

---

## Component Architecture

### Shared Packages

**@treefrog/types** - Type definitions
```typescript
// api.ts - Backend response types
export interface BuildResponse {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  artifacts?: { pdf_url: string; log_url: string }
}

// user.ts - User data
export interface UserResponse {
  id: string
  email: string
  name: string
  tier: 'free' | 'pro' | 'enterprise'
  storage_used_bytes: number
  storage_limit_bytes: number
}

// billing.ts - Razorpay types
export interface SubscriptionResponse {
  id: string
  plan_id: string
  status: 'active' | 'cancelled' | 'expired'
  current_period_end: string
  amount_paid: number
}

// cache.ts - Build cache
export interface CacheEntry {
  path: string
  checksum: string
  uploaded: boolean
  size: number
}
```

**@treefrog/hooks** - Shared React hooks
```typescript
// useAuth.ts - Clerk integration
export function useAuth() {
  const { isSignedIn, user, getToken } = useClerkAuth()
  const { sessionToken, setSessionToken } = useAuthStore()
  
  return { isSignedIn, user, sessionToken, getToken }
}

// useBuildCache.ts - Cache management
export function useBuildCache(projectId: string) {
  const { getProjectCache, updateCache } = useCacheStore()
  
  return {
    getChangedFiles: () => { /* ... */ },
    updateCache: () => { /* ... */ }
  }
}
```

**@treefrog/services** - API service layer
```typescript
// apiClient.ts - Base HTTP client
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use(config => {
  const token = authStore.sessionToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// buildService.ts - Build operations
export async function initBuild(projectId: string) { /* ... */ }
export async function uploadFiles(buildId: string, files: File[]) { /* ... */ }
export async function compileBuild(buildId: string, options) { /* ... */ }
export async function getBuildStatus(buildId: string) { /* ... */ }
```

---

## Testing Strategy

### Unit Tests
```bash
# Test individual utilities
pnpm -F frontend test

# Cache hit/miss logic
pnpm -F frontend test -- useCache.test.ts

# Checksum computation
pnpm -F frontend test -- checksum.test.ts

# Auth token refresh
pnpm -F frontend test -- authStore.test.ts
```

### Integration Tests
```bash
# Full build flow with caching
# Full auth flow with OAuth
# Full artifact download flow
```

### E2E Tests (Manual)
```bash
# 1. Desktop app → Sign in → Build → Download PDF
# 2. Edit file → Re-build → Verify upload size reduced
# 3. Upgrade subscription → Razorpay → Verify limits updated
# 4. Local renderer still works
# 5. Custom compiler URL still works
```

---

## Rollout Plan

### Phase 6.1-6.2: Auth Setup (Week 1)
- Monorepo configured
- Clerk OAuth working
- Protected routes in place

### Phase 6.3: Build System (Week 2)
- Delta-sync caching implemented
- Build uploads working
- Payload reduction verified

### Phase 6.4: Dashboard (Week 3)
- Dashboard pages created
- Build history visible
- Subscription management working

### Phase 6.5: Polish (Week 4)
- Artifact downloads working
- All pages styled
- Regression testing complete

### Deployment
```bash
# Desktop app
make build-all  # macOS, Windows, Linux binaries

# Backend (already deployed)
docker build -t treefrog-compiler .
docker run -p 9000:9000 treefrog-compiler
```

---

## Next Steps

1. ✅ Read this document (Phase 6.md)
2. → Start Phase 6.1 (Monorepo Setup)
3. → Continue with Phase 6.2-6.5 in sequence
4. → Run full regression test suite before release
5. → Deploy to users

---

## Troubleshooting

### Common Issues

**Q: Clerk login not working**
- A: Verify VITE_CLERK_PUBLISHABLE_KEY is set
- A: Check Clerk dashboard allows localhost:5173 as redirect URL

**Q: Build cache not persisting**
- A: Check localStorage quota (usually 5-10MB per domain)
- A: Verify projectId is consistent across sessions

**Q: Artifact download fails**
- A: Verify signed URL endpoint returns valid URL
- A: Check URL signature is not tampered with

**Q: Regression: local renderer not working**
- A: Verify appStore still has renderer settings
- A: Check rendererService is unchanged

---

## References

- Clerk React SDK: https://clerk.com/docs/references/react/clerk-provider
- Razorpay Checkout: https://razorpay.com/docs/payments/checkout
- Vite Workspaces: https://vitejs.dev/guide/env-and-modes.html
- Wails OAuth: https://wails.io/docs/reference/runtime/browser
