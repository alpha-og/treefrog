# Phase 3: Update Desktop Imports

**Duration:** ~1 hour  
**Risk:** MEDIUM  
**Scope:** Update 35+ files, verify types

---

## Overview

Now that all enhanced components are in `packages/ui`, desktop needs to import them from there instead of from `@/components/common/`.

This phase:
1. Find all imports from `@/components/common/`
2. Bulk replace with `@treefrog/ui`
3. Fix any remaining broken imports
4. Type check desktop build
5. Test desktop still launches

---

## Step 3.1: Find All Common Component References

Navigate to desktop frontend:

```bash
cd desktop/frontend/src
```

Count files importing from @/components/common:

```bash
grep -r "from.*@/components/common" . --include="*.tsx" | wc -l
```

Expected: 30-50 matches

List all files that need updating:

```bash
grep -r "from.*@/components/common" . --include="*.tsx" | cut -d: -f1 | sort -u
```

---

## Step 3.2: Update All Imports in Bulk

Replace all @/components/common imports with @treefrog/ui:

```bash
# Main replacement: @/components/common/* → @treefrog/ui
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/|from "@treefrog/ui"|g' {} \;

# Handle Menu wrapper imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Menu/|from "@treefrog/ui"|g' {} \;

# Handle index imports (if any files do this)
find . -name "*.tsx" -type f -exec sed -i '' \
  "s|from '@/components/common'|from '@treefrog/ui'|g" {} \;
```

Back to project root:

```bash
cd /Users/athulanoop/software_projects/treefrog
```

---

## Step 3.3: Consolidate Duplicate Imports

Some files might now have:

```typescript
import { Button } from "@treefrog/ui";
import { Card } from "@treefrog/ui";
import { Dialog } from "@treefrog/ui";
```

This is fine, but can be consolidated. Optional cleanup using script:

```bash
# Find files with multiple @treefrog/ui imports
grep -r "from \"@treefrog/ui\"" desktop/frontend/src --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

This shows which files have the most imports. No action needed—consolidation is optional.

---

## Step 3.4: Verify All Imports Updated

Check no old imports remain:

```bash
grep -r "@/components/common" desktop/frontend/src --include="*.tsx" | wc -l
# Should output: 0
```

Check all now use @treefrog/ui:

```bash
grep -r "from.*@treefrog/ui" desktop/frontend/src --include="*.tsx" | wc -l
# Should show: 35+
```

List a few examples:

```bash
grep -r "from.*@treefrog/ui" desktop/frontend/src --include="*.tsx" | head -5
```

---

## Step 3.5: Type Check Desktop Build

Navigate to desktop:

```bash
cd desktop/frontend
```

Run TypeScript check:

```bash
npx tsc --noEmit
```

Expected:
- ✅ 0 type errors
- ✅ No module resolution issues
- ✅ All @treefrog/ui imports resolve

If errors occur:

**"Cannot find module @treefrog/ui"**
- Check packages/ui/package.json has "exports" field
- Verify @treefrog/ui is in package.json dependencies (should be from monorepo)
- Run `pnpm install` from root

**"Property does not exist"**
- Component export mismatch—check packages/ui/src/index.ts exports match usage
- May need to add "use client" to component if it uses hooks

**Type errors in component imports**
- Component may need type exports in index.ts
- Common: Dialog exports multiple components (DialogContent, DialogTrigger, etc.)

---

## Step 3.6: Install Dependencies (if needed)

From project root:

```bash
pnpm install
```

This ensures @treefrog/ui is properly linked in monorepo.

---

## Step 3.7: Test Desktop Launch

From project root:

```bash
make dev
```

Expected:
- ✅ App launches without errors
- ✅ No import errors in console
- ✅ UI components render
- ✅ Animations work
- ✅ No console warnings about missing modules

Watch for errors like:
- "Cannot find module @/components/common"
- "Module not found @treefrog/ui"
- "useAnimation must be used within AnimationProvider" (means AnimationProvider not at app root)

---

## Step 3.8: Verify Desktop App Structure

Open app and verify:

1. **Check desktop still has @/components/common**

   ```bash
   ls desktop/frontend/src/components/common/
   ```

   This directory should still exist if there are app-specific components that weren't moved.

   OR it should NOT exist if all components were moved:

   ```bash
   ls desktop/frontend/src/components/common/ 2>&1
   # If "No such file or directory" → This is expected if all were moved
   ```

2. **Verify components render with animations**

   - Check any dialog or modal opens smoothly
   - Check button hover animations work
   - Check loading spinner spins
   - Check reduced motion preference is respected

---

## Step 3.9: Verify Animation Context in Desktop App

The `AnimationProvider` must wrap the app root. Check:

```bash
grep -r "AnimationProvider" desktop/frontend/src --include="*.tsx"
```

Expected: 1-2 results showing AnimationProvider wrapping app root (likely in main.tsx or App.tsx)

If NOT found, you need to add it:

1. Find app entry point (likely `desktop/frontend/src/main.tsx` or `App.tsx`)
2. Add to imports:
   ```typescript
   import { AnimationProvider } from "@treefrog/ui";
   ```
3. Wrap app root:
   ```typescript
   <AnimationProvider>
     <YourAppContent />
   </AnimationProvider>
   ```

---

## Step 3.10: Commit Phase 3

If everything works, commit:

```bash
git add -A
git commit -m "Phase 3: Update all desktop imports to use @treefrog/ui shared components"
```

---

## Checkpoint: Phase 3 Complete

- [x] All 35+ @/components/common imports replaced with @treefrog/ui
- [x] No old imports remain
- [x] TypeScript type checking passes
- [x] Desktop app launches without errors
- [x] No import errors in console
- [x] Animations work correctly
- [x] AnimationProvider wraps app root

**Next:** Phase 4 - Verify & Cleanup

---

## Troubleshooting

### Issue: "Cannot find module @treefrog/ui"

**Solution:**
1. Check `packages/ui/package.json` exists and is valid
2. Run `pnpm install` from root
3. Clear node_modules: `rm -rf node_modules && pnpm install`

### Issue: Type errors for imported components

**Solution:**
1. Check component has "use client" directive
2. Verify component export in packages/ui/src/index.ts
3. For compound components (Dialog, Select), ensure all sub-exports listed

### Issue: "useAnimation must be used within AnimationProvider"

**Solution:**
1. Verify AnimationProvider wraps app root
2. Check AnimationProvider imported from @treefrog/ui
3. Ensure provider is in correct location (not nested in component)

### Issue: Animations don't work

**Solution:**
1. Check motion library installed in packages/ui dependencies
2. Verify animation context provider active
3. Check browser doesn't have reduced motion enabled
4. Open DevTools → Settings → Check "Prefers reduced motion" is OFF

---

## Rollback (if needed)

```bash
git checkout desktop/frontend/src
# Re-run imports from Phase 2 if needed
```

