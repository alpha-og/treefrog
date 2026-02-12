# Phase 2: Migrate Enhanced Components

**Duration:** ~2 hours  
**Risk:** MEDIUM  
**Scope:** Move 14 components + fix imports

---

## Overview

This phase moves all 14 enhanced components from `desktop/frontend/src/components/common/` to `packages/ui/src/`. This is the largest phase but straightforward:

1. Copy all 14 components to packages/ui/src/
2. Add "use client" directive to each
3. Fix relative imports within components
4. Update packages/ui/src/index.ts with new exports
5. Build and verify types

---

## Step 2.1: List All Components to Migrate

From project root, verify all components exist:

```bash
ls -la desktop/frontend/src/components/common/
```

Expected files:
- `Alert.tsx`
- `Badge.tsx`
- `Button.tsx`
- `Card.tsx`
- `Dialog.tsx`
- `Input.tsx`
- `LoadingSpinner.tsx`
- `Select.tsx`
- `Toggle.tsx`
- `Menu/` directory with:
  - `ContextMenuWrapper.tsx`
  - `DropdownMenuWrapper.tsx`
  - `MenuIcons.tsx`
  - `MenuShortcut.tsx`

---

## Step 2.2: Copy Components to packages/ui

Create Menu subdirectory in packages/ui:

```bash
mkdir -p packages/ui/src/menu
```

Copy all components (excluding Menu subdirectory first):

```bash
cp desktop/frontend/src/components/common/Alert.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Badge.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Button.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Card.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Dialog.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Input.tsx packages/ui/src/
cp desktop/frontend/src/components/common/LoadingSpinner.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Select.tsx packages/ui/src/
cp desktop/frontend/src/components/common/Toggle.tsx packages/ui/src/
```

Copy Menu subdirectory components:

```bash
cp desktop/frontend/src/components/common/Menu/ContextMenuWrapper.tsx packages/ui/src/menu/
cp desktop/frontend/src/components/common/Menu/DropdownMenuWrapper.tsx packages/ui/src/menu/
cp desktop/frontend/src/components/common/Menu/MenuIcons.tsx packages/ui/src/menu/
cp desktop/frontend/src/components/common/Menu/MenuShortcut.tsx packages/ui/src/menu/
```

Verify all files copied:

```bash
ls packages/ui/src/*.tsx | wc -l
# Should show: 17+ (existing components + new ones)
ls packages/ui/src/menu/
# Should show: 4 files
```

---

## Step 2.3: Add "use client" Directive

Each component needs "use client" at the top for Next.js compatibility. We'll use bulk sed:

```bash
# Add "use client" to all new component files
cd packages/ui/src

for file in Alert.tsx Badge.tsx Button.tsx Card.tsx Dialog.tsx Input.tsx LoadingSpinner.tsx Select.tsx Toggle.tsx; do
  if grep -q '"use client"' "$file"; then
    echo "✓ $file already has use client"
  else
    # Add "use client" as first line
    sed -i '' '1s/^/"use client";\n/' "$file"
    echo "✓ Added use client to $file"
  fi
done

# Add "use client" to Menu components
cd menu
for file in *.tsx; do
  if grep -q '"use client"' "$file"; then
    echo "✓ $file already has use client"
  else
    sed -i '' '1s/^/"use client";\n/' "$file"
    echo "✓ Added use client to $file"
  fi
done

cd /Users/athulanoop/software_projects/treefrog
```

Verify "use client" added:

```bash
head -1 packages/ui/src/Alert.tsx
# Should show: "use client";

head -1 packages/ui/src/menu/ContextMenuWrapper.tsx
# Should show: "use client";
```

---

## Step 2.4: Fix Internal Imports Within Components

Each component likely has imports like:
- `from "@/lib/animation-context"` → Should become relative or from @treefrog/ui
- `from "@/components/ui/button"` → Should become relative imports within packages/ui
- `from "../../../lib/animations"` → Should become from @treefrog/ui

Navigate to packages/ui/src:

```bash
cd packages/ui/src
```

Fix animation imports:

```bash
# Replace animation context imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context"|from "./animation-context"|g' {} \;

# Replace animations.ts imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animations"|from "./animations"|g' {} \;

# Replace animation-utils imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-utils"|from "./animation-utils"|g' {} \;

# Replace relative animation imports (in case they exist)
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "\.\./\.\./\.\./lib/animation-context"|from "./animation-context"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "\.\./\.\./\.\./lib/animations"|from "./animations"|g' {} \;
```

Fix internal component imports (between UI components):

```bash
# Replace @/components/ui imports with relative imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/button"|from "./button"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/card"|from "./card"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/dialog"|from "./dialog"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/input"|from "./input"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/select"|from "./select"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/dropdown-menu"|from "./dropdown-menu"|g' {} \;

find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/ui/context-menu"|from "./context-menu"|g' {} \;

# Handle Menu imports
find menu -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/components/common/Menu/|from "./|g' {} \;
```

