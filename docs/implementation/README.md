# Treefrog Implementation Plan

A comprehensive plan for building a secure, multi-user LaTeX compilation SaaS with integrated desktop client.

## Documents

| Phase | Document | Status | Description |
|-------|----------|--------|-------------|
| Overview | [00-overview.md](00-overview.md) | ✅ Complete | Architecture, features, glossary |
| Phase 1 | [01-foundation.md](01-foundation.md) | ✅ Complete | Clerk authentication, SQLite DB, audit logs |
| Phase 2 | [02-payments.md](02-payments.md) | ✅ Complete | Razorpay subscriptions, coupons, webhooks |
| Phase 3 | [03-build-system.md](03-build-system.md) | ✅ Complete | Docker compiler, job queue, build limits |
| Phase 4 | [04-security.md](04-security.md) | ✅ Complete | Signed URLs, rate limiting, Redis |
| Phase 5 | [05-cache-cleanup.md](05-cache-cleanup.md) | ✅ Complete | TTL expiration, disk monitoring, quotas |
| Phase 6 | [06-frontend.md](06-frontend.md) | 🚀 NEW | Desktop + SaaS integration with delta-sync |

## Phase 6: Desktop LaTeX Editor → SaaS Integration

### Overview
Integrates the existing Wails desktop LaTeX editor with the Phase 1-5 backend. Desktop app remains the primary editor; backend provides compilation service with:

- ✅ **Clerk OAuth** - User authentication for SaaS access
- ✅ **Delta-sync caching** - Only upload changed files (99% payload reduction)
- ✅ **Monorepo structure** - Shared UI/services for future web app
- ✅ **Feature preservation** - Local/remote compiler options remain unchanged
- ✅ **SaaS dashboard** - Build history, billing, account management

### Key Architecture

```
Desktop App (Wails)
├─ Local/Remote Build Options (PRESERVED)
├─ Monaco Editor + PDF Preview (PRESERVED)
├─ Clerk OAuth Integration (NEW)
└─ SaaS Dashboard Pages (NEW)
    └─ Build History
    └─ Subscription Management
    └─ Account Settings
        ↓
        Backend (localhost:9000)
        ├─ Clerk Auth Verification
        ├─ Build Queue + Docker Compilation
        ├─ Artifact Storage (Signed URLs)
        └─ Billing (Razorpay)
```

### Implementation Phases

| Sub-Phase | Task | Duration | Status |
|-----------|------|----------|--------|
| 6.1 | Monorepo Setup (pnpm workspaces) | 2-3h | 📋 Planned |
| 6.2 | Clerk OAuth Integration | 3-4h | 📋 Planned |
| 6.3 | Delta-Sync Build Caching | 4-5h | 📋 Planned |
| 6.4 | SaaS Dashboard Pages | 3-4h | 📋 Planned |
| 6.5 | Artifact Download + Signed URLs | 2-3h | 📋 Planned |
| - | Testing & Polish | 2-3h | 📋 Planned |
| **TOTAL** | | **16-22h** | |

See [06-frontend.md](06-frontend.md) for detailed implementation guide.

## Quick Links

### Backend Configuration
- [Environment Variables](01-foundation.md#environment-variables)
- [Database Schema](01-foundation.md#database-schema)
- [Docker Compilation](03-build-system.md#docker-compilation)
- [API Endpoints](07-api-reference.md)
- [Cleanup Schedule](05-cache-cleanup.md#cleanup-engine)

### Frontend Configuration
- [Phase 6 Frontend Integration](06-frontend.md)
- [Monorepo Setup](06-frontend.md#phase-61-monorepo-setup-2-3-hours)
- [Clerk OAuth](06-frontend.md#phase-62-clerk-oauth-integration-3-4-hours)
- [Delta-Sync Caching](06-frontend.md#phase-63-efficient-build-submission-with-delta-sync-4-5-hours)

### Testing & Reference
- [Quick Reference](QUICK_REFERENCE.md)
- [API Reference](07-api-reference.md)

## Project Completion Status

### Backend (Phases 1-5)
- ✅ **Phase 1**: Foundation - Logging, DB, Clerk auth, audit logs
- ✅ **Phase 2**: Payments - Razorpay, subscriptions, webhooks, coupons
- ✅ **Phase 3**: Build System - Docker compiler, job queue, build limits
- ✅ **Phase 4**: Security - Signed URLs, rate limiting, Redis
- ✅ **Phase 5**: Cache & Cleanup - TTL, disk monitoring, quotas
- **Build Status**: ✅ All packages compile, 4000+ LOC, 25+ Go files

### Frontend (Phase 6)
- 🚀 **6.1**: Monorepo Setup - **NEXT**
- ⏳ **6.2**: Clerk OAuth Integration
- ⏳ **6.3**: Delta-Sync Caching
- ⏳ **6.4**: SaaS Dashboard Pages
- ⏳ **6.5**: Artifact Download

## Estimated Effort

| Component | Duration |
|-----------|----------|
| Backend (Phases 1-5) | 14 days |
| Frontend (Phase 6) | 4-5 days |
| **Total Project** | **18-19 days** |

## Feature Preservation Checklist

All existing features remain intact:

- ✅ Local Docker renderer (Settings)
- ✅ Remote compiler override (custom URL + token)
- ✅ Build options (engine, shell-escape)
- ✅ File browser + Monaco editor
- ✅ PDF preview with SyncTeX
- ✅ Git integration
- ✅ Settings UI (appearance, compiler)

See [06-frontend.md#feature-preservation-regression-prevention](06-frontend.md#feature-preservation--regression-prevention) for regression testing checklist.

## Getting Started

### For Backend (Phase 1-5)
1. Read [00-overview.md](00-overview.md) for architecture
2. Follow phases 1-5 in order
3. Set environment variables from each phase
4. Run tests after each phase
5. See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common tasks

### For Frontend (Phase 6) - **ACTIVE NOW**
1. Start with [06-frontend.md](06-frontend.md)
2. Begin with Phase 6.1 (Monorepo Setup)
3. Follow sub-phases 6.2-6.5 sequentially
4. Run regression tests before release
5. See feature preservation checklist

## Production Deployment

### Backend
```bash
cd latex-compiler
docker build -t treefrog-compiler .
docker run -p 9000:9000 \
  -e DATABASE_URL=... \
  -e CLERK_SECRET_KEY=... \
  -e RAZORPAY_KEY_ID=... \
  treefrog-compiler
```

### Desktop App (Phase 6)
```bash
cd wails
make build-all  # Builds for macOS, Windows, Linux
# Binaries in: wails/build/bin/
```

## Support & References

- **Phase Details**: See individual phase documents
- **Security**: Check [04-security.md](04-security.md)
- **Maintenance**: See [05-cache-cleanup.md](05-cache-cleanup.md)
- **API Reference**: [07-api-reference.md](07-api-reference.md)
- **Updates Applied**: [FIXES_APPLIED.md](FIXES_APPLIED.md)
- **Quick Tasks**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
