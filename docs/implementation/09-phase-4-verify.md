# Phase 4: Verify & Cleanup

**Duration:** ~30 minutes  
**Risk:** LOW  
**Scope:** Delete old files, final verification, build testing

---

## Overview

This final phase removes the old desktop component directories and verifies everything still works:

1. Delete `desktop/frontend/src/components/common/` (if not already done)
2. Optionally delete old animation files from desktop/lib
3. Run full build (not just dev)
4. Smoke test the app
5. Verify no broken imports remain

---

## Step 4.1: Verify Old Directories Still Exist (If Any)

Check what's left in desktop/components/:

```bash
ls -la desktop/frontend/src/components/
```

Expected after Phase 3:
- `common/` directory might still exist (if there were app-specific components)
- `ui/` directory was deleted in Phase 1
- Other app-specific directories (pages, layouts, etc.)

---

## Step 4.2: Confirm @/components/common/ is Empty or App-Only

If `desktop/frontend/src/components/common/` still exists, check if it has only app-specific items:

```bash
ls -la desktop/frontend/src/components/common/
```

Items that should have been moved:
- Alert.tsx → GONE ✓
- Badge.tsx → GONE ✓
- Button.tsx → GONE ✓
- Card.tsx → GONE ✓
- Dialog.tsx → GONE ✓
- Input.tsx → GONE ✓
- LoadingSpinner.tsx → GONE ✓
- Select.tsx → GONE ✓
- Toggle.tsx → GONE ✓
- Menu/ → GONE ✓

Items that might remain:
- Any custom components specific to desktop app
- Layout components not shared with web
- App-specific wrappers

---

## Step 4.3: Delete desktop/components/common/ If Empty

If directory is now empty (all components moved):

```bash
rm -rf desktop/frontend/src/components/common/
```

Verify deletion:

```bash
ls desktop/frontend/src/components/common/ 2>&1
# Should output: No such file or directory
```

If directory has remaining app-specific components, keep it and proceed.

---

## Step 4.4: Clean Up Old Animation Files from Desktop (Optional)

The desktop app might still need these if animations are referenced elsewhere. Check:

```bash
grep -r "animation-context\|animations.ts\|animation-utils" desktop/frontend/src --include="*.tsx" | grep -v "@treefrog/ui"
```

Expected: 0 results (all should be importing from @treefrog/ui now)

If results found, verify they're not importing from:
- `@/lib/animation-context` → Should be `@treefrog/ui`
- `@/lib/animations` → Should be `@treefrog/ui`
- `@/lib/animation-utils` → Should be `@treefrog/ui`

If all imports updated, you can delete the old files:

```bash
rm -f desktop/frontend/src/lib/animation-context.tsx
rm -f desktop/frontend/src/lib/animations.ts
rm -f desktop/frontend/src/lib/animation-utils.ts
```

Verify deletion:

```bash
ls desktop/frontend/src/lib/ | grep animation
# Should output: nothing
```

**Note:** Keep `desktop/frontend/src/lib/` directory if it has other utilities.

---

## Step 4.5: Final Import Verification

Check no @/components/common imports remain anywhere:

```bash
grep -r "@/components/common\|from.*common/" desktop/frontend/src --include="*.tsx" | wc -l
# Should output: 0
```

Check no old animation imports remain:

```bash
grep -r "from.*@/lib/animation" desktop/frontend/src --include="*.tsx" | wc -l
# Should output: 0
```

Check all imports are from @treefrog/ui:

```bash
grep -r "from \"@treefrog/ui\|from '@treefrog/ui" desktop/frontend/src --include="*.tsx" | wc -l
# Should show: 35+
```

---

## Step 4.6: Type Check Full Desktop Build

Navigate to desktop:

```bash
cd desktop/frontend
```

Run full TypeScript check:

```bash
npx tsc --noEmit
```

Expected:
- ✅ 0 type errors
- ✅ All imports resolve
- ✅ No path resolution issues

---

## Step 4.7: Build Desktop (Full Build)

From project root:

```bash
make build
```

Or if manual:

```bash
cd desktop/frontend
npm run build
pnpm build
```

Expected:
- ✅ Build succeeds
- ✅ No build errors
- ✅ No missing module warnings
- ✅ Output generated

Watch for:
- "Cannot find module @treefrog/ui" → pnpm install needed
- "Port already in use" → Previous dev server still running
- Type errors → Check Phase 3 import updates

If build fails:
1. Check all TypeScript errors: `npx tsc --noEmit`
2. Verify animations properly imported in components
3. Ensure "use client" on all client components

---

## Step 4.8: Smoke Test Desktop App

Launch the built/dev app:

```bash
make dev
```

Or manually:

```bash
cd desktop/frontend
npm run dev
```

Test:

1. **App launches** ✓
2. **No console errors** ✓
3. **No import errors** ✓
4. **No network errors** ✓
5. **UI renders** ✓
6. **Animations work:**
   - [ ] Button hover animation
   - [ ] Card animations
   - [ ] Dialog/modal slide animation
   - [ ] Loading spinner
   - [ ] Badge pulse animation
7. **Reduced motion works:**
   - [ ] Open DevTools → Settings
   - [ ] Enable "Prefers reduced motion"
   - [ ] Reload page
   - [ ] Animations should be instant

---

## Step 4.9: Integration Test

