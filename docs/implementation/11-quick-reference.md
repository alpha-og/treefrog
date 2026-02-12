# Component Sharing: Quick Reference & Execution Commands

## Executive Summary

- **Goal:** Move 14 desktop UI components to shared `@treefrog/ui` package
- **Scope:** Animation context, animated components, menu wrappers
- **Duration:** ~5 hours (4 phases)
- **Risk:** MEDIUM (animation coupling, bulk import updates)
- **Status:** Ready for execution

---

## Phase Execution Checklist

### PHASE 0: Foundation (30 min)

```bash
# 0.1: Extract animation utilities
cp desktop/frontend/src/lib/animation-context.tsx packages/ui/src/
cp desktop/frontend/src/lib/animations.ts packages/ui/src/
cp desktop/frontend/src/lib/animation-utils.ts packages/ui/src/

# 0.2: Update packages/ui/package.json
# (Add "motion": "^12.34.0" to dependencies)

# 0.3: Update packages/ui/src/index.ts
# (Add exports for animation utilities - see 09-component-sharing.md Phase 0.3)

# 0.4: Update desktop imports
find desktop/frontend/src -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context|from "@treefrog/ui|g' {} \;

find desktop/frontend/src -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animations|from "@treefrog/ui|g' {} \;

find desktop/frontend/src -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-utils|from "@treefrog/ui|g' {} \;

# 0.5: Verification
grep -r "from.*@/lib/animation" desktop/frontend/src/ | wc -l
# Should output: 0

# 0.6: Test desktop build
cd desktop && pnpm dev
# ✅ Should launch without errors
```

---

### PHASE 1: Remove Duplicates (1 hour)

```bash
# 1.1: Count references to update
grep -r "from \"@/components/ui" desktop/frontend/src --include="*.tsx" | wc -l
# Should show: ~50+ matches

# 1.2: Update all imports (bulk sed)
cd desktop/frontend/src

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/|from "@treefrog/ui"|g' {} \;

# Special case: named imports need adjustment
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "\./components/ui/|from "@treefrog/ui"|g' {} \;

# 1.3: Verify no old references remain
grep -r "@/components/ui" . --include="*.tsx" | wc -l
# Should output: 0

# 1.4: Delete duplicate directory
rm -rf components/ui

# 1.5: Type check
cd .. && npx tsc --noEmit

# 1.6: Test desktop build
pnpm dev
# ✅ Should launch without errors
```

---

### PHASE 2: Migrate Components (2 hours)

```bash
# 2.1: Create destination in packages/ui/src
cd packages/ui/src

# 2.2: Copy enhanced components (from desktop/frontend/src/components/common/)
cp ../../../desktop/frontend/src/components/common/Alert.tsx ./alert.tsx
cp ../../../desktop/frontend/src/components/common/Badge.tsx ./badge.tsx
cp ../../../desktop/frontend/src/components/common/Button.tsx ./button.tsx
cp ../../../desktop/frontend/src/components/common/Card.tsx ./card.tsx
cp ../../../desktop/frontend/src/components/common/Dialog.tsx ./dialog.tsx
cp ../../../desktop/frontend/src/components/common/Input.tsx ./input.tsx
cp ../../../desktop/frontend/src/components/common/LoadingSpinner.tsx ./loading-spinner.tsx
cp ../../../desktop/frontend/src/components/common/Select.tsx ./select.tsx
cp ../../../desktop/frontend/src/components/common/Toggle.tsx ./toggle.tsx

# 2.3: Copy menu components
mkdir -p ./menu
cp ../../../desktop/frontend/src/components/common/Menu/ContextMenuWrapper.tsx ./context-menu-wrapper.tsx
cp ../../../desktop/frontend/src/components/common/Menu/DropdownMenuWrapper.tsx ./dropdown-menu-wrapper.tsx
cp ../../../desktop/frontend/src/components/common/Menu/MenuIcons.tsx ./menu-icons.tsx
cp ../../../desktop/frontend/src/components/common/Menu/MenuShortcut.tsx ./menu-shortcut.tsx

# 2.4: Add "use client" directive to all new files
for file in alert.tsx badge.tsx button.tsx card.tsx dialog.tsx input.tsx loading-spinner.tsx select.tsx toggle.tsx context-menu-wrapper.tsx dropdown-menu-wrapper.tsx menu-icons.tsx menu-shortcut.tsx; do
  sed -i '' '1i\
"use client"\
' "$file"
done

# 2.5: Update imports in copied files
# Change all: "from "@/lib/animation-context" -> "from "./animation-context"
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context|from "./animation-context|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animations|from "./animations|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/utils|from "./utils|g' {} \;

# 2.6: Update packages/ui/src/index.ts
# (Replace entire exports section - see 09-component-sharing.md Phase 2.3)

# 2.7: Build packages/ui
cd ../../ && pnpm install && pnpm build
# ✅ Should complete without errors

# 2.8: Type check
npx tsc --noEmit
# ✅ Should show 0 errors
```