Fix any shadcn component imports that reference @treefrog/ui directly:

```bash
# These should work as-is, but verify paths are correct
find . -name "*.tsx" -type f -exec grep -l "from \"@treefrog/ui\"" {} \;
# Should show Menu component files if they import wrappers
```

Back to project root:

```bash
cd /Users/athulanoop/software_projects/treefrog
```

---

## Step 2.5: Update packages/ui/src/index.ts

Read current index.ts:

```bash
cat packages/ui/src/index.ts
```

You should add exports for:
- All animation utilities (context, animations, utils)
- All 14 enhanced components
- Menu components

Edit `packages/ui/src/index.ts` and add:

```typescript
// Animation System
export { AnimationProvider, useAnimation, useReducedMotion, useAnimationVariant, useNestedAnimation, useAnimationDuration } from "./animation-context";
export { ANIMATION_DURATIONS, ANIMATION_DELAYS, fadeInUp, fadeInDown, fadeInLeft, fadeInRight, fadeIn, scaleFade, scaleIn, slideInRight, cardHover, cardHoverGlow, buttonPress, buttonHover, disabledState, errorShake, successPulse, focusRing, staggerContainer, staggerItem, tightStaggerContainer, tightStaggerItem, pageTransition, backdropFade, modalSlideUp, spinner, pulse, subtlePulse, shimmer, glowPulse, createSafeVariant, calculateStaggerDelay, mergeAnimationVariants, easeOutQuint, easeBounce, easeInOutQuad, easeOutCubic } from "./animations";
export type { AnimationContextType, AnimationProviderProps, AnimationConfig } from "./animation-context";
export { calculateStaggerDelay as calculateStaggerDelayUtil, createStaggerConfig, getChildStaggerDelay, createInstantVariant, createVariantWithDuration, createVariantWithDelay, getAnimationState, createLoadingAnimation, getGPUAccelerationStyles, isSafeToAnimate, getOptimalDuration, createAnimationProps, createConfiguredVariant } from "./animation-utils";
export type { AnimationConfig as AnimationConfigType } from "./animation-utils";

// Enhanced Components
export { Alert } from "./Alert";
export { Badge } from "./Badge";
export { Button } from "./Button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./Card";
export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./Dialog";
export { Input } from "./Input";
export { LoadingSpinner } from "./LoadingSpinner";
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from "./Select";
export { Toggle, ToggleGroup } from "./Toggle";

// Menu Components
export { ContextMenuWrapper } from "./menu/ContextMenuWrapper";
export { DropdownMenuWrapper } from "./menu/DropdownMenuWrapper";
export { MenuIcons } from "./menu/MenuIcons";
export { MenuShortcut } from "./menu/MenuShortcut";
```

**Note:** Use the actual component export names. Check each file's default/named exports.

---

## Step 2.6: Type Check packages/ui Build

Build the UI package:

```bash
cd packages/ui
npm run build
```

Or if using TypeScript directly:

```bash
cd packages/ui
npx tsc --noEmit
```

Expected:
- ✅ 0 type errors
- ✅ Successful build or type check passes

If errors occur, common issues:
- Missing "use client" directive in component
- Broken relative imports (check paths match file structure)
- Animation imports pointing to wrong location
- Missing exports in index.ts

---

## Step 2.7: Verify No Import Loops

Check for circular dependencies:

```bash
cd packages/ui
npm ls 2>&1 | grep "ERR\|circular"
# Should show: nothing
```

---

## Step 2.8: Quick Desktop Test (Without Changing Imports Yet)

Don't update desktop imports yet—just verify nothing broke in packages/ui:

```bash
cd desktop/frontend
npm ls @treefrog/ui 2>&1
# Should show: @treefrog/ui installed
```

---

## Checkpoint: Phase 2 Complete

- [x] All 14 components copied to packages/ui/src/
- [x] Menu subdirectory created with 4 components
- [x] "use client" directive added to all components
- [x] All internal imports fixed (animation, component refs)
- [x] packages/ui/src/index.ts updated with comprehensive exports
- [x] TypeScript type checking passes
- [x] No circular dependency issues
- [x] packages/ui builds successfully

**Next:** Phase 3 - Update Desktop Imports

---

## Rollback (if needed)

```bash
# Delete copied components
rm -rf packages/ui/src/Alert.tsx packages/ui/src/Badge.tsx packages/ui/src/Button.tsx packages/ui/src/Card.tsx packages/ui/src/Dialog.tsx packages/ui/src/Input.tsx packages/ui/src/LoadingSpinner.tsx packages/ui/src/Select.tsx packages/ui/src/Toggle.tsx
rm -rf packages/ui/src/menu/

# Restore old index.ts (if backed up)
git checkout packages/ui/src/index.ts
```

