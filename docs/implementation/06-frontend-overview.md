# Phase 6: Frontend Integration - Overview & Architecture

## Overview

This phase integrates the existing Wails desktop LaTeX editor with the Phase 1-5 SaaS backend. The desktop app becomes a rich client that submits builds to the SaaS service with:

- **Clerk OAuth authentication** for SaaS access
- **Efficient delta-sync caching** to minimize upload payloads
- **Monorepo structure** for shared UI components (future web app)
- **Complete feature preservation** (local/remote compiler options remain)
- **SaaS dashboard** (build history, billing, account management)

**Architecture Decision**: Desktop app remains the primary editor; backend provides compilation service only. Web UI components are split out for potential future web application.

---

## Deployment Model

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

---

## Implementation Timeline

| Sub-Phase | Task | Duration | Docs |
|-----------|------|----------|------|
| 6.1 | Monorepo Setup | 2-3h | [06-monorepo.md](06-monorepo.md) |
| 6.2 | Clerk OAuth | 3-4h | [06-authentication.md](06-authentication.md) |
| 6.3 | Delta-Sync Caching | 4-5h | [06-build-caching.md](06-build-caching.md) |
| 6.4 | SaaS Dashboard | 3-4h | [06-dashboard.md](06-dashboard.md) |
| 6.5 | Signed URLs | 2-3h | [06-artifacts.md](06-artifacts.md) |
| - | Testing & Polish | 2-3h | [06-testing.md](06-testing.md) |
| **TOTAL** | | **16-22h** | |

---

## Feature Preservation

All existing features remain intact:
- ✅ Local Docker renderer (Settings)
- ✅ Remote compiler override (custom URL + token)
- ✅ Build options (engine, shell-escape)
- ✅ File browser + Monaco editor
- ✅ PDF preview with SyncTeX
- ✅ Git integration
- ✅ Settings UI (appearance, compiler)

See [06-testing.md](06-testing.md) for regression testing checklist.

---

## Monorepo Structure

```
treefrog/
├── pnpm-workspace.yaml
├── packages/
│   ├── types/          # API & domain types
│   ├── ui/             # Shadcn/Radix components
│   ├── hooks/          # Shared React hooks
│   └── services/       # API service layer
├── frontend/           # Desktop app (Wails)
├── latex-compiler/     # Backend (unchanged)
├── wails/              # Desktop bindings
└── docs/implementation/
```

See [06-monorepo.md](06-monorepo.md) for detailed structure.

---

## Environment Variables

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

## Quick Navigation

- **Getting Started**: Start with [06-monorepo.md](06-monorepo.md)
- **Authentication Details**: [06-authentication.md](06-authentication.md)
- **Build Caching Strategy**: [06-build-caching.md](06-build-caching.md)
- **Dashboard Pages**: [06-dashboard.md](06-dashboard.md)
- **Artifact Download**: [06-artifacts.md](06-artifacts.md)
- **Testing & QA**: [06-testing.md](06-testing.md)
- **Advanced Topics**: [PHASE6_ADVANCED_TOPICS.md](PHASE6_ADVANCED_TOPICS.md)

---

## Next Steps

1. ✅ Read this document (Phase 6 Overview)
2. → Start [06-monorepo.md](06-monorepo.md) (Phase 6.1)
3. → Continue with 6.2-6.5 in sequence
4. → Run regression test suite before release

---