---

### PHASE 3: Update Desktop Imports (1 hour)

```bash
cd desktop/frontend/src

# 3.1: Replace all common component imports
for component in Button Card Dialog Alert Input Select Badge Toggle LoadingSpinner; do
  find . -name "*.tsx" -type f -exec sed -i '' \
    "s|from \"@/components/common/${component}\"|from \"@treefrog/ui\"|g" {} \;
done

# 3.2: Replace Menu imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Menu"|from "@treefrog/ui"|g' {} \;

# 3.3: Consolidate imports from @treefrog/ui
# (Manual or automated: group multiple imports into single statement)

# 3.4: Type check
cd .. && npx tsc --noEmit
# ✅ Should show 0 errors

# 3.5: Test desktop build
pnpm dev
# ✅ Should launch without errors and animations work
```

---

### PHASE 4: Cleanup (30 min)

```bash
# 4.1: Verify old directory is safe to delete
ls -la desktop/frontend/src/components/common/
# Confirm it exists and will be deleted

# 4.2: Delete old component directory
rm -rf desktop/frontend/src/components/common/

# 4.3: Verify no broken imports
grep -r "@/components/common" desktop/frontend/src/ | wc -l
# Should output: 0

# 4.4: Full type check
cd desktop/frontend && npx tsc --noEmit
# ✅ Should show 0 errors

# 4.5: Full build test
pnpm build
# ✅ Should complete successfully

# 4.6: Smoke test
pnpm dev
# ✅ Launch app and verify:
#    - All buttons animate correctly
#    - Dialogs open/close with animations
#    - Cards show hover effects
#    - No console errors
#    - Reduced motion preference works
```

---

## All Commands in One Script

Create `refactor-components.sh`:

```bash
#!/bin/bash
set -e

echo "=== Phase 0: Foundation ==="
echo "Extracting animation utilities..."
cp desktop/frontend/src/lib/animation-context.tsx packages/ui/src/
cp desktop/frontend/src/lib/animations.ts packages/ui/src/
cp desktop/frontend/src/lib/animation-utils.ts packages/ui/src/

echo "Updating packages/ui/package.json..."
# Manual: Add motion dependency

echo "Updating desktop imports..."
cd desktop/frontend/src
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context|from "@treefrog/ui|g' {} \;
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animations|from "@treefrog/ui|g' {} \;
cd ../../..

echo "Phase 0: ✅ Complete"

echo "=== Phase 1: Remove Duplicates ==="
echo "Updating imports..."
cd desktop/frontend/src
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/|from "@treefrog/ui"|g' {} \;
cd ../../..

echo "Deleting duplicate directory..."
rm -rf desktop/frontend/src/components/ui

echo "Phase 1: ✅ Complete"

echo "=== Phase 2: Migrate Components ==="
echo "Copying components..."
cd packages/ui/src
cp ../../../desktop/frontend/src/components/common/*.tsx ./
# ... adjust filenames as needed
cd ../../..

echo "Adding 'use client' directives..."
cd packages/ui/src
for file in *.tsx; do
  sed -i '' '1i\
"use client"\
' "$file"
done
cd ../../..

echo "Building packages/ui..."
cd packages && pnpm install && pnpm build
cd ..

echo "Phase 2: ✅ Complete"

echo "=== Phase 3: Update Desktop ==="
echo "Consolidating imports..."
cd desktop/frontend
npx tsc --noEmit
pnpm dev &
sleep 5
kill %1

echo "Phase 3: ✅ Complete"

echo "=== Phase 4: Cleanup ==="
echo "Removing old directories..."
rm -rf desktop/frontend/src/components/common/
rm -rf desktop/frontend/src/lib/animation-context.tsx
rm -rf desktop/frontend/src/lib/animations.ts
rm -rf desktop/frontend/src/lib/animation-utils.ts

echo "Final verification..."
cd desktop/frontend
npx tsc --noEmit
pnpm build

echo "=== ✅ ALL PHASES COMPLETE ==="
```

