# Phase 1: Remove Duplicate Components

**Duration:** ~1 hour  
**Risk:** MEDIUM  
**Scope:** Update 50+ files, delete duplicate directory

---

## Step 1.1: Find All References

Count files that import from @/components/ui:
```bash
grep -r "from.*@/components/ui" desktop/frontend/src --include="*.tsx" | wc -l
```

Expected: 40-60 matches

List all files:
```bash
grep -r "from.*@/components/ui" desktop/frontend/src --include="*.tsx" | cut -d: -f1 | sort -u
```

---

## Step 1.2: Update All Imports

Navigate to desktop frontend:
```bash
cd desktop/frontend/src
```

Update all imports using bulk sed:
```bash
# Replace all @/components/ui/* imports with @treefrog/ui
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/|from "@treefrog/ui"|g' {} \;

# Handle relative imports if any
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "\./components/ui/|from "@treefrog/ui"|g' {} \;

# Handle index imports
find . -name "*.tsx" -type f -exec sed -i '' \
  "s|from '@/components/ui'|from '@treefrog/ui'|g" {} \;
```

---

## Step 1.3: Verify Import Updates

Check no old imports remain:
```bash
grep -r "@/components/ui" . --include="*.tsx" | wc -l
# Should output: 0
```

Check imports now use @treefrog/ui:
```bash
grep -r "from.*@treefrog/ui" . --include="*.tsx" | head -10
# Should show: many matches
```

---

## Step 1.4: Delete Duplicate Directory

Verify directory exists:
```bash
ls -la desktop/frontend/src/components/ui/
```

Expected to see:
- button.tsx
- card.tsx
- dialog.tsx
- dropdown-menu.tsx
- context-menu.tsx
- select.tsx
- input.tsx
- label.tsx
- skeleton.tsx
- switch.tsx
- tabs.tsx
- sonner.tsx
- utils.ts
- index.ts

Delete the directory:
```bash
rm -rf desktop/frontend/src/components/ui/
```

Verify deletion:
```bash
ls desktop/frontend/src/components/ui/ 2>&1
# Should output: No such file or directory
```

---

## Step 1.5: Type Check

Navigate back to project root:
```bash
cd /Users/athulanoop/software_projects/treefrog
```

Run TypeScript check:
```bash
cd desktop/frontend
npx tsc --noEmit
```

Expected: 0 errors

If errors occur, check:
1. All imports updated to @treefrog/ui
2. No remaining references to deleted directory
3. TypeScript version compatibility

---

## Step 1.6: Test Desktop Build

Launch desktop dev mode:
```bash
make dev
```

Expected:
- ✅ App launches
- ✅ No import errors
- ✅ All UI components render
- ✅ No console errors

Watch for errors like:
- "Cannot find module @/components/ui"
- "Cannot find module ./components/ui"

---

## Step 1.7: Verify Phase 1

Confirm duplicate directory gone:
```bash
ls desktop/frontend/src/components/
# Should NOT show "ui" directory
```

Confirm no broken imports:
```bash
grep -r "@/components/ui\|./components/ui" desktop/frontend/src/ | wc -l
# Should output: 0
```

Confirm all components use shared package:
```bash
grep "from \"@treefrog/ui\"" desktop/frontend/src/components/*.tsx | wc -l
# Should show: 10+
```

---

## Checkpoint: Phase 1 Complete

- [x] All 50+ @/components/ui imports updated
- [x] desktop/frontend/src/components/ui/ directory deleted
- [x] No remaining broken imports
- [x] TypeScript type checking passes
- [x] Desktop app launches without errors
- [x] No import errors in console

**Next:** Phase 2 - Migrate Enhanced Components

