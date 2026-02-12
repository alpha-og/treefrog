# Implementation Plan Update: Logging & Database Migrations

**Date Updated:** February 12, 2026  
**Status:** Completed  
**Scope:** Integration with existing Treefrog infrastructure

---

## Summary

Updated the Treefrog SaaS LaTeX compiler implementation plan to properly integrate with existing logging infrastructure and add professional-grade database migration management. All changes maintain consistency with existing Treefrog services while ensuring production-readiness.

---

## Key Changes

### 1. Logging Integration (NEW)

**What Changed:**
- Replaced theoretical "StructuredLogger" with **logrus** (already used across Treefrog)
- Integrated with existing `LOG_LEVEL` and `LOG_FORMAT` environment variables
- Added proper initialization function that matches Treefrog patterns
- Added correlation IDs and request tracing middleware

**File Updated:** `01-foundation.md` (Phase 1)

**Key Features:**
- JSON structured logging for production/cloud deployments
- Text logging with colors for development
- Configurable via environment: `LOG_LEVEL=info`, `LOG_FORMAT=json`
- Service name tagging for multi-service correlation
- Component-based logger creation for organized output

**Integration Points:**
```go
// Uses same approach as existing Treefrog services
logger = log.InitializeLogger("treefrog-saas-compiler")

// Structured fields like existing services
logger.WithFields(logrus.Fields{
    "event": "build_started",
    "buildID": buildID,
}).Info("Build started")
```

### 2. Database Migrations (NEW)

**What Changed:**
- Added professional migration system using **golang-migrate/migrate**
- Replaces ad-hoc SQL migration functions in code
- Provides versioned, reversible migrations
- Supports multi-environment deployments (dev, staging, prod)

**File Updated:** `01-foundation.md` (Phase 1 - Database Schema section)

**Migration System:**
```
migrations/
├── 000001_initial_schema.up.sql    # Create all tables
├── 000001_initial_schema.down.sql  # Rollback (drop tables)
├── 000002_add_audit_logs.up.sql    # Add audit logging
└── 000002_add_audit_logs.down.sql  # Rollback audit
```

**Migration Features:**
- Version tracking in database
- Safe rollback capability
- CLI support: `migrate -path ./migrations -database sqlite3://treefrog.db up`
- Automatic version detection on startup
- Requires no code changes for schema updates

### 3. Audit Logging System (ENHANCED)

**What Changed:**
- Added dedicated `AuditLogger` for compliance
- Logs both to logrus (operational) and database (compliance)
- Captures IP address, user agent, status, error messages
- Indexed audit table for efficient queries

**Audit Entry Fields:**
```go
type AuditEntry struct {
    ID            string    // UUID for tracking
    UserID        string    // Who performed action
    Action        string    // build_created, subscription_upgraded, etc.
    ResourceType  string    // build, subscription, coupon
    ResourceID    string    // Specific resource ID
    Details       string    // JSON encoded details
    IPAddress     string    // For security tracking
    UserAgent     string    // For device tracking
    Status        string    // success or failure
    ErrorMessage  string    // If failed
    CreatedAt     time.Time
}
```

**Audit Table Schema:**
```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4. Database Initialization Updates

**What Changed:**
- `InitDB()` now uses golang-migrate instead of inline SQL
- Added `InitConfig` struct for flexible configuration
- Proper error handling and logging at each step
- WAL mode and foreign key enforcement as options
- Version reporting on startup

**New Initialization Code:**
```go
dbInstance, err := db.InitDB(db.InitConfig{
    DBPath:            os.Getenv("DATABASE_URL"),
    MigrationsPath:    os.Getenv("MIGRATIONS_PATH"),
    Logger:            logger,
    EnableWAL:         true,
    EnableForeignKeys: true,
})
```

### 5. Server Setup Integration

**What Changed:**
- Early logger initialization for startup logging
- Database initialization with migration support
- Audit logger setup
- Proper middleware ordering (logging → correlation IDs → auth)
- Using chi router instead of gorilla mux for consistency

**Middleware Stack (in order):**
1. RequestID - Unique ID per request
2. RealIP - Correct IP extraction behind proxies
3. CorrelationID - Build-wide trace tracking
4. RequestLogging - Full HTTP request/response logging
5. Recoverer - Panic recovery and logging
6. CORS - Cross-origin request handling
7. Auth - Clerk authentication
8. RateLimit - Rate limiting with Redis

### 6. Environment Variables (STANDARDIZED)

**New/Updated Variables:**
```bash
# Logging (NEW)
LOG_LEVEL=info              # debug, info, warn, error
LOG_FORMAT=json             # json or text

# Database & Migrations (UPDATED)
DATABASE_URL=./data/treefrog.db
MIGRATIONS_PATH=./migrations  # NEW - path to migrations