---

## File Movement Summary

### Extracted (to packages/ui)
```
desktop/frontend/src/lib/animation-context.tsx → packages/ui/src/animation-context.tsx
desktop/frontend/src/lib/animations.ts → packages/ui/src/animations.ts
desktop/frontend/src/lib/animation-utils.ts → packages/ui/src/animation-utils.ts

desktop/frontend/src/components/common/Alert.tsx → packages/ui/src/alert.tsx
desktop/frontend/src/components/common/Badge.tsx → packages/ui/src/badge.tsx
desktop/frontend/src/components/common/Button.tsx → packages/ui/src/button.tsx
desktop/frontend/src/components/common/Card.tsx → packages/ui/src/card.tsx
desktop/frontend/src/components/common/Dialog.tsx → packages/ui/src/dialog.tsx
desktop/frontend/src/components/common/Input.tsx → packages/ui/src/input.tsx
desktop/frontend/src/components/common/LoadingSpinner.tsx → packages/ui/src/loading-spinner.tsx
desktop/frontend/src/components/common/Select.tsx → packages/ui/src/select.tsx
desktop/frontend/src/components/common/Toggle.tsx → packages/ui/src/toggle.tsx
desktop/frontend/src/components/common/Menu/ContextMenuWrapper.tsx → packages/ui/src/context-menu-wrapper.tsx
desktop/frontend/src/components/common/Menu/DropdownMenuWrapper.tsx → packages/ui/src/dropdown-menu-wrapper.tsx
desktop/frontend/src/components/common/Menu/MenuIcons.tsx → packages/ui/src/menu-icons.tsx
desktop/frontend/src/components/common/Menu/MenuShortcut.tsx → packages/ui/src/menu-shortcut.tsx
```

### Deleted
```
desktop/frontend/src/components/ui/             (entire directory - duplicates)
desktop/frontend/src/components/common/         (entire directory - moved to packages/ui)
desktop/frontend/src/lib/animation-context.tsx  (moved to packages/ui)
desktop/frontend/src/lib/animations.ts          (moved to packages/ui)
desktop/frontend/src/lib/animation-utils.ts     (moved to packages/ui)
```

### Updated (imports only)
```
50+ files in desktop/frontend/src/
  @/components/ui/* → @treefrog/ui
  @/components/common/* → @treefrog/ui
  @/lib/animation-* → @treefrog/ui
```

---

## Success Validation

### After Each Phase

**Phase 0:**
- [ ] `grep -r "@/lib/animation" desktop/` returns 0
- [ ] `make dev` launches desktop app
- [ ] Animations work correctly

**Phase 1:**
- [ ] `grep -r "@/components/ui" desktop/` returns 0
- [ ] `rm -rf desktop/.../components/ui/` succeeds
- [ ] `make dev` launches desktop app

**Phase 2:**
- [ ] `cd packages && pnpm build` succeeds
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] All components export from `@treefrog/ui`

**Phase 3:**
- [ ] `grep -r "@/components/common" desktop/` returns 0
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] `make dev` launches and works

**Phase 4:**
- [ ] `rm -rf desktop/.../components/common/` succeeds
- [ ] `make build` completes successfully
- [ ] Manual smoke test: all UI works correctly

---

## Rollback Commands

If any step fails:

