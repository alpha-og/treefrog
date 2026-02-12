# Phase 6.3: Efficient Build Submission with Delta-Sync

**See [PHASE6_ADVANCED_TOPICS.md](PHASE6_ADVANCED_TOPICS.md#delta-sync-caching-strategy) for detailed technical strategy.**

## Quick Overview

Delta-sync reduces upload payloads by **99%** on subsequent builds:

```
First build:  Upload 100 files = 50MB
Second build (1 file changed): Upload 1 file = 500KB
Result: 99% reduction
```

---

## Implementation

### Checksum Utilities

**File**: `frontend/src/utils/checksum.ts`

```typescript
import { sha256 } from 'crypto-js'

export async function computeFileChecksum(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const hash = sha256(new Uint8Array(reader.result as ArrayBuffer)).toString()
      resolve(hash)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function generateProjectId(projectPath: string): string {
  return sha256(projectPath).toString().substring(0, 16)
}
```

### Build Service with Delta-Sync

**File**: `packages/services/src/buildService.ts`

```typescript
import { apiClient } from './apiClient'
import type { BuildInitResponse, BuildResponse } from '@treefrog/types'

export class BuildService {
  async initBuild(projectId: string, mainFile: string, engine: string) {
    return apiClient.post<BuildInitResponse>('/builds/init', {
      projectId,
      mainFile,
      engine
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
      {
        cachedFiles: Object.fromEntries(cachedFiles),
        timestamp: Date.now()
      },
      onProgress
    )
  }

  async startCompile(
    buildId: string,
    mainFile: string,
    engine: string,
    shellEscape: boolean
  ) {
    return apiClient.post(`/builds/${buildId}/compile`, {
      mainFile,
      engine,
      shellEscape
    })
  }

  async getStatus(buildId: string) {
    return apiClient.get<BuildResponse>(`/builds/${buildId}/status`)
  }

  async getSignedUrl(buildId: string, artifactType: 'pdf' | 'logs' | 'synctex') {
    return apiClient.get<{ url: string }>(
      `/builds/${buildId}/artifacts/${artifactType}/signed-url`
    )
  }
}

export const buildService = new BuildService()
```

### Updated useBuild Hook

**File**: `frontend/src/hooks/useBuild.ts`

```typescript
import { useRef, useState, useCallback } from 'react'
import { useCacheStore } from '@/stores/cacheStore'
import { buildService } from '@treefrog/services'
import { computeFileChecksum, generateProjectId } from '@/utils/checksum'
import { createLogger } from '@/utils/logger'

const log = createLogger('Build')

export function useBuild() {
  const buildInFlightRef = useRef<boolean>(false)
  const [status, setStatus] = useState<string>('idle')
  const [progress, setProgress] = useState<number>(0)
  const { getProjectCache, updateCache } = useCacheStore()

  const build = useCallback(
    async (projectPath: string, projectName: string, mainFile: string, engine: string, shell: boolean) => {
      if (buildInFlightRef.current) {
        log.warn('Build already in-flight')
        return
      }

      try {
        buildInFlightRef.current = true
        setStatus('initializing')
        setProgress(0)

        const projectId = generateProjectId(projectPath)

        // 1. Initialize build
        const { buildId, existingFiles } = await buildService.initBuild(
          projectId,
          mainFile,
          engine
        )
        log.debug('Build initialized', { buildId })

        // 2. Compute checksums for all project files
        setStatus('computing_checksums')
        const projectFiles = await listProjectFiles(projectPath)
        const checksums = await Promise.all(
          projectFiles.map(async (file) => ({
            path: file.path,
            checksum: await computeFileChecksum(file)
          }))
        )
        const checksumMap = new Map(checksums.map(c => [c.path, c.checksum]))

        // 3. Determine delta
        setStatus('determining_delta')
        const cachedEntries = getProjectCache(projectId)?.entries || new Map()
        const filesToUpload: File[] = []
        const cachedReferences = new Map<string, string>()

        for (const file of projectFiles) {
          const currentChecksum = checksumMap.get(file.path)!
          const cached = cachedEntries.get(file.path)

          if (!cached || cached.checksum !== currentChecksum) {
            // Changed or new
            filesToUpload.push(file)
          } else {
            // Unchanged - use cached reference
            cachedReferences.set(file.path, currentChecksum)
          }
        }

        log.debug(`Delta computed: ${filesToUpload.length} new/changed, ${cachedReferences.size} cached`)

        // 4. Upload changed files
        setStatus('uploading')
        if (filesToUpload.length > 0) {
          await buildService.uploadFiles(
            buildId,
            filesToUpload,
            cachedReferences,
            (percent) => setProgress(percent)
          )
          log.debug(`Uploaded ${filesToUpload.length} files`)
        }

        // 5. Start compilation
        setStatus('compiling')
        setProgress(0)
        await buildService.startCompile(buildId, mainFile, engine, shell)

        // 6. Poll until done
        let done = false
        while (!done) {
          await new Promise(r => setTimeout(r, 2000))
          const result = await buildService.getStatus(buildId)

          if (['completed', 'failed', 'expired'].includes(result.status)) {
            done = true
            setStatus(result.status)
          }
        }

        // 7. Update cache
        const newCache = {
          projectId,
          projectName,
          projectRoot: projectPath,
          entries: checksumMap,
          lastBuildId: buildId,
          timestamp: Date.now()
        }
        updateCache(projectId, newCache)

        log.debug('Build complete')
      } catch (err) {
        log.error('Build failed', { error: err })
        setStatus('error')
        throw err
      } finally {
        buildInFlightRef.current = false
      }
    },
    [getProjectCache, updateCache]
  )

  return { status, progress, build }
}

async function listProjectFiles(projectPath: string): Promise<File[]> {
  // Implementation depends on environment (Wails vs Web)
  // For desktop: Use Wails bindings to list files
  // For web: Use File API with file picker
  return []
}
```

---

## Testing

### Scenario 1: First Build

```
- Project has 10 files
- Run build
- Verify: All 10 files uploaded
- Verify: Server cache now has 10 files
```

### Scenario 2: Edit 1 File, Re-build

```
- Edit chapter1.tex
- Run build
- Verify: Only chapter1.tex uploaded
- Verify: 99% payload reduction
- Verify: Server merges cached + new
```

### Scenario 3: New Session

```
- Clear browser cache
- Open project again
- Run build
- Verify: Cache is empty, all files re-uploaded
- Verify: Cache is rebuilt for next session
```

---

## Next Step

→ Continue to [06-dashboard.md](06-dashboard.md) (Phase 6.4: SaaS Dashboard Pages)
