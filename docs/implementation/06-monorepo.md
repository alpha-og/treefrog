# Phase 6.1: Monorepo Setup

## Goal

Establish pnpm workspaces with shared packages for UI components, types, services, and hooks.

---

## Directory Structure

```
treefrog/
├── pnpm-workspace.yaml                    # NEW
├── packages/                              # NEW - Shared code
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── api.ts                     # Backend response types
│   │       ├── build.ts                   # Build/compilation types
│   │       ├── user.ts                    # User/subscription types
│   │       ├── billing.ts                 # Razorpay types
│   │       └── cache.ts                   # Delta-sync cache types
│   │
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── index.ts                   # Main export
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Dialog.tsx
│   │       └── ... (30+ components)
│   │
│   ├── hooks/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── useAuth.ts                 # Clerk authentication
│   │       ├── useBuildCache.ts           # Delta-sync cache
│   │       └── useClerk.ts                # Clerk API wrapper
│   │
│   └── services/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── apiClient.ts               # Base HTTP client
│           ├── buildService.ts            # Build API calls
│           ├── userService.ts             # User/auth API calls
│           ├── billingService.ts          # Subscription API calls
│           └── storage.ts                 # Cache serialization
│
├── frontend/                              # UPDATED
│   ├── package.json                       # Add workspace deps
│   ├── tsconfig.json                      # Add path aliases
│   ├── vite.config.ts                     # Configure workspace resolution
│   └── src/
│
├── latex-compiler/                        # UNCHANGED
└── wails/                                 # UNCHANGED
```

---

## Implementation Steps

### Step 1: Create pnpm-workspace.yaml

**File**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'frontend'
```

This enables workspaces and tells pnpm to manage dependencies for all packages.

### Step 2: Create @treefrog/types Package

**File**: `packages/types/package.json`

```json
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
```

**File**: `packages/types/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

**File**: `packages/types/src/index.ts`

```typescript
export * from './api'
export * from './build'
export * from './user'
export * from './billing'
export * from './cache'
```

**File**: `packages/types/src/api.ts`

```typescript
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
  }
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
```

**File**: `packages/types/src/build.ts`

```typescript
export type BuildStatus = 'pending' | 'running' | 'completed' | 'failed' | 'expired'

export interface BuildResponse {
  id: string
  userId: string
  projectId: string
  mainFile: string
  engine: string
  shellEscape: boolean
  status: BuildStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
  storageBytes: number
  logUrl?: string
  artifacts?: {
    pdfUrl?: string
    syncTexUrl?: string
  }
}

export interface BuildInitRequest {
  projectId: string
  projectName: string
  mainFile: string
  engine: string
  shellEscape: boolean
}

export interface BuildInitResponse {
  buildId: string
  existingFiles: Record<string, { checksum: string; size: number }>
}
```

**File**: `packages/types/src/user.ts`

```typescript
export type UserTier = 'free' | 'pro' | 'enterprise'

export interface UserResponse {
  id: string
  clerkId: string
  email: string
  name: string
  tier: UserTier
  storageUsedBytes: number
  storageLimitBytes: number
  buildsThisMonth: number
  monthlyBuildLimit: number
}

export interface UserStats {
  tier: UserTier
  storageUsedGb: number
  storageLimitGb: number
  monthlyBuildsUsed: number
  monthlyBuildLimit: number
  concurrentBuildsUsed: number
  concurrentBuildLimit: number
}
```

**File**: `packages/types/src/billing.ts`

```typescript
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused'

export interface PlanTier {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: number
  currency: string
  billingPeriod: 'month' | 'year'
  features: {
    monthlyBuilds: number
    storageGb: number
    concurrentBuilds: number
  }
}

export interface SubscriptionResponse {
  id: string
  userId: string
  planId: string
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  renewalDate?: string
}

export interface RazorpayOrderResponse {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  notes: Record<string, any>
  created_at: number
}
```

**File**: `packages/types/src/cache.ts`

```typescript
export interface BuildCacheEntry {
  path: string
  checksum: string           // SHA256
  uploaded: boolean
  uploadedAt?: number        // timestamp
  size: number
}

export interface BuildCacheState {
  projectId: string
  projectName: string
  projectRoot: string
  entries: Map<string, BuildCacheEntry>
  lastBuildId?: string
  timestamp: number
}

export interface UploadMetadata {
  cachedFiles: Record<string, string>  // path -> checksum
  newFiles: string[]
  totalSize: number
}
```

