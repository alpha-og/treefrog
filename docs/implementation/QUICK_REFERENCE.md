# Quick Reference: Updated Implementation Plan

## What Was Updated

The Treefrog SaaS implementation plan now includes:

### ✅ Logging System (NEW)
- **Framework:** logrus (same as existing Treefrog)
- **Output:** JSON (production) or text (development)
- **Configuration:** `LOG_LEVEL`, `LOG_FORMAT` env vars
- **Features:** Structured fields, correlation IDs, request tracing

### ✅ Database Migrations (NEW)
- **Tool:** golang-migrate/migrate
- **System:** Versioned SQL files (`.up.sql` and `.down.sql`)
- **Directory:** `migrations/`
- **Features:** Automatic runs on startup, rollback capability, CLI tools

### ✅ Audit Logging (ENHANCED)
- **Storage:** Both logrus stream + database table
- **Captures:** User ID, action, resource, status, IP, user agent
- **Use Case:** Compliance, security tracking, user action history

---

## Key Implementation Files

### Database Migrations

Create these in `migrations/` directory:

**`000001_initial_schema.up.sql`**
- Creates users, builds, coupons tables
- Sets up indexes and foreign keys
- Located in 01-foundation.md (see "Migration 1" section)

**`000001_initial_schema.down.sql`**
- Rollback for initial schema
- Drops tables in reverse order

**`000002_add_audit_logs.up.sql`**
- Creates audit_logs table
- Adds indexes for queries

**`000002_add_audit_logs.down.sql`**
- Removes audit logging table

### Code Files

**`pkg/log/logger.go`** - Logging initialization
- `InitializeLogger(serviceName)` - Set up logger
- `GetLogger(name)` - Get component logger
- Environment-based config

**`pkg/log/audit.go`** - Audit logging
- `AuditLogger` type
- `Log(AuditEntry)` method
- Writes to both logrus and database

**`pkg/db/init.go`** - Database with migrations
- `InitDB(config)` - Initialize database
- Automatic migration runner
- WAL mode + foreign keys
- Error handling + logging

**`cmd/server/main.go`** - Server setup
- Early logger initialization
- Database + migrations init
- Middleware stack with logging
- Graceful shutdown

---

## Dependencies to Add

```bash
go get github.com/sirupsen/logrus
go get github.com/golang-migrate/migrate/v4
go get github.com/golang-migrate/migrate/v4/database/sqlite3
go get github.com/golang-migrate/migrate/v4/source/file
go get github.com/mattn/go-sqlite3
```

**CLI Tool:**
```bash
go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

---

## Environment Variables

```bash
# Logging
LOG_LEVEL=info              # debug, info, warn, error
LOG_FORMAT=json             # json or text

# Database
DATABASE_URL=./data/treefrog.db
MIGRATIONS_PATH=./migrations

# Existing variables (unchanged)
CLERK_SECRET_KEY=sk_live_...
RAZORPAY_KEY_ID=...
COMPILER_WORKDIR=/tmp/treefrog-builds
BUILD_WORKERS=4
COMPILER_SIGNING_KEY=...
```

---

## Quick Start

### 1. Initialize Logger
```go
logger := log.InitializeLogger("treefrog-saas-compiler")
logger.Info("Server starting")
```

### 2. Initialize Database with Migrations
```go
dbInstance, err := db.InitDB(db.InitConfig{
    DBPath:            os.Getenv("DATABASE_URL"),
    MigrationsPath:    os.Getenv("MIGRATIONS_PATH"),
    Logger:            logger,
    EnableWAL:         true,
    EnableForeignKeys: true,
})
```

### 3. Log with Structure
```go
logger.WithFields(logrus.Fields{
    "userID": userID,
    "buildID": buildID,
    "engine": "pdflatex",
}).Info("Build started")
```

### 4. Audit User Actions
```go
auditLogger.Log(AuditEntry{
    UserID: userID,
    Action: "build_created",
    ResourceType: "build",
    ResourceID: buildID,
    Status: "success",
    IPAddress: r.RemoteAddr,
})
```

---

## Migration Commands

```bash
# Run pending migrations
migrate -path ./migrations -database "sqlite3://treefrog.db" up

# Rollback last migration
migrate -path ./migrations -database "sqlite3://treefrog.db" down

# Check current version
migrate -path ./migrations -database "sqlite3://treefrog.db" version

# Rollback specific number
migrate -path ./migrations -database "sqlite3://treefrog.db" down 2
```

---

## Documentation Location

**Main Update:** `/docs/implementation/01-foundation.md` (Phase 1)

**Detailed Summary:** `/docs/implementation/LOGGING_AND_MIGRATIONS_UPDATE.md`

---

## Key Points

1. **Backward Compatible** - All changes are additive, no breaking changes
2. **Consistent** - Uses same logging patterns as existing Treefrog
3. **Production-Ready** - Includes error handling, versioning, rollback
4. **Configurable** - Everything via environment variables
5. **Auditable** - Full compliance tracking with audit logs

---

**Status:** ✅ Ready for implementation
