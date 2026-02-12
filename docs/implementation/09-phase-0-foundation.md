# Phase 0: Foundation - Extract Animation Utilities

**Duration:** ~30 minutes  
**Risk:** LOW  
**Checkpoint:** Desktop app still launches

---

## Step 0.1: Copy Animation Context

```bash
# From project root
cp desktop/frontend/src/lib/animation-context.tsx packages/ui/src/
cp desktop/frontend/src/lib/animations.ts packages/ui/src/
cp desktop/frontend/src/lib/animation-utils.ts packages/ui/src/
```

Verify files exist:
```bash
ls -la packages/ui/src/animation-context.tsx
ls -la packages/ui/src/animations.ts
ls -la packages/ui/src/animation-utils.ts
```

---

## Step 0.2: Update packages/ui/package.json

Add motion dependency:

```bash
cd packages/ui
```

Edit `package.json` and add to dependencies:
```json
{
  "dependencies": {
    "motion": "^12.34.0",
    "lucide-react": "^0.563.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0"
  }
}
```

Then install:
```bash
pnpm install
```

---

## Step 0.3: Update packages/ui/src/index.ts

Replace entire file with:

```typescript
"use client"

// Animation system exports
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
  easeOutQuint,
  easeBounce,
  easeInOutQuad,
  easeOutCubic,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  scaleIn,
  spinner,
  cardHover,
  cardHoverGlow,
  subtlePulse,
  staggerContainer,
  tightStaggerContainer,
  staggerItem,
  tightStaggerItem,
  fadeInScale,
  backdropFade,
  modalSlideUp,
  errorShake,
  createSafeVariant,
} from './animations'

// Base UI components (existing)
export { Button, buttonVariants } from './button'
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
export { Input } from './input'
export { Label } from './label'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Switch } from './switch'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog'
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup } from './dropdown-menu'
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from './select'
export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup } from './context-menu'
export { Skeleton } from './skeleton'

// Utilities
export { cn } from './utils'
```

---

## Step 0.4: Update Desktop Imports

Replace all desktop imports from `@/lib/animation-*` with `@treefrog/ui`:

```bash
cd desktop/frontend/src

# Update animation-context imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-context"|from "@treefrog/ui"|g' {} \;

# Update animations imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animations"|from "@treefrog/ui"|g' {} \;

# Update animation-utils imports
find . -name "*.tsx" -type f -exec sed -i '' \
  's|from "@/lib/animation-utils"|from "@treefrog/ui"|g' {} \;
```

---

## Step 0.5: Verify Phase 0

Check no old animation imports remain in desktop:
```bash
grep -r "from.*@/lib/animation" desktop/frontend/src/ | wc -l
# Should output: 0
```

Check all animation imports come from @treefrog/ui:
```bash
grep -r "useAnimation\|fadeInUp\|ANIMATION_DURATIONS" desktop/frontend/src/ | grep "@treefrog/ui" | wc -l
# Should show: 5+
```

---

## Step 0.6: Test Desktop Build

Launch desktop app:
```bash
make dev
```

Expected output:
```
✅ App launches without errors
✅ All animations work
✅ No console errors about missing modules
```

If errors occur, check:
1. Animation imports correctly updated
2. packages/ui has motion in dependencies
3. TypeScript errors in animation files

---

## Checkpoint: Phase 0 Complete

- [x] Animation context extracted to packages/ui
- [x] Animation definitions extracted to packages/ui
- [x] Animation utils extracted to packages/ui
- [x] packages/ui/package.json updated with motion
- [x] packages/ui/src/index.ts exports animations
- [x] All desktop imports updated to @treefrog/ui
- [x] Desktop app launches and animations work
- [x] No import errors

**Next:** Phase 1 - Remove Duplicate Components

