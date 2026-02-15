# Treefrog Features Documentation

This document provides a comprehensive overview of all features implemented across the Treefrog platform, including the Compiler backend, Desktop application, Website, and Local CLI.

---

## Table of Contents

1. [Core LaTeX Compilation](#core-latex-compilation)
2. [Project Management](#project-management)
3. [Editor Features](#editor-features)
4. [PDF Preview](#pdf-preview)
5. [Authentication & Users](#authentication--users)
6. [Billing & Subscriptions](#billing--subscriptions)
7. [Cloud Features](#cloud-features)
8. [Git Integration](#git-integration)
9. [Renderer/Docker Management](#rendererdocker-management)
10. [Admin Features](#admin-features)
11. [Infrastructure](#infrastructure)
12. [API Endpoints](#api-endpoints)

---

## Core LaTeX Compilation

### Compiler Backend

| Feature              | Description                                             | Implementation                                        |
| -------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| PDF Compilation      | Compile LaTeX source to PDF using Docker containers     | `apps/compiler/internal/build/compiler.go`            |
| Engine Selection     | Support for pdflatex, xelatex, and lualatex engines     | Configurable via `engine` parameter in build request  |
| Shell-Escape         | Enable `-shell-escape` flag for advanced LaTeX packages | Restricted to Enterprise tier users only              |
| Build Queue          | Worker pool with configurable workers (default: 4)      | `apps/compiler/internal/build/queue.go`               |
| Build Status Polling | Real-time status updates via WebSocket or polling       | Status stored in database, updated during compilation |
| Build Logs           | Capture and stream latexmk output logs                  | Stored in database, accessible via API                |
| Delta-Sync/Caching   | Incremental builds with file checksum verification      | `apps/compiler/cmd/server/handlers_delta_sync.go`     |
| Docker Isolation   | Each build runs in isolated Docker container            | Memory/CPU limits, tmpfs, no network, auto-remove     |
| Retry Logic          | Exponential backoff for failed builds                   | `apps/compiler/internal/build/queue.go`               |
| Timeout Handling     | Configurable build timeouts (default: 5min, max: 10min) | Enforced at container level                           |

### Desktop Application

| Feature              | Description                          | Implementation                                         |
| -------------------- | ------------------------------------ | ------------------------------------------------------ |
| Local Compilation    | Compile using local Docker renderer  | `apps/desktop/docker.go`                               |
| Remote Compilation   | Send builds to cloud compiler        | `apps/desktop/bindings.go` (TriggerBuild)              |
| Auto Mode Detection  | Automatically choose local vs remote | `apps/desktop/docker.go` (DetectBestMode)              |
| Build Status Display | Real-time build progress indicator   | WebSocket polling, status bar UI                       |
| Build Log Viewer     | Scrollable build output display      | `apps/desktop/frontend/src/components/PreviewPane.tsx` |

### Website

| Feature       | Description                       | Implementation                         |
| ------------- | --------------------------------- | -------------------------------------- |
| Build History | View last 30 builds with status   | `apps/website/src/pages/Dashboard.tsx` |
| Build Details | View individual build information | Linked from dashboard                  |

### Local CLI

| Feature          | Description                       | Implementation               |
| ---------------- | --------------------------------- | ---------------------------- |
| PDF Compilation  | Single command LaTeX compilation  | `apps/local-cli/cmd/main.go` |
| Docker Execution | Runs latexmk in Docker container  | Mounts project directory     |
| Output Streaming | Streams stdout/stderr to terminal | Real-time output display     |

---

## Project Management

### Desktop Application

| Feature                    | Description                           | Implementation                                       |
| -------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Project Folder Selection   | Native folder picker dialog           | `apps/desktop/bindings.go` (OpenProjectDialog)       |
| Recent Projects            | Last 10 projects with quick access    | Persisted in localStorage                            |
| Project Path Display       | Shows current project in title bar    | `apps/desktop/frontend/src/components/TitleBar.tsx`  |
| File Tree Navigation       | Expandable/collapsible directory tree | `apps/desktop/frontend/src/components/Sidebar.tsx`   |
| Create File/Folder         | Context menu and keyboard shortcuts   | `apps/desktop/bindings.go` (CreateFile)              |
| Rename Files               | Right-click rename with validation    | `apps/desktop/bindings.go` (RenameFile)              |
| Move Files                 | Drag-and-drop or context menu         | `apps/desktop/bindings.go` (MoveFile)                |
| Delete Files               | Single and multi-file deletion        | `apps/desktop/bindings.go` (DeleteFile)              |
| Duplicate Files            | Copy files within project             | `apps/desktop/bindings.go` (DuplicateFile)           |
| Multi-Select               | Ctrl/Shift for multiple selection     | `apps/desktop/frontend/src/components/Sidebar.tsx`   |
| Drag & Drop Upload         | Drop files from OS into project       | `apps/desktop/frontend/src/hooks/useExternalDrop.ts` |
| File Search                | Search files by name                  | `apps/desktop/frontend/src/hooks/useTreeSearch.ts`   |
| Filter by Type             | Filter LaTeX, images, code files      | Filter bar in sidebar                                |
| Sort Options               | Sort by name, size, or date           | Sort dropdown in sidebar                             |
| Keyboard Navigation        | Arrow keys, Enter, Delete, F2         | `apps/desktop/frontend/src/hooks/useTreeKeyboard.ts` |
| Expanded State Persistence | Remember expanded folders             | `apps/desktop/frontend/src/utils/treePersistence.ts` |

### Local CLI

| Feature               | Description               | Implementation        |
| --------------------- | ------------------------- | --------------------- |
| Project Path Argument | Specify project directory | Command-line argument |

---

## Editor Features

### Desktop Application

| Feature                   | Description                                                | Implementation                                        |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| Monaco Editor             | Full-featured code editor                                  | `apps/desktop/frontend/src/components/EditorPane.tsx` |
| LaTeX Syntax Highlighting | Custom tokenization for LaTeX                              | `monaco-latex` package integration                    |
| Light/Dark Themes         | Theme-aware editor styling                                 | Custom theme definitions                              |
| Auto-Save                 | Debounced save (300ms)                                     | `apps/desktop/frontend/src/hooks/useFiles.ts`         |
| Keyboard Shortcuts        | Ctrl+S (save), Ctrl+Enter (build), Ctrl+J (forward search) | Editor key bindings                                   |
| Line Highlighting         | SyncTeX line highlighting                                  | Highlights active line during sync                    |
| Multi-tab Support         | Open multiple files                                        | (Planned - not implemented)                           |

---

## PDF Preview

### Desktop Application

| Feature              | Description                         | Implementation                                            |
| -------------------- | ----------------------------------- | --------------------------------------------------------- |
| PDF Rendering        | Multi-page PDF display              | `react-pdf` with `pdfjs-dist`                             |
| Zoom Controls        | Fit-width, fit-height, 60%-240%     | `apps/desktop/frontend/src/components/PDF/PDFPreview.tsx` |
| Page Navigation      | Next/prev buttons, page input       | Navigation controls                                       |
| Build Status Overlay | Building, success, error indicators | Status-based overlay display                              |
| Export/Download PDF  | Save PDF to custom location         | `apps/desktop/bindings.go` (ExportPDF)                    |
| Export Source        | Download project as ZIP             | `apps/desktop/bindings.go` (ExportSource)                 |

### Compiler Backend

| Feature          | Description                      | Implementation                               |
| ---------------- | -------------------------------- | -------------------------------------------- |
| PDF Serving      | Serve built PDF files            | `apps/compiler/cmd/server/handlers_build.go` |
| Signed URLs      | Time-limited access to artifacts | `packages/go/signer/signer.go`               |
| Artifact Storage | 24-hour TTL for build artifacts  | `apps/compiler/internal/cleanup/service.go`  |

---

## Authentication & Users

### All Apps

| Feature             | Description                   | Implementation                             |
| ------------------- | ----------------------------- | ------------------------------------------ |
| Supabase JWT Auth   | Token-based authentication    | Supabase Go/JS SDK                         |
| OAuth Providers     | Google, GitHub sign-in        | Supabase Auth                              |
| Email/Password      | Traditional auth flow         | Supabase Auth                              |
| Password Reset      | Email-based password recovery | `apps/website/src/pages/ResetPassword.tsx` |
| Session Persistence | Remember login state          | localStorage + JWT refresh                 |

### Desktop Application

| Feature               | Description                     | Implementation                      |
| --------------------- | ------------------------------- | ----------------------------------- |
| Guest Mode            | Use without authentication      | Local-only compilation              |
| OAuth Callback Server | Local server for OAuth flow     | `apps/desktop/auth.go` (port 54321) |
| Protocol Handler      | Custom URL scheme for callbacks | `treefrog://auth/callback`          |

### Compiler Backend

| Feature              | Description                        | Implementation                            |
| -------------------- | ---------------------------------- | ----------------------------------------- |
| JWT Validation       | Verify Supabase tokens             | `apps/compiler/internal/auth/supabase.go` |
| JWKS Caching         | Cache public keys for verification | Auto-refresh every 24 hours               |
| User Tier Management | Free, Pro, Enterprise tiers        | Stored in database, checked for features  |
| Admin Middleware     | Protect admin-only routes          | Role-based access control                 |

---

## Billing & Subscriptions

### Compiler Backend

| Feature              | Description                      | Implementation                                 |
| -------------------- | -------------------------------- | ---------------------------------------------- |
| Razorpay Integration | Payment gateway integration      | `apps/compiler/internal/billing/razorpay.go`   |
| Plan Tiers           | Free, Pro, Enterprise            | `packages/types/src/constants.ts`              |
| Subscription Create  | Create new subscription          | `apps/compiler/cmd/server/handlers_billing.go` |
| Subscription Cancel  | Cancel existing subscription     | Webhook handling for status updates            |
| Webhook Handling     | Process Razorpay events          | `apps/compiler/internal/billing/webhook.go`    |
| Coupon System        | Discount, trial, upgrade coupons | `apps/compiler/internal/user/coupon.go`        |
| Invoice Generation   | Track payment invoices           | Stored in `invoices` table                     |

### Desktop Application

| Feature             | Description                  | Implementation                                                    |
| ------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Plan Display        | Show current plan in account | `apps/desktop/frontend/src/pages/Account.tsx`                     |
| Subscription Status | Active/inactive subscription | `apps/desktop/frontend/src/components/SubscriptionStatusCard.tsx` |
| Plan Comparison     | Compare tier features        | `apps/desktop/frontend/src/components/PlanComparisonTable.tsx`    |
| Upgrade Flow        | Redirect to billing          | Opens website billing page                                        |

### Website

| Feature           | Description               | Implementation                            |
| ----------------- | ------------------------- | ----------------------------------------- |
| Pricing Page      | Plan comparison with CTAs | `apps/website/src/components/Pricing.tsx` |
| Billing Dashboard | Manage subscription       | `apps/website/src/pages/Billing.tsx`      |
| Coupon Redemption | Apply discount codes      | Coupon input field                        |
| Invoice History   | View past invoices        | `apps/website/src/pages/Billing.tsx`      |

### Usage Limits

| Tier       | Monthly Builds | Storage | Concurrent Builds |
| ---------- | -------------- | ------- | ----------------- |
| Free       | 50             | 100 MB  | 1                 |
| Pro        | 500            | 5 GB    | 3                 |
| Enterprise | Unlimited      | 50 GB   | 10                |

---

## Cloud Features

### Compiler Backend

| Feature          | Description                  | Implementation               |
| ---------------- | ---------------------------- | ---------------------------- |
| Build History    | Store build records          | `builds` table in PostgreSQL |
| Usage Statistics | Track build counts, storage  | Aggregated queries           |
| Storage Tracking | Per-user storage usage       | Sum of artifact sizes        |
| Build Artifacts  | PDF, log, synctex files      | File system storage          |
| Signed URLs      | Time-limited artifact access | HMAC-based signing           |
| Delta-Sync       | Upload only changed files    | SHA256 checksum comparison   |

### Desktop Application

| Feature         | Description                   | Implementation                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------- |
| Cloud Dashboard | Usage stats and quick actions | `apps/desktop/frontend/src/pages/Dashboard.tsx`               |
| Build History   | Last 30 builds with details   | `apps/desktop/frontend/src/components/BuildHistoryTable.tsx`  |
| Storage Usage   | Visual storage indicator      | `apps/desktop/frontend/src/components/StorageUsageWidget.tsx` |

### Website

| Feature       | Description                         | Implementation                         |
| ------------- | ----------------------------------- | -------------------------------------- |
| Dashboard     | User stats and recent builds        | `apps/website/src/pages/Dashboard.tsx` |
| Usage Display | Monthly builds, storage, concurrent | Progress bars with limits              |

---

## Git Integration

### Desktop Application

| Feature        | Description                       | Implementation                       |
| -------------- | --------------------------------- | ------------------------------------ |
| Status Display | Show modified/added/deleted files | Git icon in sidebar header           |
| Commit         | Stage and commit with message     | Commit dialog with message input     |
| Push           | Push to remote repository         | `apps/desktop/bindings.go` (GitPush) |
| Pull           | Pull from remote repository       | `apps/desktop/bindings.go` (GitPull) |
| Branch Display | Show current branch               | Parsed from `git status`             |

---

## Renderer/Docker Management

### Desktop Application

| Feature                  | Description                    | Implementation                                  |
| ------------------------ | ------------------------------ | ----------------------------------------------- |
| Local Docker Renderer    | Run compiler in Docker         | `apps/desktop/docker.go`                        |
| Remote Renderer          | Use cloud compiler             | HTTP API calls                                  |
| Auto Mode                | Automatically detect best mode | Checks Docker availability                      |
| Custom Docker Images     | Use custom renderer images     | `apps/desktop/image_manager.go`                 |
| Image Sources            | GHCR, embedded, custom tar     | Multiple pull sources                           |
| Port Configuration       | Configure renderer port        | Default: 8080                                   |
| Auto-Start               | Start renderer on app launch   | Configurable in settings                        |
| Docker Disk Cleanup      | Prune unused Docker resources  | `apps/desktop/docker.go` (CleanupDockerSystem)  |
| Disk Space Monitoring    | Check Docker disk usage        | `apps/desktop/docker.go` (CheckDockerDiskSpace) |
| Remote Health Monitoring | Monitor remote compiler health | `apps/desktop/remote_monitor.go`                |
| Renderer Logs            | View container output          | Real-time log streaming                         |

### Configuration Options

| Setting         | Type                 | Default                                   | Description              |
| --------------- | -------------------- | ----------------------------------------- | ------------------------ |
| Mode            | auto/local/remote    | auto                                      | Renderer selection mode  |
| Port            | number               | 8080                                      | Local renderer port      |
| Auto-Start      | boolean              | false                                     | Start on app launch      |
| Image Source    | ghcr/embedded/custom | ghcr                                      | Docker image source      |
| Image Reference | string               | ghcr.io/alpha-og/treefrog/renderer:latest | Image to use             |
| Remote URL      | string               | -                                         | Remote compiler URL      |
| Remote Token    | string               | -                                         | Authentication token     |
| Custom Registry | string               | -                                         | Custom Docker registry   |
| Custom Tar Path | string               | -                                         | Path to custom image tar |

---

## Admin Features

### Compiler Backend

| Feature              | Description                   | Implementation                               |
| -------------------- | ----------------------------- | -------------------------------------------- |
| User Management      | List and view all users       | `apps/compiler/cmd/server/handlers_admin.go` |
| Tier Updates         | Change user subscription tier | Admin-only endpoint                          |
| Admin Status         | Grant/revoke admin privileges | Role management                              |
| Allowlist Management | Early access email allowlist  | `apps/compiler/internal/user/allowlist.go`   |
| Admin Stats          | Platform statistics           | Total users, builds, storage                 |
| Audit Logging        | Track admin actions           | `apps/compiler/internal/log/audit.go`        |

### API Endpoints

| Method | Endpoint                       | Description            |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/api/admin/allowlist`         | List allowlist entries |
| POST   | `/api/admin/allowlist`         | Add email to allowlist |
| DELETE | `/api/admin/allowlist/{email}` | Remove from allowlist  |
| GET    | `/api/admin/users`             | List all users         |
| GET    | `/api/admin/users/{id}`        | Get user details       |
| PUT    | `/api/admin/users/{id}/tier`   | Update user tier       |
| PUT    | `/api/admin/users/{id}/admin`  | Set admin status       |
| GET    | `/api/admin/stats`             | Get platform stats     |

---

## Infrastructure

### Compiler Backend

| Feature               | Description                      | Implementation                    |
| --------------------- | -------------------------------- | --------------------------------- |
| Rate Limiting         | Redis-backed request limiting    | Tier-based limits                 |
| Health Checks         | `/health` and `/ready` endpoints | Container orchestration support   |
| Graceful Shutdown     | Clean shutdown with timeout      | Signal handling                   |
| Cleanup Service       | Remove expired builds            | Hourly cleanup job                |
| Disk Space Monitoring | Alert on low disk space          | Warning/Critical/Emergency levels |

### Rate Limits by Tier

| Tier       | Builds/Hour | Uploads/Hour | Concurrent |
| ---------- | ----------- | ------------ | ---------- |
| Free       | 10          | 20           | 1          |
| Pro        | 50          | 100          | 3          |
| Enterprise | 200         | 500          | 10         |

### Desktop Application

| Feature                   | Description                    | Implementation             |
| ------------------------- | ------------------------------ | -------------------------- |
| Graceful Shutdown         | Clean exit handling            | Signal handling in main.go |
| Configuration Persistence | Save settings to disk          | JSON config file           |
| Logging                   | Structured logging with levels | Logrus integration         |

---

## API Endpoints

### Compiler Backend

#### Build Endpoints

| Method | Path                                  | Description         |
| ------ | ------------------------------------- | ------------------- |
| POST   | `/api/build`                          | Create new build    |
| GET    | `/api/build`                          | List user's builds  |
| GET    | `/api/build/{id}`                     | Get build details   |
| GET    | `/api/build/{id}/status`              | Get build status    |
| GET    | `/api/build/{id}/log`                 | Get build log       |
| DELETE | `/api/build/{id}`                     | Delete build        |
| GET    | `/api/build/{id}/pdf/url`             | Get signed PDF URL  |
| GET    | `/api/build/{id}/artifact/{resource}` | Serve artifact file |

#### Delta-Sync Endpoints

| Method | Path                           | Description                 |
| ------ | ------------------------------ | --------------------------- |
| POST   | `/api/builds/init`             | Initialize delta-sync build |
| POST   | `/api/builds/{buildId}/upload` | Upload files with checksums |

#### SyncTeX Endpoints

| Method | Path                           | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| GET    | `/api/build/{id}/synctex`      | Get SyncTeX file              |
| GET    | `/api/build/{id}/synctex/view` | Forward search (source → PDF) |
| GET    | `/api/build/{id}/synctex/edit` | Reverse search (PDF → source) |

#### Subscription Endpoints

| Method | Path                       | Description             |
| ------ | -------------------------- | ----------------------- |
| POST   | `/api/subscription/create` | Create subscription     |
| POST   | `/api/subscription/cancel` | Cancel subscription     |
| GET    | `/api/subscription/status` | Get subscription status |

#### User Endpoints

| Method | Path              | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/api/user/me`    | Get current user     |
| GET    | `/api/user/usage` | Get usage statistics |

#### Coupon Endpoints

| Method | Path                 | Description        |
| ------ | -------------------- | ------------------ |
| POST   | `/api/coupon/redeem` | Redeem coupon code |
| POST   | `/api/coupon/apply`  | Apply trial coupon |

#### Webhook Endpoints

| Method | Path                 | Description              |
| ------ | -------------------- | ------------------------ |
| POST   | `/webhooks/razorpay` | Razorpay webhook handler |

#### Health Endpoints

| Method | Path      | Description     |
| ------ | --------- | --------------- |
| GET    | `/health` | Health check    |
| GET    | `/ready`  | Readiness check |

---

## SyncTeX Support

### Compiler Backend

| Feature            | Description                    | Implementation                  |
| ------------------ | ------------------------------ | ------------------------------- |
| SyncTeX Generation | Generate .synctex.gz file      | latexmk output                  |
| Forward Search     | Source position → PDF position | `packages/go/synctex/parser.go` |
| Reverse Search     | PDF click → Source position    | `packages/go/synctex/parser.go` |
| Caching            | Cache parsed SyncTeX data      | LRU cache with size limit       |

### Desktop Application

| Feature           | Description                     | Implementation                           |
| ----------------- | ------------------------------- | ---------------------------------------- |
| Forward Search    | Ctrl+J or button to jump to PDF | `apps/desktop/bindings.go` (SyncTeXView) |
| Reverse Search    | Click PDF to jump to source     | `apps/desktop/bindings.go` (SyncTeXEdit) |
| Line Highlighting | Highlight active line in editor | Visual indicator                         |

---

## Configuration Files

### Desktop Application

| File        | Location                         | Purpose               |
| ----------- | -------------------------------- | --------------------- |
| Config      | `~/.config/treefrog/config.json` | App settings          |
| Auth        | `~/.config/treefrog/auth.json`   | Session tokens        |
| Image Cache | In-memory                        | Docker image metadata |

### Compiler Backend

| Variable                  | Default                | Description                  |
| ------------------------- | ---------------------- | ---------------------------- |
| `SERVER_PORT`             | 9000                   | HTTP server port             |
| `DATABASE_URL`            | -                      | PostgreSQL connection string |
| `REDIS_URL`               | redis://localhost:6379 | Redis connection             |
| `SUPABASE_URL`            | -                      | Supabase project URL         |
| `SUPABASE_SECRET_KEY`     | -                      | Supabase service role key    |
| `COMPILER_WORKDIR`        | /tmp/treefrog-builds   | Build directory              |
| `COMPILER_SIGNING_KEY`    | (random)               | URL signing key              |
| `RAZORPAY_KEY_ID`         | -                      | Razorpay key ID              |
| `RAZORPAY_KEY_SECRET`     | -                      | Razorpay secret              |
| `RAZORPAY_WEBHOOK_SECRET` | -                      | Webhook verification         |

---

## Keyboard Shortcuts

### Desktop Editor

| Shortcut                   | Action                   |
| -------------------------- | ------------------------ |
| `Ctrl+S` / `Cmd+S`         | Save file                |
| `Ctrl+Enter` / `Cmd+Enter` | Trigger build            |
| `Ctrl+J` / `Cmd+J`         | Forward search (SyncTeX) |
| `F2`                       | Rename selected file     |
| `Delete`                   | Delete selected file(s)  |
| `Enter`                    | Open selected file       |
| `Arrow Up/Down`            | Navigate file tree       |

---

## Future/Planned Features

The following features are noted as TODOs or incomplete in the codebase:

| Feature               | Location                                        | Notes                                  |
| --------------------- | ----------------------------------------------- | -------------------------------------- |
| Email Notifications   | `apps/compiler/internal/cleanup/service.go:316` | Admin disk alerts                      |
| Build Cancellation    | Desktop app                                     | Stop button exists, no backend handler |
| LRU Cache for SyncTeX | `packages/go/synctex/parser.go:446`             | Random eviction currently              |
| Multi-tab Editor      | Desktop                                         | Planned feature                        |
| Config Validation     | `apps/desktop/app.go:215`                       | No validation on load                  |
| Payment Update Flow   | `apps/website/src/pages/Billing.tsx:116`        | Placeholder redirect                   |
| `/builds` Route       | `apps/website/src/pages/Dashboard.tsx:188`      | Linked but not defined                 |

---

_Last updated: 2026-02-14_