Open the app and test key features:

```bash
# Examples (adjust based on your app)
1. Navigate to a page with buttons
2. Hover over button → Should animate
3. Open any dialog/modal → Should slide in
4. Create/load any item with card → Should fade in
5. Check loading states → Spinner should rotate
```

Expected:
- ✅ All animations smooth and responsive
- ✅ No jank or stuttering
- ✅ No console errors
- ✅ No performance issues

---

## Step 4.10: Verify No Duplicates

Ensure we don't have duplicate components anywhere:

```bash
# Check desktop/components/common still doesn't have old files
ls desktop/frontend/src/components/common/ 2>&1 | grep -E "Alert|Badge|Button|Card|Dialog|Input|Select|Toggle|Menu"
# Should output: nothing (directory gone or only app-specific files)

# Check desktop/lib no longer has animation files
ls desktop/frontend/src/lib/ | grep animation
# Should output: nothing
```

---

## Step 4.11: Verify packages/ui is Properly Exported

Ensure all components are available from @treefrog/ui:

```bash
# Check index.ts has all exports
cat packages/ui/src/index.ts | grep "export"
# Should show: 50+ export lines
```

Key exports to verify:
- [ ] AnimationProvider
- [ ] useAnimation hook
- [ ] useReducedMotion hook
- [ ] All animation variants (fadeInUp, cardHover, etc.)
- [ ] Alert, Badge, Button, Card, Dialog
- [ ] Input, Select, Toggle, LoadingSpinner
- [ ] Menu components (ContextMenuWrapper, DropdownMenuWrapper)

---

## Step 4.12: Document What Was Moved

Create/update a summary:

```bash
# Count lines moved
wc -l packages/ui/src/Alert.tsx packages/ui/src/Badge.tsx packages/ui/src/Button.tsx
wc -l packages/ui/src/animation-context.tsx packages/ui/src/animations.ts

# Verify directory structure
tree packages/ui/src -I "dist|node_modules"
```

---

## Step 4.13: Commit Phase 4

If all tests pass:

```bash
git add -A
git commit -m "Phase 4: Delete old desktop component directories, verify shared components working"
```

---

## Step 4.14: Create Migration Summary

Document the completed migration:

```bash
cat > MIGRATION_COMPLETE.md << 'EOF'
# Component Sharing Migration Complete ✅

## Summary
- Moved animation system to @treefrog/ui (foundation)
- Removed duplicate shadcn components from desktop
- Migrated 14 enhanced components to shared package
- Updated 35+ desktop files to use @treefrog/ui
- Verified desktop app functionality

## Files Moved
- 3 animation files (animation-context.tsx, animations.ts, animation-utils.ts)
- 14 enhanced components (Alert, Badge, Button, Card, Dialog, Input, LoadingSpinner, Select, Toggle, Menu components)
- Total: ~2,000 lines of code now shared

## Result
- ✅ Desktop app launches
- ✅ All animations work
- ✅ No console errors
- ✅ Reduced motion preference works
- ✅ Ready for web editor to use same components

## Next Steps
When building web editor, follow: docs/implementation/10-web-editor-setup.md
EOF
```

---

## Checkpoint: Phase 4 Complete

- [x] Old desktop component directories deleted
- [x] Old desktop animation files deleted
- [x] No old imports remain anywhere
- [x] Full TypeScript check passes
- [x] Full build completes successfully
- [x] Desktop app launches and runs
- [x] All animations work correctly
- [x] Reduced motion preference respected
- [x] No console errors or warnings
- [x] Smoke test passed

---

## Final Verification Checklist

```bash
# Run this full check sequence:

echo "=== Phase 4 Final Verification ==="

echo "✓ Checking old directories deleted..."
ls desktop/frontend/src/components/common/ 2>&1 | grep -q "No such file" && echo "  ✅ common/ deleted" || echo "  ⚠️  common/ still exists"

echo "✓ Checking old animation files deleted..."
[ ! -f desktop/frontend/src/lib/animation-context.tsx ] && echo "  ✅ animation files deleted" || echo "  ⚠️  animation files still exist"

echo "✓ Checking no old imports remain..."
grep -r "@/components/common\|@/lib/animation" desktop/frontend/src --include="*.tsx" | wc -l | grep -q "^0$" && echo "  ✅ 0 old imports found" || echo "  ⚠️  Old imports still present"

echo "✓ Checking shared imports present..."
grep -r "from \"@treefrog/ui\|from '@treefrog/ui" desktop/frontend/src --include="*.tsx" | wc -l | grep -qE "^[0-9]{2,}" && echo "  ✅ Multiple @treefrog/ui imports" || echo "  ⚠️  Few or no @treefrog/ui imports"

echo "✓ Type checking..."
cd desktop/frontend && npx tsc --noEmit 2>&1 | grep -q "error" && echo "  ⚠️  Type errors found" || echo "  ✅ Type check passes"
cd /Users/athulanoop/software_projects/treefrog

echo "=== Phase 4 Verification Complete ==="
```

---

## Success! 🎉

All phases complete. The Treefrog UI components are now:
- ✅ Shared between desktop and web
- ✅ Animation system properly extracted
- ✅ No code duplication
- ✅ Ready for web editor integration
- ✅ Desktop still fully functional

For next steps with web editor, see: `10-web-editor-setup.md`

