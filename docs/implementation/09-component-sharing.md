# Component Sharing Architecture: Desktop ↔ Web Editor

## Overview

This document details the plan to migrate desktop UI components to a shared package (`@treefrog/ui`) so both the desktop and future web editor implementations can use the same component library.

**Status:** In Progress  
**Timeline:** Phased rollout (4 phases)  
**Breaking Changes:** YES - but acceptable (pre-production)  
**Risk Level:** MEDIUM (animation context coupling)

---

## Architecture Goals

1. **Single Source of Truth:** All UI components live in `@treefrog/ui`
2. **Animation Consistency:** Both desktop and web use identical animations
3. **Animation Context:** Shared animation system with automatic fallbacks
4. **Zero Duplicates:** No component duplication between packages
5. **Maintainability:** Changes to components apply to both platforms automatically

---

## Current State Analysis

### Desktop Components (1,745 lines)
- **Location:** `desktop/frontend/src/components/common/`
- **Type:** 14 enhanced components with motion animations
- **Dependencies:** motion, lucide-react, @radix-ui/*
- **Animation Context:** Desktop-specific hooks for animation control

### Existing Shared Package
- **Location:** `packages/ui/src/`
- **Type:** 12 base components (simple shadcn/ui style)
- **Missing:** Animation support, enhanced features
- **Issue:** These are DIFFERENT from desktop components

### Animation System
- **Location:** `desktop/frontend/src/lib/`
  - `animation-context.tsx` - React context provider
  - `animations.ts` - Variant definitions (~200 lines)
  - `animation-utils.ts` - Helper utilities
- **Problem:** Not shared, desktop-only

---

## Issues Identified

### Critical Issues
1. **Animation context is not portable** - throws errors if `AnimationProvider` missing
2. **Tight coupling to motion library** - 1,745 lines of motion code across components
3. **No shared animation utilities** - animation definitions buried in desktop lib
4. **Duplicate base components** - `packages/ui` has simpler versions than desktop `common/`

### Medium Issues
5. **"use client" directives missing** - required for Next.js web support
6. **CSS class dependencies** - `glow-card` class location unknown
7. **Input/Select mismatch** - desktop versions are 2-3x more complex
8. **Dependency conflicts** - `packages/ui` doesn't have `motion` yet
9. **No tests for animated components** - moving untested code is risky
10. **35+ import paths need updating** - high refactoring scope

---

## Phase 0: Foundation (Animation Infrastructure)

### Objectives
- Extract animation utilities from desktop to shared package
- Add motion dependency to packages/ui
- Ensure desktop still works with updated imports

### Deliverables

#### 0.1: Extract Animation Context
**Files to create:**
```
packages/ui/src/
├── animation-context.tsx       (new - copied from desktop/lib)
├── animations.ts               (new - copied from desktop/lib)
├── animation-utils.ts          (new - copied from desktop/lib)
└── index.ts                    (updated - export animations)
```

**Implementation:**
1. Copy `desktop/frontend/src/lib/animation-context.tsx` → `packages/ui/src/animation-context.tsx`
2. Copy `desktop/frontend/src/lib/animations.ts` → `packages/ui/src/animations.ts`
3. Copy `desktop/frontend/src/lib/animation-utils.ts` → `packages/ui/src/animation-utils.ts`
4. Update exports in `packages/ui/src/index.ts`:
   ```typescript
   export { 
     AnimationProvider, 
     useAnimation, 
     useReducedMotion,
     useAnimationVariant,
     useAnimationDuration 
   } from './animation-context'
   
   export {
     fadeInUp,
     cardHover,
     cardHoverGlow,
     // ... all animation variants
   } from './animations'
   ```

#### 0.2: Update Packages Configuration
**File:** `packages/ui/package.json`
```json
{
  "dependencies": {
    "motion": "^12.34.0",           // NEW
    "lucide-react": "^0.563.0",     // already exists
    "@radix-ui/react-dialog": "^1.1.1",
    // ... rest of dependencies
  }
}
```

#### 0.3: Update Desktop Imports
**Replace all** `desktop/frontend/src/components/` imports from local lib:
- Change: `import { useAnimation } from "@/lib/animation-context"`
- To: `import { useAnimation } from "@treefrog/ui"`

**Files affected:**
- `desktop/frontend/src/components/common/*.tsx` (all 14 files)
- `desktop/frontend/src/components/*.tsx` (components using common)
- `desktop/frontend/src/lib/animation-context.tsx` - DELETE
- `desktop/frontend/src/lib/animations.ts` - DELETE
- `desktop/frontend/src/lib/animation-utils.ts` - DELETE

#### 0.4: Verification Checkpoint
```bash
# Desktop should still build and run
make dev

# No import errors
grep -r "from.*lib/animation" desktop/frontend/src/

# All animation imports point to @treefrog/ui
grep -r "useAnimation\|fadeInUp" desktop/frontend/src/ | grep "@treefrog/ui"
```

---

## Phase 1: Remove Duplicates

### Objectives
- Delete `desktop/frontend/src/components/ui/` directory (duplicates packages/ui)
- Update all imports to use `@treefrog/ui` instead of `@/components/ui`

### Deliverables

#### 1.1: Find All References
```bash
find desktop/frontend/src -name "*.tsx" -exec grep -l "@/components/ui" {} \;
```

Expected files: ~50+ files importing from components/ui

#### 1.2: Update Imports (Bulk Find-Replace)
**Pattern:** `from "@/components/ui/` → `from "@treefrog/ui"`

**Examples:**
```typescript
// Before
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// After
import { Button } from "@treefrog/ui"
import { Dialog, DialogContent } from "@treefrog/ui"
```

**Files to update:** (see Phase 1.3 for list)

#### 1.3: Delete Duplicate Directory
```bash
rm -rf desktop/frontend/src/components/ui/
```

This removes:
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `context-menu.tsx`
- `select.tsx`
- `input.tsx`
- `label.tsx`
- `skeleton.tsx`
- `switch.tsx`
- `tabs.tsx`
- `sonner.tsx`
- `utils.ts`
- `index.ts`

#### 1.4: Verification Checkpoint
```bash
# No references to deleted directory remain
grep -r "@/components/ui" desktop/frontend/src/
# Should return: 0 matches

# Desktop still builds
make dev
```

---

## Phase 2: Component Migration

### Objectives
- Move 14 enhanced components from desktop to packages/ui
- Replace simple versions in packages/ui with enhanced versions
- Add "use client" directives for Next.js compatibility

### Deliverables

#### 2.1: Core Enhanced Components

**Components to migrate:**
1. `Button.tsx` - Motion animations, loading state, variant states
2. `Card.tsx` + `GlowCard.tsx` - Stagger animations, hover effects
3. `Dialog.tsx` - Modal animations, backdrop fade
4. `Alert.tsx` + `Toast.tsx` - Notification animations
5. `Badge.tsx` - Pulse animations, entrance effects
6. `Toggle.tsx` - Switch animations with spring
7. `LoadingSpinner.tsx` - Animated spinner component
8. `Input.tsx` - Enhanced with error animation, icons
9. `Select.tsx` - Enhanced with animation variants
10. `ContextMenuWrapper.tsx` - Menu animations + styling
11. `DropdownMenuWrapper.tsx` - Menu animations + styling
12. `MenuIcons.tsx` - Icon utilities
13. `MenuShortcut.tsx` - Shortcut styling

**Implementation process for each component:**
1. Copy from `desktop/frontend/src/components/common/[Component].tsx`
2. Paste to `packages/ui/src/[component].tsx` (kebab-case)
3. Add `"use client"` directive at top
4. Update internal imports to use relative paths or @treefrog/ui
5. Ensure no desktop-specific imports remain

**Example transformation (Button):**
```typescript
// desktop/frontend/src/components/common/Button.tsx
import { useAnimation } from "@/lib/animation-context"
import { fadeIn } from "@/lib/animations"

// becomes packages/ui/src/button.tsx
"use client"
import { useAnimation } from "./animation-context"
import { fadeIn } from "./animations"
```

#### 2.2: File Structure After Migration

```
packages/ui/src/
├── animation-context.tsx        (from Phase 0)
├── animations.ts                (from Phase 0)
├── animation-utils.ts           (from Phase 0)
├── alert.tsx                    (NEW - from desktop/common/Alert.tsx)
├── badge.tsx                    (NEW - from desktop/common/Badge.tsx)
├── button.tsx                   (REPLACE - desktop version)
├── card.tsx                     (REPLACE - desktop version)
├── context-menu-wrapper.tsx     (NEW - from desktop/common/Menu)
├── dialog.tsx                   (REPLACE - desktop version)
├── dropdown-menu-wrapper.tsx    (NEW - from desktop/common/Menu)
├── input.tsx                    (REPLACE - desktop version)
├── loading-spinner.tsx          (NEW - from desktop/common/LoadingSpinner.tsx)
├── menu-icons.tsx               (NEW - from desktop/common/Menu)
├── menu-shortcut.tsx            (NEW - from desktop/common/Menu)
├── select.tsx                   (REPLACE - desktop version)
├── toggle.tsx                   (NEW - from desktop/common/Toggle.tsx)
├── index.ts                     (UPDATED - exports all)
└── utils.ts                     (existing)
```

#### 2.3: Updated Exports

**File:** `packages/ui/src/index.ts`
```typescript
"use client"

// Animation system
export {
  AnimationProvider,
  useAnimation,
  useReducedMotion,
  useAnimationVariant,
  useAnimationDuration,
} from './animation-context'

export {
  ANIMATION_DURATIONS,
  ANIMATION_DELAYS,
  fadeInUp,
  fadeInDown,
  // ... all animation variants
} from './animations'

// Enhanced UI Components
export { Alert, Toast, type AlertVariant } from './alert'
export { Badge, badgeVariants, type BadgeProps } from './badge'
export { Button, buttonVariants, type ButtonProps } from './button'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  GlowCard,
  type CardProps,
} from './card'
export {
  ContextMenuWrapper,
  ContextMenuContentWrapper,
  MenuItem as ContextMenuItem,
  MenuCheckboxItem as ContextMenuCheckboxItem,
  MenuRadioItem as ContextMenuRadioItem,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuRadioGroup,
} from './context-menu-wrapper'
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'
export {
  DropdownMenuWrapper,
  DropdownMenuContentWrapper,
  MenuItem as DropdownMenuItem,
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuRadioItem as DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
} from './dropdown-menu-wrapper'
export { Input, type InputProps } from './input'
export { LoadingSpinner, type LoadingSpinnerProps } from './loading-spinner'
export { MenuIcons } from './menu-icons'
export { MenuShortcut } from './menu-shortcut'
export { Select, type SelectProps } from './select'
export { Toggle, type ToggleProps } from './toggle'

// Re-export utils
export { cn } from './utils'
```

#### 2.4: Verification Checkpoint
```bash
# Build packages/ui
cd packages && pnpm build

# Check exports are valid
grep -r "export.*from.*icon\|lucide" packages/ui/src/ | wc -l
# Should find all lucide imports

# No desktop-specific imports remain
grep -r "@/lib/\|@/components/\|@/stores/" packages/ui/src/ | grep -v "@/ui"
# Should return: 0 matches
```

---

## Phase 3: Update Desktop Imports

### Objectives
- Update all `@/components/common/` imports to use `@treefrog/ui`
- Clean up redundant imports
- Ensure animation context comes from shared package

### Deliverables

#### 3.1: Find All References
```bash
grep -r "from.*@/components/common" desktop/frontend/src --include="*.tsx" | wc -l
```

Expected: ~35+ files

#### 3.2: Bulk Import Updates

**Pattern matching and replacement:**

| Old Pattern | New Pattern | Impact |
|---|---|---|
| `from "@/components/common/Button"` | `from "@treefrog/ui"` | ~10 files |
| `from "@/components/common/Card"` | `from "@treefrog/ui"` | ~5 files |
| `from "@/components/common/Dialog"` | `from "@treefrog/ui"` | ~3 files |
| `from "@/components/common/Alert"` | `from "@treefrog/ui"` | ~3 files |
| `from "@/components/common/Input"` | `from "@treefrog/ui"` | ~6 files |
| `from "@/components/common/Menu"` | `from "@treefrog/ui"` | ~4 files |
| `from "@/components/common/LoadingSpinner"` | `from "@treefrog/ui"` | ~2 files |
| `from "@/components/common/Badge"` | `from "@treefrog/ui"` | ~2 files |

#### 3.3: Example Transformations

**File:** `desktop/frontend/src/components/UserMenu.tsx`
```typescript
// Before
import { Button } from "@/components/common/Button"
import { 
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContent,
  MenuItem,
  DropdownMenuSeparator
} from "@/components/common/Menu"

// After
import { 
  Button,
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem as MenuItem,
  DropdownMenuSeparator
} from "@treefrog/ui"
```

**File:** `desktop/frontend/src/pages/Settings.tsx`
```typescript
// Before
import { Button } from "@/components/common/Button"
import { GlowCard } from "@/components/common/Card"
import { Input } from "@/components/common/Input"
import { useAnimation } from "@/lib/animation-context"

// After
import { 
  Button,
  GlowCard,
  Input,
  useAnimation
} from "@treefrog/ui"
```

#### 3.4: Script-Based Updates (Recommended)

Create bash script `update-imports.sh`:
```bash
#!/bin/bash
cd desktop/frontend/src

# Update all common component imports to @treefrog/ui
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Button"|from "@treefrog/ui"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Card"|from "@treefrog/ui"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Dialog"|from "@treefrog/ui"|g' {} \;

# ... repeat for all components

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context"|from "@treefrog/ui"|g' {} \;
```

#### 3.5: Verification Checkpoint
```bash
# No references to old paths remain
grep -r "@/components/common" desktop/frontend/src/ | grep -v ".md"
# Should return: 0 matches

grep -r "@/lib/animation" desktop/frontend/src/ | grep -v ".md"
# Should return: 0 matches

# All imports from @treefrog/ui exist in the package
grep -r "from \"@treefrog/ui\"" desktop/frontend/src/ | head -5
```

---

## Phase 4: Cleanup & Verification

### Objectives
- Remove old empty directory
- Verify desktop builds and runs
- Create web implementation guide
- Document breaking changes

### Deliverables

#### 4.1: Remove Old Directory
```bash
# Verify it's empty first
ls -la desktop/frontend/src/components/common/

# Delete the directory
rm -rf desktop/frontend/src/components/common/
```

#### 4.2: Verify Desktop Build

**Full build test:**
```bash
# Navigate to root
cd /Users/athulanoop/software_projects/treefrog

# Install dependencies
pnpm install

# Run desktop dev mode
make dev

# Expected output:
# - No TypeScript errors
# - No import errors
# - App launches successfully
# - Animations work correctly
```

**Check points:**
- [ ] Desktop app launches
- [ ] All buttons animate on hover
- [ ] Cards show hover effects
- [ ] Dialogs open/close with animations
- [ ] No console errors
- [ ] Reduced motion preference works

#### 4.3: Type Checking
```bash
cd desktop/frontend

# Run TypeScript check
npx tsc --noEmit

# Expected: 0 errors
```

#### 4.4: Remove Unused Tsconfig Paths

**File:** `desktop/frontend/tsconfig.json`

Remove line if it exists:
```json
{
  "compilerOptions": {
    "paths": {
      // Remove this if it still points to old location
      "@treefrog/ui": ["../../packages/ui/src"]  // Already here from Phase 1
    }
  }
}
```

---

## Migration Checklist

### Phase 0: Foundation
- [ ] Copy animation-context.tsx to packages/ui
- [ ] Copy animations.ts to packages/ui
- [ ] Copy animation-utils.ts to packages/ui
- [ ] Update packages/ui/package.json (add motion dependency)
- [ ] Update packages/ui/src/index.ts (export animations)
- [ ] Update desktop imports from @/lib → @treefrog/ui
- [ ] Delete animation files from desktop/frontend/src/lib
- [ ] Desktop builds successfully: `make dev`
- [ ] No animation import errors remain

### Phase 1: Remove Duplicates
- [ ] Find all @/components/ui imports (grep)
- [ ] Update all imports to @treefrog/ui (50+ files)
- [ ] Delete desktop/frontend/src/components/ui/ directory
- [ ] Verify no references to deleted directory remain
- [ ] Desktop builds successfully: `make dev`

### Phase 2: Component Migration
- [ ] Migrate Button.tsx to packages/ui
- [ ] Migrate Card.tsx + GlowCard to packages/ui
- [ ] Migrate Dialog.tsx to packages/ui
- [ ] Migrate Alert.tsx + Toast to packages/ui
- [ ] Migrate Badge.tsx to packages/ui
- [ ] Migrate Toggle.tsx to packages/ui
- [ ] Migrate LoadingSpinner.tsx to packages/ui
- [ ] Migrate Input.tsx to packages/ui
- [ ] Migrate Select.tsx to packages/ui
- [ ] Migrate ContextMenuWrapper.tsx + helpers to packages/ui
- [ ] Migrate DropdownMenuWrapper.tsx + helpers to packages/ui
- [ ] Add "use client" directive to all components
- [ ] Update packages/ui/src/index.ts with all exports
- [ ] Build packages/ui: `cd packages && pnpm build`
- [ ] Type check packages/ui: `npx tsc --noEmit`

### Phase 3: Update Desktop
- [ ] Find all @/components/common imports
- [ ] Update all imports to @treefrog/ui (bulk find-replace)
- [ ] Verify no old imports remain
- [ ] Type check desktop: `npx tsc --noEmit`
- [ ] Desktop builds successfully: `make dev`

### Phase 4: Cleanup
- [ ] Delete desktop/frontend/src/components/common/ directory
- [ ] Delete animation files from desktop/frontend/src/lib/
- [ ] Run full desktop build: `make build`
- [ ] Test all animations in desktop app
- [ ] Update tsconfig.json if needed
- [ ] Update Makefile documentation
- [ ] Commit changes with message: "refactor: move UI components to shared @treefrog/ui package"

---

## Web Implementation Guide (Post-Migration)

After desktop refactoring is complete, web editor setup will require:

### 1. Install Package
```bash
npm install @treefrog/ui
```

### 2. Add AnimationProvider
```typescript
// app.tsx or root component
import { AnimationProvider } from '@treefrog/ui'

export default function App() {
  return (
    <AnimationProvider initialAnimationsEnabled={true}>
      {/* Your app */}
    </AnimationProvider>
  )
}
```

### 3. Use Components
```typescript
import { Button, Card, Dialog, useAnimation } from '@treefrog/ui'

