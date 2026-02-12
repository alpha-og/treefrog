# Component Sharing Architecture: Overview

## What & Why

**Goal:** Migrate 14 enhanced desktop UI components to a shared `@treefrog/ui` package so both desktop and future web editor can use identical components.

**Why:** 
- Single source of truth for UI components
- Consistent animations across platforms
- 1,700+ lines of animation code not duplicated
- Future web editor gets polished UI immediately

**Status:** Ready for execution (4 phases, ~2 hours)

---

## High-Level Architecture

```
Before:
├── desktop/frontend/src/components/
│   ├── ui/                    (12 duplicate shadcn components)
│   ├── common/                (14 enhanced components - DESKTOP ONLY)
│   └── lib/animation*         (Animation system - DESKTOP ONLY)
├── packages/ui/src/           (12 basic components)
└── website/                   (Marketing site - no complex UI)

After:
├── desktop/frontend/src/components/
│   └── [remaining app-specific components]
├── packages/ui/src/           (26 components + animation system - SHARED)
└── website/                   (Same - uses basic components only)
```

---

## What's Moving

### Animation System (Foundation)
- `animation-context.tsx` - React context provider
- `animations.ts` - 200+ lines of animation variants
- `animation-utils.ts` - Helper functions

### Enhanced Components (14 total)
| Component | Lines | Type |
|-----------|-------|------|
| Button | 128 | Motion-enhanced |
| Card | 234 | Stagger animations, glow effect |
| Dialog | 155 | Modal with slide animations |
| Alert | 255 | Notification with animations |
| Badge | 102 | Pulse animations |
| Toggle | 145 | Switch with spring |
| LoadingSpinner | 98 | Animated spinner |
| Input | 150+ | Error animations, icons |
| Select | 150+ | Animation variants |
| Menu Wrappers | 500+ | Context + dropdown menus |

**Total: 1,700+ lines moved**

---

## Critical Issues Addressed

| Issue | Solution |
|-------|----------|
| Animation context coupling | Extract to packages/ui as foundation |
| Duplicate components | Remove desktop/components/ui entirely |
| Import path chaos | Bulk update to @treefrog/ui |
| Missing exports | Comprehensive index.ts export list |
| Animation tightly coupled | Move all animation utils together |
| Desktop-specific paths | Convert to relative imports in packages/ui |

---

## Phase Summary

| Phase | Goal | Time | Risk | Doc |
|-------|------|------|------|-----|
| **0** | Extract animation utilities | 30 min | LOW | `09-phase-0-foundation.md` |
| **1** | Remove duplicate components/ui | 1 hour | MEDIUM | `09-phase-1-remove-duplicates.md` |
| **2** | Migrate 14 components | 2 hours | MEDIUM | `09-phase-2-migrate-components.md` |
| **3** | Update desktop imports | 1 hour | MEDIUM | `09-phase-3-update-imports.md` |
| **4** | Verify & cleanup | 30 min | LOW | `09-phase-4-verify.md` |
| **TOTAL** | **All phases** | **~5 hours** | **MEDIUM** | — |

---

## Next Steps

1. **Phase 0:** Extract animation utilities → See `09-phase-0-foundation.md`
2. **Phase 1:** Remove duplicates → See `09-phase-1-remove-duplicates.md`
3. **Phase 2:** Migrate components → See `09-phase-2-migrate-components.md`
4. **Phase 3:** Update imports → See `09-phase-3-update-imports.md`
5. **Phase 4:** Verify & cleanup → See `09-phase-4-verify.md`

**Quick reference:** See `11-quick-reference.md` for all commands

---

## Key Files Referenced

- Main implementation guide split into phases (09-phase-0 through 09-phase-4)
- Web setup guide for future: `10-web-editor-setup.md`
- Quick reference with bash commands: `11-quick-reference.md`
- Original comprehensive plan: `09-component-sharing.md`

---

## Success Criteria

After all 4 phases:

✅ Desktop app launches and runs  
✅ All animations work correctly  
✅ No console errors  
✅ No import errors  
✅ TypeScript type checking passes  
✅ Reduced motion preference works  

---

## Rollback Strategy

If any phase fails:
```bash
git log --oneline -10
git reset --hard <last-known-good-commit>
```

**Recommended:** Commit after each successful phase.

