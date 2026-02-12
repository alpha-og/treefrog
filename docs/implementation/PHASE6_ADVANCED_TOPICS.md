# Phase 6 Advanced Topics

Deep-dive documentation for complex Phase 6 components.

## Table of Contents

1. [Delta-Sync Caching Strategy](#delta-sync-caching-strategy)
2. [Monorepo Architecture](#monorepo-architecture)
3. [API Client Design](#api-client-design)
4. [Storage Management](#storage-management)
5. [Wails Integration](#wails-integration)

---

## Delta-Sync Caching Strategy

### Problem Statement

**Current Desktop App**: Uploads entire project ZIP (~50MB) for each build
**Goal**: Upload only changed files, reducing payload by 99% on subsequent builds

### Solution: Project-Scoped Cache with Checksums

```
Architecture:

┌─────────────────────────────────────────────────────────────┐
│ Desktop App (Wails)                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User edits project                                     │
│  2. Compute checksums: { "main.tex": "sha256...", ... }   │
│  3. Compare vs cached: Is changed?                         │
│  4. Upload only changed files                              │
│  5. Backend: Merge cached + new files                      │
│  6. Compile                                                │
│  7. Update local cache with new checksums                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Storage:                                                    │
│                                                             │
│ localStorage:                                              │
│   treefrog-build-cache-{projectId}: {                     │
│     entries: [                                             │
│       { path: "main.tex", checksum: "abc...", uploaded: true },
│       { path: "chap1.tex", checksum: "def...", uploaded: true }
│     ],                                                      │
│     lastBuildId: "build-123",                             │
│     projectId: "hash-of-root-path",                       │
│     timestamp: 1707...                                     │
│   }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        ↓ API Call
┌─────────────────────────────────────────────────────────────┐
│ Backend (Go)                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Cache Storage (per project):                               │
│   {                                                         │
│     "main.tex": { checksum: "abc...", size: 1024 },       │
│     "chap1.tex": { checksum: "def...", size: 2048 }       │
│   }                                                         │
│                                                             │
│ Build Flow:                                                │
│   1. Accept: main.tex, chap1.tex (new: intro.tex)         │
│   2. Validate checksums for main.tex, chap1.tex           │
│   3. Merge with cache: { main, chap1, intro }             │
│   4. Compile: 3 files                                      │
│   5. Store checksums: intro.tex added to cache            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Checksum Computation

**SHA256 for File Identity**:
```typescript
// Only changed if content bytes differ
const checksum = sha256(fileContent).toString()

Example:
File: main.tex
Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

If changed:
Checksum: "d4735fcea82c0fca63c8d23f38b40e44e6a4d2c00a22fe14f4c2e4f0a14d0fb"
```

**Project ID Generation** (Stable across sessions):
```typescript
// Hash project root path to create projectId
// Enables cache persistence across app restarts
const projectId = sha256(projectRootPath).toString().substring(0, 16)

Example:
Path: /Users/alice/projects/thesis
ProjectId: "e3b0c44298fc1c14"

Always same for same path:
/Users/alice/projects/thesis → e3b0c44298fc1c14 (deterministic)
/Users/alice/projects/cv → 9f86d081884c7d6d (different)
```

### Build Submission Flow (Detailed)

```
Step 1: Initialize Build
┌─ POST /api/builds/init
├─ Request: {
│    userId: "user_2ABC123",
│    projectId: "e3b0c442",
│    projectName: "thesis",
│    compilerSettings: {
│      engine: "pdflatex",
│      shellEscape: false,
│      mainFile: "main.tex"
│    }
│  }
├─ Response: {
│    buildId: "build-xyz123",
│    existingFiles: {
│      "main.tex": { checksum: "abc123", size: 1024 },
│      "chap1.tex": { checksum: "def456", size: 2048 }
│    }
│  }
└─ Client: Store buildId for next steps

Step 2: Determine Delta
┌─ Local cache has: { main.tex: "abc123", chap1.tex: "def456", chap2.tex: "old789" }
├─ Project files now: { main.tex: "abc123", chap1.tex: "NEW999", intro.tex: "fresh111" }
├─ Analysis:
│   main.tex:   SAME (checksum "abc123" unchanged)    → Skip upload
│   chap1.tex:  CHANGED (was "def456", now "NEW999") → Upload
│   chap2.tex:  DELETED                               → Skip (server keeps or logs)
│   intro.tex:  NEW (not in cache or local)          → Upload
├─ Upload set: [ chap1.tex, intro.tex ]
└─ Cached set: { main.tex: "abc123" }

Step 3: Upload Changed Files
┌─ POST /api/builds/{buildId}/upload (multipart)
├─ Form data:
│   files[0]: chap1.tex (binary)
│   files[1]: intro.tex (binary)
│   metadata: {
│     cachedFiles: { main.tex: "abc123" },
│     compilerSettings: { ... }
│   }
├─ Server receives:
│   - Verify 2 uploaded files
│   - Verify cache integrity: main.tex matches "abc123"
│   - Store all 3 files in build directory
├─ Response: {
│    buildId: "build-xyz123",
│    uploadedFiles: 2,
│    cachedFiles: 1,
│    totalSize: 4096,
│    status: "uploaded"
│  }
└─ Payload saved: 50MB → 300KB (99.4% reduction!)

Step 4: Start Compilation
┌─ POST /api/builds/{buildId}/compile
├─ Request: {
│    mainFile: "main.tex",
│    engine: "pdflatex",
│    shellEscape: false
│  }
├─ Backend: latexmk compile in build directory with all 3 files
├─ Response: {
│    buildId: "build-xyz123",
│    status: "queued"
│  }
└─ Client: Start polling status

Step 5: Poll Status
┌─ GET /api/builds/{buildId}/status (every 2 seconds)
├─ Response: {
│    buildId: "build-xyz123",
│    status: "running|completed|failed",
│    progress: { percent: 50, stage: "compiling" },
│    startedAt: "2025-02-12T10:00:00Z"
│  }
└─ Repeat until status !== "running"

Step 6: On Completion
┌─ Status: "completed"
├─ Artifacts available:
│   - /api/builds/{buildId}/artifacts/pdf/signed-url
│   - /api/builds/{buildId}/artifacts/synctex/signed-url
│   - /api/builds/{buildId}/artifacts/logs
└─ Client: Update cache with new checksums + buildId

Step 7: Update Local Cache
┌─ Update cacheStore:
│   projectId: "e3b0c442",
│   lastBuildId: "build-xyz123",
│   entries: {
│     main.tex: { checksum: "abc123", uploaded: true },
│     chap1.tex: { checksum: "NEW999", uploaded: true },
│     intro.tex: { checksum: "fresh111", uploaded: true }
│   }
├─ Serialize to localStorage
└─ Next build will compare against these checksums
```

### Performance Analysis

**Example Project**:
```
100 files, 50MB total
First build:  Upload 100 files = 50MB (full project)
Second build: Edit 1 file → Upload 1 file = 500KB
Reduction: 99%

Breakdown:
- Compute checksums: 500ms (CPU-bound)
- Compare vs cache: 50ms (in-memory)
- Upload 1 file: 2-5 seconds (network)
- Backend merge: 100ms
- Compilation: 30-60 seconds
Total: ~40 seconds (vs 60-120 seconds with full re-upload)
```

### Cache Eviction & Cleanup

**localStorage Limitations**:
- Typical quota: 5-10MB per domain
- Our cache: JSON serialized (30-50% overhead vs binary)
- Max projects: ~2-3 large projects or 5-10 small projects

**Cleanup Strategy**:
```typescript
// Auto-cleanup in cacheStore.ts
function evictOldEntries() {
  const allProjects = getAllCacheKeys()
  const totalSize = allProjects.reduce((sum, key) => 
    sum + getStorageSize(key), 0
  )
  
  if (totalSize > 4MB) {
    // Remove projects not used in 7 days
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    
    allProjects.forEach(key => {
      const cache = deserialize(localStorage.getItem(key))
      if (cache.timestamp < weekAgo) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Call on app startup and after each build
```

### Error Handling & Recovery

**Checksum Mismatch** (file corrupted during transfer):
```typescript
// Backend validates upload checksums
POST /api/builds/{buildId}/upload
├─ Client sends: files + checksums
├─ Backend computes checksums
├─ If mismatch:
│   Status: 400 Bad Request
│   Message: "File main.tex checksum mismatch. Expected: abc, Got: xyz"
│   Action: Retry upload
└─ If all valid: Status: 200 OK
```

**Cache Invalidation** (user modifies localStorage):
```typescript
// Fallback: Re-upload on verification failure
if (!verifyChecksum(file, expectedChecksum)) {
  console.warn(`Checksum mismatch for ${file}. Re-uploading.`)
  // Mark entry as not uploaded in cache
  cacheStore.updateEntry(file, newChecksum, false)
  // Re-upload on next build
}
```

**Network Failure** (upload interrupted):
```typescript
// Partial upload handling
POST /api/builds/{buildId}/upload
├─ Network error → Status: 0 (no response)
├─ Backend: Partial files stored with marker
├─ Client: Retry entire upload (idempotent)
└─ Backend deduplicates on retry
```

---

## Monorepo Architecture

### pnpm Workspaces

**Root `pnpm-workspace.yaml`**:
```yaml
packages:
  - 'packages/*'
  - 'frontend'

# Monorepo-level dependencies (optional)
# shared: true  # Share node_modules at root

# Dependency hoisting (auto-enabled)
# pnpm uses symlinks to avoid duplication
```

**Directory Structure**:
```
treefrog/
├── node_modules/ (shared across all packages)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml (single lock file for all packages)
│
├── packages/
│   ├── types/
│   │   ├── node_modules/ → symlink to root
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── hooks/
│   │   ├── node_modules/ → symlink to root
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── services/
│   │   ├── node_modules/ → symlink to root
│   │   ├── package.json
│   │   └── src/
│   │
│   └── ui/
│       ├── node_modules/ → symlink to root
│       ├── package.json
│       └── src/
│
├── frontend/
│   ├── node_modules/ → symlink to root
│   ├── package.json
│   └── src/
│
└── latex-compiler/
    ├── (unchanged, not in workspace)
```

### Package Dependencies

**Dependency Graph**:
```
@treefrog/types
  ↑ (imported by)
├─ @treefrog/services
├─ @treefrog/hooks
├─ @treefrog/ui
└─ frontend

@treefrog/hooks
  ↑
├─ @treefrog/services
└─ frontend

@treefrog/services
  ↑
└─ frontend

@treefrog/ui
  ↑
└─ frontend
```

**package.json Definitions**:

```json
// packages/types/package.json
{
  "name": "@treefrog/types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}

// packages/services/package.json
{
  "name": "@treefrog/services",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "vite build --mode lib"
  },
  "dependencies": {
    "@treefrog/types": "workspace:*",
    "axios": "^1.13.4"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "vite": "^5.3.4",
    "typescript": "^5.5.4"
  }
}

// frontend/package.json
{
  "name": "treefrog-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@treefrog/types": "workspace:*",
    "@treefrog/services": "workspace:*",
    "@treefrog/hooks": "workspace:*",
    "@treefrog/ui": "workspace:*",
    // ... other deps
  }
}
```

### Build & Development

**Development Mode**:
```bash
# Install all dependencies
pnpm install

# Watch all packages
pnpm -r watch

# Dev server (frontend only)
pnpm -F frontend dev

# Or in individual package:
cd packages/types && pnpm build
```

**Production Build**:
```bash
# Build all packages in dependency order
pnpm -r build

# Verify outputs
ls packages/types/dist
ls packages/services/dist
ls packages/hooks/dist
ls packages/ui/dist

# Build desktop app
pnpm -F frontend build
```

### TypeScript Path Aliases

**`frontend/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@treefrog/types": ["../packages/types/src"],
      "@treefrog/services": ["../packages/services/src"],
      "@treefrog/hooks": ["../packages/hooks/src"],
      "@treefrog/ui": ["../packages/ui/src"]
    }
  }
}
```

**`packages/*/tsconfig.json`** (example for services):
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

---

## API Client Design

### Base HTTP Client

**`packages/services/src/apiClient.ts`**:
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import { AuthState } from '@treefrog/types'

class ApiClient {
  private client: AxiosInstance
  private authStore: AuthState  // Reference to Zustand store
  
  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      config => {
        const token = this.authStore.sessionToken
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      error => Promise.reject(error)
    )
    
    // Response interceptor: Handle 401, rate limiting
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    )
  }
  
  private handleError(error: AxiosError) {
    const status = error.response?.status
    
    if (status === 401) {
      // Token expired or invalid
      this.authStore.clearSession()
      window.location.href = '/auth/login'
      return Promise.reject(new Error('Unauthorized. Please sign in again.'))
    }
    
    if (status === 429) {
      // Rate limited
      const retryAfter = error.response?.headers['retry-after'] || 60
      return Promise.reject(new Error(`Rate limited. Retry after ${retryAfter}s`))
    }
    
    if (status === 403) {
      // Forbidden (insufficient permissions)
      return Promise.reject(new Error('Insufficient permissions'))
    }
    
    return Promise.reject(error)
  }
  
  // Type-safe GET
  get<T>(url: string): Promise<T> {
    return this.client.get(url).then(r => r.data)
  }
  
  // Type-safe POST
  post<T>(url: string, data?: any): Promise<T> {
    return this.client.post(url, data).then(r => r.data)
  }
  
  // Multipart upload with progress
  uploadFiles<T>(
    url: string,
    files: File[],
    metadata?: any,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    const formData = new FormData()
    
    // Add files
    files.forEach(file => {
      formData.append('files', file)
    })
    
    // Add metadata
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }
    
    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        const percent = Math.round((event.loaded * 100) / event.total)
        onProgress?.(percent)
      }
    }).then(r => r.data)
  }
}

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:9000/api'
)
```

### Service Methods

**`packages/services/src/buildService.ts`**:
```typescript
import { apiClient } from './apiClient'
import { BuildResponse, BuildCacheEntry } from '@treefrog/types'

export class BuildService {
  async initBuild(projectId: string, settings: any) {
    return apiClient.post<{
      buildId: string
      existingFiles: Record<string, { checksum: string; size: number }>
    }>('/builds/init', {
      projectId,
      ...settings
    })
  }
  
  async uploadFiles(
    buildId: string,
    files: File[],
    cachedFiles: Map<string, string>,
    onProgress?: (percent: number) => void
  ) {
    return apiClient.uploadFiles(
      `/builds/${buildId}/upload`,
      files,
      { cachedFiles: Object.fromEntries(cachedFiles) },
      onProgress
    )
  }
  
  async startCompile(buildId: string, options: any) {
    return apiClient.post(`/builds/${buildId}/compile`, options)
  }
  
  async getStatus(buildId: string) {
    return apiClient.get<BuildResponse>(`/builds/${buildId}/status`)
  }
  
  async getSignedUrl(buildId: string, artifactType: 'pdf' | 'logs') {
    return apiClient.get<{ url: string }>(
      `/builds/${buildId}/artifacts/${artifactType}/signed-url`
    )
  }
}

export const buildService = new BuildService()
```

---

## Storage Management

### localStorage Usage

**Cache Storage Layout**:
```typescript
// Individual caches (one per project)
localStorage['treefrog-build-cache-e3b0c44298fc1c14'] = JSON.stringify({
  projectId: 'e3b0c44298fc1c14',
  projectName: 'thesis',
  projectRoot: '/Users/alice/projects/thesis',
  entries: [
    {
      path: 'main.tex',
      checksum: 'abc123...',
      uploaded: true,
      uploadedAt: '2025-02-12T10:00:00Z',
      size: 1024
    },
    // ... more files
  ],
  lastBuildId: 'build-xyz123',
  timestamp: 1707726000000
})

// User session (single, shared)
localStorage['treefrog-auth'] = JSON.stringify({
  userId: 'user_2ABC123',
  email: 'alice@example.com',
  sessionToken: 'eyJhbGc...',
  tokenExpiresAt: 1707729600000,
  // ... user data
})

// UI state (theme, layout)
localStorage['treefrog-app'] = JSON.stringify({
  theme: 'dark',
  sidebarWidth: 250,
  // ... other settings
})
```

**Storage Quota**:
```
Typical browser quota: 5-10MB per domain
treefrog cache usage estimation:
- Project cache (avg): ~500KB per project (100 files, checksums)
- Max projects: ~10-20 before hitting limit
- Auto-cleanup: Remove unused projects after 7 days
```

**Serialization Helpers**:
```typescript
// packages/services/src/storage.ts
export interface CacheState {
  projectId: string
  entries: Map<string, BuildCacheEntry>
  lastBuildId: string | null
  timestamp: number
}

export function serializeCache(state: CacheState): string {
  return JSON.stringify({
    projectId: state.projectId,
    entries: Array.from(state.entries.entries()),
    lastBuildId: state.lastBuildId,
    timestamp: state.timestamp
  })
}

export function deserializeCache(json: string): CacheState {
  const data = JSON.parse(json)
  return {
    projectId: data.projectId,
    entries: new Map(data.entries),
    lastBuildId: data.lastBuildId,
    timestamp: data.timestamp
  }
}

export function getStorageSize(key: string): number {
  const item = localStorage.getItem(key)
  return new Blob([item || '']).size
}

export function getTotalStorageSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('treefrog-')) {
      total += getStorageSize(key)
    }
  }
  return total
}
```

---

## Wails Integration

### Browser URL Opening (OAuth Flow)

**Wails Go Bindings** (already in `wails/bindings.go`):
```go
// OpenExternalURL opens URL in default browser
func (a *App) OpenExternalURL(url string) error {
    return a.ctx.OpenExternalURL(url)
}
```

**React Frontend Usage**:
```typescript
// packages/hooks/src/useClerk.ts
import { getWailsApp, isWails } from '@/utils/env'

export function useClerk() {
  const openLoginFlow = async () => {
    if (isWails()) {
      // Desktop: Open browser to Clerk login
      const app = getWailsApp()
      await app?.OpenExternalURL('http://localhost:5173/auth/login')
    } else {
      // Web: Navigate directly
      window.location.href = '/auth/login'
    }
  }
  
  return { openLoginFlow }
}
```

### Session Token Passing (Desktop to Browser)

**Challenge**: Desktop app (Wails) runs in embedded browser. Session token from OAuth callback needs to reach Wails Go code.

**Solution**: Use localStorage + Event Listener:

```typescript
// In /auth/callback page after OAuth succeeds
export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      // 1. Get Clerk session token
      const token = await clerk.session?.getToken()
      
      // 2. Store in localStorage (visible to all windows)
      localStorage.setItem('treefrog-auth-token', token)
      
      // 3. Dispatch custom event for Wails
      window.dispatchEvent(new CustomEvent('auth-success', { detail: { token } }))
      
      // 4. Redirect to dashboard
      setTimeout(() => navigate('/dashboard'), 500)
    }
    
    handleCallback()
  }, [])
  
  return <div>Signing in...</div>
}

// In Wails Go: Optional polling if needed
// But usually Go doesn't need token (request goes through browser context)
```

### File Operations (Project Selection)

**Wails Go Bindings** (existing):
```go
// OpenProjectDialog opens native file picker
func (a *App) OpenProjectDialog() (string, error) {
    // Show macOS/Windows/Linux native file dialog
    return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
        Title: "Select LaTeX Project",
    })
}
```

**React Frontend**:
```typescript
// frontend/src/hooks/useProject.ts
import { getWailsApp, isWails } from '@/utils/env'
import { useAppStore } from '@/stores/appStore'

export function useProject() {
  const { setCurrentProject } = useAppStore()
  
  const selectProject = async () => {
    if (isWails()) {
      const app = getWailsApp()
      const path = await app?.OpenProjectDialog()
      if (path) {
        setCurrentProject(path)
        generateProjectId(path)  // For caching
      }
    } else {
      // Web mode: use HTML file picker
      const input = document.createElement('input')
      input.type = 'file'
      input.webkitdirectory = true
      input.onchange = (e) => {
        const files = e.target.files
        // Handle web file upload
      }
      input.click()
    }
  }
  
  return { selectProject }
}
```

### Environment Detection

**`frontend/src/utils/env.ts`** (updated):
```typescript
export function isWails(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).runtime !== undefined
}

export function getWailsApp() {
  if (!isWails()) return null
  return (window as any).go?.main?.App
}

export function getEnvironment(): 'wails' | 'web' | 'electron' {
  if (isWails()) return 'wails'
  if (typeof window !== 'undefined' && (window as any).electron) {
    return 'electron'
  }
  return 'web'
}
```

---

## Performance Optimization

### Checksum Computation Parallelization

**Web Workers** (optional, for large projects):
```typescript
// frontend/src/workers/checksumWorker.ts
self.onmessage = (e: MessageEvent<File[]>) => {
  const files = e.data
  const checksums = await Promise.all(
    files.map(file => computeChecksum(file))
  )
  self.postMessage(checksums)
}

// Main thread
function computeChecksumsParallel(files: File[]) {
  const worker = new Worker('/checksumWorker.ts')
  return new Promise(resolve => {
    worker.onmessage = (e) => resolve(e.data)
    worker.postMessage(files)
  })
}
```

### Upload Batching

**Group files into chunks** (for very large projects):
```typescript
function batchFiles(files: File[], batchSize: number = 50) {
  const batches: File[][] = []
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize))
  }
  return batches
}

// Upload each batch sequentially
for (const batch of batches) {
  await uploadFilesBatch(buildId, batch, onProgress)
}
```

---

## Troubleshooting Guide

### Common Issues

**Q: Cache grows too large**
- A: Auto-cleanup after 7 days of non-use
- A: Manual cleanup via Settings → "Clear Cache"

**Q: Checksum mismatch on upload**
- A: Verify file content didn't change during read
- A: Retry upload (idempotent)

**Q: Wails browser not opening**
- A: Check `OpenExternalURL` is implemented in Go
- A: Fallback to web mode if Wails unavailable

**Q: OAuth callback not working**
- A: Verify redirect URL in Clerk dashboard
- A: Check localStorage is enabled
- A: Check CORS headers from auth service

---