export function Editor() {
  const { animationsEnabled } = useAnimation()
  
  return (
    <Card>
      <Button>Compile</Button>
    </Card>
  )
}
```

### 4. CSS & Tailwind Setup
Ensure web project has:
- Tailwind CSS configured
- Radix UI peer dependencies installed
- Motion library available
- Lucide React icons

See `10-web-editor-setup.md` for complete guide.

---

## Rollback Plan

If any phase fails, revert using Git:

```bash
# List recent commits
git log --oneline -10

# Revert to last known good state
git reset --hard <commit-hash>

# Or cherry-pick specific commits
git revert <commit-hash>
```

---

## Performance Considerations

### Bundle Size Impact
- **Before:** Desktop has inline animation code (~1.7KB gzipped in desktop only)
- **After:** Shared in packages/ui (~1.7KB gzipped, shared across projects)
- **Result:** No net increase, enables sharing

### Package Installation
- packages/ui now includes motion dependency
- Web project can optionally use simpler components without animations (future optimization)
- Current approach: both projects use full animated components

---

## Future Optimizations

After successful migration:

1. **Animation Variants Library** - Create `@treefrog/animations` for pure animation definitions
2. **Component Tests** - Add test suite for all components
3. **Storybook Integration** - Visual component documentation
4. **Theme System** - CSS variable-based theming for both platforms
5. **Web-Optimized Build** - Separate bundle for web without desktop-specific components

---

## Questions & Support

**Q: What if desktop build fails during Phase 1?**
A: Use git reset to revert, then debug imports step-by-step

**Q: Can I run multiple phases in parallel?**
A: No - each phase depends on the previous one. Follow sequentially.

**Q: What about animation performance on web?**
A: Motion library is optimized for both platforms. Can disable animations in settings if needed.

**Q: How do I handle version updates to components?**
A: All updates to packages/ui automatically apply to both desktop and web

**Q: What if web needs different animations?**
A: Can override at component level using `animated={false}` prop, then apply custom CSS/Motion animations

---

## Success Criteria

✅ **Phase 0 Success:**
- Desktop still launches with animations
- All animation imports from @treefrog/ui

✅ **Phase 1 Success:**
- No references to @/components/ui remain
- Desktop builds without errors
- No console errors about missing components

✅ **Phase 2 Success:**
- packages/ui builds successfully
- Type checking passes
- All exports available

✅ **Phase 3 Success:**
- All @/components/common imports updated
- Desktop builds without errors
- Animations work correctly in app

✅ **Phase 4 Success:**
- Old directories deleted
- Full desktop build completes
- All UI interactions work
- No broken imports or errors

---

## Timeline Estimate

| Phase | Tasks | Duration | Risk |
|-------|-------|----------|------|
| Phase 0 | Extract animations | 30 min | LOW |
| Phase 1 | Remove duplicates | 1 hour | MEDIUM |
| Phase 2 | Migrate components | 2 hours | MEDIUM |
| Phase 3 | Update imports | 1 hour | MEDIUM |
| Phase 4 | Cleanup & verify | 30 min | LOW |
| **Total** | **All phases** | **~5 hours** | **MEDIUM** |

---

## Document History

| Date | Author | Status | Notes |
|------|--------|--------|-------|
| 2026-02-12 | OpenCode | Draft | Initial comprehensive plan |
| - | - | - | - |