```bash
# Check git status
git status

# See what changed
git diff --stat

# Revert last commit
git reset --hard HEAD~1

# Or revert to specific commit
git log --oneline -10
git reset --hard <commit-hash>
```

---

## Expected Build Times

| Phase | Task | Time | Notes |
|-------|------|------|-------|
| 0 | Extract + update imports | 5 min | Mostly cp/sed operations |
| 0 | Test desktop | 10 min | First full build |
| 1 | Update 50+ files | 10 min | Bulk sed operations |
| 1 | Delete directory + test | 5 min | Fast |
| 2 | Copy components | 5 min | 13 files |
| 2 | Add use client + fix imports | 10 min | sed + manual edits |
| 2 | Build packages/ui | 15 min | First full pnpm build |
| 3 | Update desktop imports | 5 min | Mostly already done |
| 3 | Type check + test | 10 min | Full desktop build |
| 4 | Delete + verify | 5 min | Cleanup |
| 4 | Final build | 15 min | Production build |
| **TOTAL** | **All phases** | **~90 min** | **1.5 hours** |

*Note: Actual times depend on machine specs. Typical: 45 min - 2 hours*

---

## Monitoring & Debugging

### Check Phase 0 Status
```bash
# Animation context available
grep -r "from.*@treefrog/ui.*animation" desktop/frontend/src/ | head -3

# Animation definitions available
grep -r "ANIMATION_DURATIONS\|fadeInUp" packages/ui/src/ | head -3
```

### Check Phase 1 Status
```bash
# No duplicate imports
grep -r "@/components/ui" desktop/ | grep -v ".git" | grep -v node_modules

# Directory deleted
ls desktop/frontend/src/components/ui/
# Should show: No such file
```

### Check Phase 2 Status
```bash
# Components in packages/ui
ls packages/ui/src/*.tsx | grep -E "alert|badge|button|card" | wc -l
# Should show: 4+

# Exports available
grep "export.*from.*alert\|badge\|button" packages/ui/src/index.ts | head -3
```

### Check Phase 3 Status
```bash
# Desktop using shared UI
grep -r "from \"@treefrog/ui\"" desktop/frontend/src/ | wc -l
# Should show: 30+
```

### Check Phase 4 Status
```bash
# Old directories gone
ls desktop/frontend/src/components/common/ 2>&1 | grep "No such"
ls desktop/frontend/src/components/ui/ 2>&1 | grep "No such"
```

---

## Common Issues & Solutions

### Issue: "Cannot find module" after Phase 0

**Cause:** Animation context not exported from @treefrog/ui  
**Fix:**
```bash
# Verify exports
cat packages/ui/src/index.ts | grep "useAnimation\|fadeInUp"

# If missing, add to index.ts:
echo "export { useAnimation, useReducedMotion } from './animation-context'" >> packages/ui/src/index.ts
```

### Issue: TypeScript errors in Phase 2

**Cause:** Relative imports conflict with monorepo paths  
**Fix:**
```bash
# Check for import issues
grep -r "from.*@/" packages/ui/src/*.tsx

# All should be relative paths:
sed -i '' 's|from "@/lib/|from "./|g' packages/ui/src/*.tsx
```

### Issue: Build fails in Phase 3

**Cause:** Bulk sed missed some imports  
**Fix:**
```bash
# Find remaining old imports
grep -r "@/components/common\|@/lib/animation" desktop/frontend/src/ --include="*.tsx"

# Fix manually or with sed targeting specific file:
sed -i '' 's|from "@/lib/animation|from "@treefrog/ui|g' <filename>
```

---

## Contact & Support

For issues during execution:
1. Check the detailed guide: `09-component-sharing.md`
2. Review desktop component source: `desktop/frontend/src/components/common/`
3. Check packages/ui structure: `packages/ui/src/`
4. Verify Radix UI docs for component details

---

## Next Steps (After Completion)

1. ✅ Update project documentation
2. ✅ Notify team of completed refactoring
3. ⏭️ Start web editor implementation using `@treefrog/ui`
4. ⏭️ Create tests for shared components
5. ⏭️ Add Storybook for component documentation