---

### Step 3: Create @treefrog/services Package

**File**: `packages/services/package.json`

```json
{
  "name": "@treefrog/services",
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
    "build": "vite build --mode lib"
  },
  "dependencies": {
    "@treefrog/types": "workspace:*",
    "axios": "^1.13.4"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.5.4",
    "vite": "^5.3.4"
  }
}
```

**File**: `packages/services/src/index.ts`

```typescript
export * from './apiClient'
export * from './buildService'
export * from './userService'
export * from './billingService'
export * from './storage'
```

**File**: `packages/services/src/apiClient.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiResponse } from '@treefrog/types'

export class ApiClient {
  private client: AxiosInstance
  private authToken: string | null = null

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
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`
        }
        return config
      },
      error => Promise.reject(error)
    )

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    )
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  private handleError(error: AxiosError) {
    const status = error.response?.status

    if (status === 401) {
      // Trigger logout (would be handled by app)
      return Promise.reject(new Error('Unauthorized. Please sign in again.'))
    }

    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || 60
      return Promise.reject(new Error(`Rate limited. Retry after ${retryAfter}s`))
    }

    if (status === 403) {
      return Promise.reject(new Error('Insufficient permissions'))
    }

    return Promise.reject(error)
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url)
    if (response.data.error) {
      throw new Error(response.data.error.message)
    }
    return response.data.data as T
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    if (response.data.error) {
      throw new Error(response.data.error.message)
    }
    return response.data.data as T
  }

  async uploadFiles<T>(
    url: string,
    files: File[],
    metadata?: any,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    const formData = new FormData()

    files.forEach(file => {
      formData.append('files', file)
    })

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        const percent = Math.round((event.loaded * 100) / event.total)
        onProgress?.(percent)
      }
    }).then(r => {
      if (r.data.error) throw new Error(r.data.error.message)
      return r.data.data
    })
  }
}

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:9000/api'
)
```

---

### Step 4: Create @treefrog/hooks Package

**File**: `packages/hooks/package.json`

```json
{
  "name": "@treefrog/hooks",
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
    "build": "vite build --mode lib"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "typescript": "^5.5.4",
    "vite": "^5.3.4"
  }
}
```

**File**: `packages/hooks/src/index.ts`

```typescript
export * from './useAuth'
export * from './useBuildCache'
export * from './useClerk'
```

---

### Step 5: Update frontend/package.json

**File**: `frontend/package.json` (Add to dependencies)

```json
{
  "dependencies": {
    "@treefrog/types": "workspace:*",
    "@treefrog/services": "workspace:*",
    "@treefrog/hooks": "workspace:*",
    "@treefrog/ui": "workspace:*",
    "@clerk/clerk-react": "^5.x.x",
    // ... rest of dependencies
  }
}
```

### Step 6: Update frontend/tsconfig.json

**File**: `frontend/tsconfig.json` (Add path aliases)

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

### Step 7: Update frontend/vite.config.ts

**File**: `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@treefrog/types': path.resolve(__dirname, '../packages/types/src'),
      '@treefrog/services': path.resolve(__dirname, '../packages/services/src'),
      '@treefrog/hooks': path.resolve(__dirname, '../packages/hooks/src'),
      '@treefrog/ui': path.resolve(__dirname, '../packages/ui/src'),
    }
  }
})
```

---

## Testing

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Verify builds
ls packages/types/dist
ls packages/services/dist
ls packages/hooks/dist
ls packages/ui/dist

# Dev run
pnpm -F frontend dev

# Verify imports work
# Open frontend in browser and check console for any import errors
```

---

## Verification Checklist

- ✅ pnpm-workspace.yaml created
- ✅ All packages have package.json
- ✅ All packages build successfully
- ✅ frontend imports from workspace packages
- ✅ TypeScript path aliases work
- ✅ No import errors in browser console

---

## Next Step

→ Continue to [06-authentication.md](06-authentication.md) (Phase 6.2: Clerk OAuth Integration)