# Existing variables preserved
CLERK_SECRET_KEY=sk_live_...
RAZORPAY_KEY_ID=...
COMPILER_WORKDIR=/tmp/treefrog-builds
BUILD_WORKERS=4
COMPILER_SIGNING_KEY=...
```

---

## Consistency with Existing Treefrog

### Logging Alignment
| Aspect | Existing Treefrog | SaaS Backend |
|--------|-------------------|--------------|
| Library | logrus | logrus ✓ |
| JSON Support | Yes | Yes ✓ |
| Environment Config | LOG_LEVEL, LOG_FORMAT | LOG_LEVEL, LOG_FORMAT ✓ |
| Middleware Pattern | Defined | Uses same patterns ✓ |
| Startup Logging | Yes | Yes ✓ |

### Database Patterns
| Aspect | Existing Treefrog | SaaS Backend |
|--------|-------------------|--------------|
| Type | Filesystem JSON | SQLite + Migrations ✓ |
| Migration Strategy | N/A (No DB) | golang-migrate ✓ |
| Version Control | N/A | SQL files in git ✓ |
| Rollback Capability | Config versioning | Full rollback ✓ |

### Authentication
| Aspect | Existing Treefrog | SaaS Backend |
|--------|-------------------|--------------|
| Type | Header token | Clerk JWT |
| Middleware | chi router | chi router ✓ |
| Context Pattern | Yes | Same patterns ✓ |
| Correlation IDs | Not used | Added ✓ |

---

## Migration Implementation Guide

### Step 1: Install golang-migrate

```bash
# Install CLI tool
go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Add to go.mod
go get github.com/golang-migrate/migrate/v4
go get github.com/golang-migrate/migrate/v4/database/sqlite3
go get github.com/golang-migrate/migrate/v4/source/file
```

### Step 2: Create Migration Files

```bash
# Create migrations directory
mkdir -p migrations

# Create initial schema migration (provided in 01-foundation.md)
# - migrations/000001_initial_schema.up.sql
# - migrations/000001_initial_schema.down.sql

# Create audit logs migration
# - migrations/000002_add_audit_logs.up.sql
# - migrations/000002_add_audit_logs.down.sql
```

### Step 3: Run Migrations

**Automatic (on server startup):**
```go
// In pkg/db/init.go runMigrations function
// Automatically runs pending migrations
dbInstance, err := db.InitDB(config)
```

**Manual CLI:**
```bash
# Run all pending migrations
migrate -path ./migrations -database "sqlite3://treefrog.db" up

# Rollback last migration
migrate -path ./migrations -database "sqlite3://treefrog.db" down

# Check current version
migrate -path ./migrations -database "sqlite3://treefrog.db" version
```

### Step 4: Version Control

```bash
# Track migrations in git
git add migrations/
git commit -m "Add database migration system"

# Ensure each migration is reviewed before merge
# Each migration should have clear .up.sql and .down.sql files
```

---

## Logging Best Practices

### Application Startup
```go
logger := log.InitializeLogger("treefrog-saas-compiler")
logger.WithField("version", "1.0.0").Info("Server starting")
```

### Request Handling
```go
// Middleware automatically logs all requests
// Plus correlation IDs for tracing
logger.WithFields(logrus.Fields{
    "correlationID": corrID,
    "userID": userID,
    "action": "build_created",
}).Info("Build created successfully")
```

### Error Logging
```go
logger.WithError(err).WithFields(logrus.Fields{
    "userID": userID,
    "buildID": buildID,
}).Error("Build compilation failed")
```

### Audit Events
```go
auditLogger.Log(AuditEntry{
    UserID: userID,
    Action: "build_created",
    ResourceType: "build",
    ResourceID: buildID,
    Status: "success",
    IPAddress: r.RemoteAddr,
    UserAgent: r.UserAgent(),
})
```

---

## Breaking Changes

**None** - All changes are additive and backward compatible with the previous plan.

**Migration Path:**
1. Add logging and migrations sections to Phase 1
2. Update database initialization code
3. Update server setup code
4. No existing code needs refactoring

---

## Files Updated

| File | Section | Changes |
|------|---------|---------|
| `01-foundation.md` | Overview | Added logging to overview |
| `01-foundation.md` | NEW: Logging Strategy | Complete logging integration guide |
| `01-foundation.md` | Database Schema | Migrated to golang-migrate with SQL files |
| `01-foundation.md` | DB Initialization | Updated to use migrations |
| `01-foundation.md` | NEW: Audit Logging | Compliance audit system |
| `01-foundation.md` | Server Setup | Updated to use logrus and new DB init |
| `01-foundation.md` | Environment Variables | Added LOG_LEVEL, LOG_FORMAT, MIGRATIONS_PATH |
| `01-foundation.md` | Tasks Checklist | Updated with migration and logging tasks |

---

## Testing Checklist

Before deploying to production:

- [ ] Verify migrations run successfully on fresh database
- [ ] Verify migrations can rollback without errors
- [ ] Test logger output in both JSON and text formats
- [ ] Verify correlation IDs flow through all requests
- [ ] Verify audit logs are recorded in database
- [ ] Test audit logs appear in logrus output
- [ ] Verify log levels filter correctly (debug, info, warn, error)
- [ ] Test graceful shutdown waits for in-flight requests
- [ ] Verify database schema matches migration expectations
- [ ] Test with LOG_FORMAT=json and LOG_FORMAT=text

---

## Next Steps

### Immediate (for frontend team)
- Review updated Phase 1 documentation
- Ensure frontend environment variables match backend
- Test auth flow with new logging in place

### Short-term (for backend team)
1. Implement migration files exactly as specified
2. Test migrations locally (up/down cycles)
3. Implement logging in all service components
4. Add audit logging to all user actions

### Production Deployment
1. Backup existing database (if any)
2. Run migrations in staging first
3. Verify all tables and indexes created
4. Monitor logs during initial runs
5. Set up log aggregation (ELK, Datadog, etc.)

---

## References

- **golang-migrate Documentation:** https://github.com/golang-migrate/migrate
- **logrus Documentation:** https://github.com/sirupsen/logrus
- **SQLite PRAGMA Docs:** https://www.sqlite.org/pragma.html
- **Previous Implementation Plan:** See other `XX-*.md` files in this directory

---

**End of Update Document**
