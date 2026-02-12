# Phase 0: Overview

## Document Overview

This plan covers building a secure, multi-user LaTeX compilation service with:
- **Clerk Authentication** (OAuth, multi-user support)
- **Razorpay Payments** (Subscription billing with tiers)
- **Docker Compilation** (Local/remote LaTeX rendering)
- **Build Management** (TTL, limits, cleanup)
- **Security** (Signed URLs, rate limiting, isolation)
- **Cache Management** (Automatic cleanup, disk management)

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Wails + React)                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────┐  │
│  │   Clerk React SDK      │  │   Razorpay Checkout   │  │  User Panel  │  │
│  │   - SignIn/SignUp     │  │   - Subscription Flow │  │  - Builds    │  │
│  │   - OAuth Providers   │  │   - Payment UI       │  │  - Settings  │  │
│  └───────────┬───────────┘  └───────────┬───────────────┘  └───────┬───────┘ │
└──────────────┼─────────────────────────────┼───────────────────────┼─────────┘
               │                             │                       │
               ▼                             ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Go HTTP Server)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                      Authentication Layer                            │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │   Clerk Middleware:                                         │  │    │
│  │  │   - WithHeaderAuthorization() - JWT verification           │  │    │
│  │  │   - getAuth(req) - Extract user ID from JWT               │  │    │
│  │  │   - SessionClaimsFromContext() - Get full claims          │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐│
│  │   Build Service       │  │   Billing Service                           ││
│  │   - Create/Compile   │  │   - Razorpay Client Wrapper                 ││
│  │   - Status Tracking  │  │   - Subscription Management                 ││
│  │   - PDF/SyncTeX Serve│ │   - Customer Management                    ││
│  │   - Docker Compiler  │  │   - Webhook Handler                        ││
│  │   - User Isolation  │  │                                              ││
│  └──────────────────────┘  └──────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐│
│  │   Cleanup Service     │  │   Security Layer                            ││
│  │   - TTL Expiration   │  │   - Signed URLs                             ││
│  │   - Disk Monitoring   │  │   - Rate Limiting                           ││
│  │   - Periodic Scans    │  │   - Build Limits (Monthly/Concurrent)       ││
│  │   - Startup/Shutdown  │  │   - Strict User Isolation                   ││
│  └──────────────────────┘  └──────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                      Data Layer (SQLite)                              │    │
│  │   - users (clerk_id, tier, limits, razorpay mappings)               │    │
│  │   - builds (id, user_id, status, TTL, artifacts)                   │    │
│  │   - subscriptions (razorpay_customer_id, plan, status)              │    │
│  │   - coupons (code, plan_id, usage limits, expiry)                  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Build Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUILD LIFECYCLE                                     │
│                                                                              │
│  User Upload          Extract           Compile           Serve             │
│  ┌────────┐          ┌────────┐      ┌──────────┐    ┌──────────┐        │
│  │ .zip   │─────────▶│ Source │─────▶│ Docker   │───▶│ PDF/Sync  │        │
│  │ File   │          │ Files  │      │ Compiler │    │ Tex       │        │
│  └────────┘          └────────┘      └──────────┘    └──────────┘        │
│       │                   │                │                │               │
│       │                   │                │                │               │
│       ▼                   ▼                ▼                ▼               │
│  ┌───────────────────────────────────────────────────────────────────┐       │
│  │                    CLEANUP SERVICE                                 │       │
│  │   - Hourly scans for expired builds                               │       │
│  │   - Disk space monitoring                                         │       │
│  │   - Build limit enforcement                                       │       │
│  │   - Orphaned file cleanup                                         │       │
│  └───────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  Expire (24h) ───▶ Grace Period (1h) ───▶ Hard Delete                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Compilation Methods

### Local Docker Compilation

The service uses Docker containers for secure, isolated LaTeX compilation:

```yaml
# docker-compose.yml integration
latex-renderer:
  build: ./latex-compiler
  volumes:
    - ./builds:/tmp/treefrog-builds
  environment:
    - COMPILER_WORKDIR=/tmp/treefrog-builds
  deploy:
    resources:
      limits:
        memory: 4G
      reservations:
        memory: 1G
  tmpfs:
    - /tmp:size=2G,mode=1777
```

### Compilation Features

- **Isolation**: Each build runs in its own container
- **Resource Limits**: Memory and CPU constraints per build
- **tmpfs**: Fast temporary file storage
- **Multiple Engines**: PDFLaTeX, XeLaTeX, LuaLaTeX
- **SyncTeX**: Forward/reverse search support

## Glossary

| Term | Definition |
|------|------------|
| Build | A single LaTeX compilation job |
| TTL | Time To Live - how long builds persist |
| Tier | Subscription level (free/pro/enterprise) |
| Signed URL | Time-limited URL for secure downloads |
| Grace Period | Time between expiry and hard delete |
| Isolation | Users can only access their own builds |
| Cleanup | Process of removing expired builds |
| User ID | Clerk user identifier |
| Build ID | Unique identifier for each compilation job |
| Razorpay Customer | Payment customer record |
| Razorpay Subscription | Recurring payment subscription |

## Technology Stack

### Backend
- **Go** - Primary language
- **Gorilla Mux** - HTTP routing
- **SQLite** - Data persistence
- **Redis** - Rate limiting
- **Docker SDK** - Container management

### Frontend
- **React** - UI framework
- **Clerk React SDK** - Authentication
- **Razorpay Checkout** - Payment UI

### Infrastructure
- **Docker** - Compilation containers
- **SQLite** - Local database
- **Redis** - Caching/rate limits

## Key Design Decisions

### 1. Docker-Based Compilation
- Isolates LaTeX compilation from host system
- Prevents malicious package installations
- Provides consistent environment
- Enables resource limits

### 2. SQLite for Data
- No external database dependency
- WAL mode for concurrent access
- Simple backup/restore

### 3. Redis for Rate Limits
- Distributed rate limiting
- Fast lookups
- Supports multiple rate limit types

### 4. Signed URLs for Downloads
- Prevents enumeration attacks
- Time-limited access
- No authentication required for download

## Security Model

1. **Authentication**: Clerk JWT tokens
2. **Authorization**: User-build ownership checks
3. **Rate Limiting**: Redis-backed per-user limits
4. **Download Security**: Signed URLs with expiration
5. **Build Isolation**: Docker container per build
6. **Data Isolation**: SQLite with user_id foreign keys

## Next Steps

Proceed to [Phase 1: Foundation](01-foundation.md) to set up authentication and database.
