# Web Editor Implementation: Shared UI Components Guide

## Overview

This guide explains how to use the shared `@treefrog/ui` component library in the future web editor implementation. All components, animations, and utilities have been migrated from the desktop app to enable both platforms to use the same UI system.

**Target Audience:** Web editor developers  
**Prerequisite:** Read `09-component-sharing.md` first  
**Components Available:** 13 enhanced UI components + animation system

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @treefrog/ui @treefrog/types @treefrog/services @treefrog/hooks
npm install motion lucide-react @radix-ui/* tailwindcss
```

### 2. Setup Tailwind CSS

The component library uses Tailwind CSS with `oklch` color space. Ensure your project has:

**tailwind.config.ts:**
```typescript
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@treefrog/ui/dist/**/*.js',
  ],
  theme: {
    extend: {
      // Uses oklch color space
      colors: {
        primary: 'oklch(var(--color-primary) / <alpha-value>)',
        secondary: 'oklch(var(--color-secondary) / <alpha-value>)',
        // ... other colors
      },
    },
  },
}
```

### 3. Setup Animation Provider

Wrap your entire app with the `AnimationProvider`:

**app.tsx or main.tsx:**
```typescript
import { AnimationProvider } from '@treefrog/ui'

export default function App() {
  return (
    <AnimationProvider initialAnimationsEnabled={true} initialIntensity="normal">
      {/* Your app content */}
    </AnimationProvider>
  )
}
```

### 4. Use Components

```typescript
import { 
  Button, 
  Card, 
  CardContent,
  Input,
  Dialog,
  useAnimation 
} from '@treefrog/ui'

export function Editor() {
  const [open, setOpen] = useState(false)
  const { animationsEnabled } = useAnimation()

  return (
    <div>
      <Card>
        <CardContent>
          <Input placeholder="Filename" />
          <Button onClick={() => setOpen(true)}>
            Open Compiler Settings
          </Button>
        </CardContent>
      </Card>

      <Dialog 
        open={open} 
        onOpenChange={setOpen}
      >
        <h2>Compiler Settings</h2>
      </Dialog>
    </div>
  )
}
```

---

## Available Components

### Core Components

#### Button
**Purpose:** Primary action trigger with animations  
**Features:** Variants, sizes, loading state, animations

```typescript
import { Button } from '@treefrog/ui'

<Button variant="default" size="default">
  Compile
</Button>

<Button variant="destructive">
  Delete
</Button>

<Button loading loadingText="Compiling...">
  Submit
</Button>
```

**Props:**
- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- `size`: "default" | "sm" | "lg" | "icon"
- `loading`: boolean
- `loadingText`: string
- `animationDisabled`: boolean
- `disabled`: boolean

---

#### Card / GlowCard
**Purpose:** Container with optional glow effect and animations  
**Features:** Stagger animations, hover effects, glow variant

```typescript
import { Card, CardHeader, CardTitle, CardContent, GlowCard } from '@treefrog/ui'

<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

<GlowCard animated glow>
  {/* Highlighted card with glow effect */}
</GlowCard>
```

**Props:**
- `glow`: boolean - Add glow effect
- `lift`: boolean - Hover lift animation
- `animated`: boolean - Enable animations
- `staggerChildren`: boolean - Stagger child animation
- `disableHover`: boolean - Disable hover animations
- `clickable`: boolean - Show cursor pointer

---

#### Dialog
**Purpose:** Modal dialog with slide-up animations  
**Features:** Backdrop fade, content slide, close button

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@treefrog/ui'
import { useState } from 'react'

export function SettingsDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Settings</Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        {/* Content */}
      </Dialog>
    </>
  )
}
```

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `animated`: boolean

---

#### Input
**Purpose:** Text input with label, error, icon support  
**Features:** Error animations, optional icon, loading state

```typescript
import { Input } from '@treefrog/ui'

<Input
  label="Project Name"
  placeholder="Enter project name"
  error={error}
  description="Used for file naming"
  icon={FolderIcon}
/>

<Input
  label="Compiling..."
  loading
/>
```

**Props:**
- `label`: string
- `description`: string
- `error`: string
- `icon`: React component
- `loading`: boolean
- `animated`: boolean

---

#### Select
**Purpose:** Dropdown select with animation  
**Features:** Groups, error state, options or children

```typescript
import { Select } from '@treefrog/ui'

<Select
  label="Compiler Version"
  options={[
    { value: "v1", label: "TeX Live 2024" },
    { value: "v2", label: "TeX Live 2023" },
  ]}
/>

<Select label="Output Format">
  <option value="pdf">PDF</option>
  <option value="dvi">DVI</option>
</Select>
```

**Props:**
- `label`: string
- `options`: Array<{ value, label, group? }>
- `error`: string
- `animated`: boolean

---

#### Alert / Toast
**Purpose:** Notification containers  
**Features:** Variant styling, animations, auto-close

```typescript
import { Alert, Toast } from '@treefrog/ui'

<Alert variant="success" title="Success" message="File compiled" />

<Alert variant="error" title="Error" message="Compilation failed" onClose={handleClose} />

<Toast 
  variant="warning" 
  id="1"
  message="Long compilation time"
  onClose={handleClose}
/>
```

**Props:**
- `variant`: "info" | "success" | "warning" | "error"
- `title`: string (optional)
- `message`: string
- `onClose`: () => void (optional)
- `animated`: boolean

---

#### Badge
**Purpose:** Small label component  
**Features:** Multiple variants, pulse animation

```typescript
import { Badge } from '@treefrog/ui'

<Badge variant="success">Compiled</Badge>
<Badge variant="warning" pulse>Processing</Badge>
<Badge variant="info">Default</Badge>
```

**Props:**
- `variant`: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
- `pulse`: boolean
- `animated`: boolean

---

#### Toggle
**Purpose:** Binary switch component  
**Features:** Spring animation, color variants, sizes

```typescript
import { Toggle } from '@treefrog/ui'

<Toggle
  label="Auto Compile"
  description="Compile on file save"
  size="md"
  color="primary"
/>
```

**Props:**
- `label`: string
- `description`: string
- `size`: "sm" | "md" | "lg"
- `color`: "primary" | "secondary" | "success" | "warning" | "error"
- `animated`: boolean

---

#### LoadingSpinner
**Purpose:** Animated loading indicator  
**Features:** Multiple sizes, color variants

```typescript
import { LoadingSpinner } from '@treefrog/ui'

<LoadingSpinner size="md" variant="primary" />

<LoadingSpinner 
  size="sm" 
  variant="inherit" 
  label="Compiling..." 
/>
```

**Props:**
- `size`: "xs" | "sm" | "md" | "lg"
- `variant`: "primary" | "secondary" | "destructive" | "muted" | "inherit"
- `label`: string (optional)
- `inline`: boolean

---

#### Menu Components
**Purpose:** Context and dropdown menus  
**Features:** Animation, keyboard shortcuts, icons

```typescript
import {
  ContextMenuWrapper,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@treefrog/ui'

// Context Menu (right-click)
<ContextMenuWrapper>
  <ContextMenuTrigger>
    <div>Right-click here</div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Rename</ContextMenuItem>
    <ContextMenuItem destructive>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenuWrapper>

// Dropdown Menu
<DropdownMenuWrapper>
  <DropdownMenuTrigger asChild>
    <Button>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Open</DropdownMenuItem>
    <DropdownMenuItem>Save</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuWrapper>
```

---

## Animation System

### AnimationProvider

Controls animations globally for your app:

```typescript
import { AnimationProvider } from '@treefrog/ui'

<AnimationProvider
  initialAnimationsEnabled={true}
  initialIntensity="normal"
>
  <App />
</AnimationProvider>
```

**Props:**
- `initialAnimationsEnabled`: boolean (default: true)
- `initialIntensity`: "fast" | "normal" | "slow" (default: "normal")

---

### useAnimation Hook

Access animation settings in your components:

```typescript
import { useAnimation } from '@treefrog/ui'

export function MyComponent() {
  const { 
    animationsEnabled,           // boolean
    intensity,                   // "fast" | "normal" | "slow"
    prefersReducedMotion,        // boolean (system preference)
    getDuration,                 // (base?: number) => number
    setAnimationsEnabled,        // (enabled: boolean) => void
    setIntensity,                // (intensity: string) => void
  } = useAnimation()

  return (
    <div>
      {animationsEnabled && <span>Animations enabled</span>}
    </div>
  )
}
```

---

### useReducedMotion Hook

Detect user's motion preference:

```typescript
import { useReducedMotion } from '@treefrog/ui'

export function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <SimpleComponent /> // No animations
  }

  return <AnimatedComponent />
}
```

---

### Animation Variants

Use pre-built animation variants with Motion:

```typescript
import { fadeInUp, cardHover, ANIMATION_DURATIONS } from '@treefrog/ui'
import { motion } from 'motion/react'

<motion.div
  initial="initial"
  animate="animate"
  variants={fadeInUp}
>
  Content
</motion.div>
```

**Available variants:**
- `fadeInUp` - Fade in from bottom
- `fadeInDown` - Fade in from top
- `fadeInLeft` - Fade in from left
- `fadeInRight` - Fade in from right
- `slideInLeft` - Slide in from left
- `slideInRight` - Slide in from right
- `scaleIn` - Scale entrance
- `cardHover` - Card hover effect
- `cardHoverGlow` - Card glow hover
- `staggerContainer` - Container for staggered children
- `staggerItem` - Child stagger item
- And more...

**Animation durations:**
```typescript
import { ANIMATION_DURATIONS } from '@treefrog/ui'

ANIMATION_DURATIONS.fast      // 0.15s
ANIMATION_DURATIONS.normal    // 0.3s
ANIMATION_DURATIONS.slow      // 0.4s
ANIMATION_DURATIONS.verySlow  // 0.5s
```

---

## Animation Configuration

### Disable Animations (Global)
```typescript
const { setAnimationsEnabled } = useAnimation()

// In settings
<Toggle 
  label="Enable animations"
  onChange={(e) => setAnimationsEnabled(e.target.checked)}
/>
```

### Per-Component Animation Control
```typescript
// Disable animation for this button
<Button animated={false}>
  Don't animate me
</Button>

// Disable animation for this card
<Card animated={false}>
  Static card
</Card>
```

### Custom Animation Timing
```typescript
const { setIntensity } = useAnimation()

// Change global speed
<Select onChange={(e) => setIntensity(e.target.value)}>
  <option value="fast">Fast</option>
  <option value="normal">Normal</option>
  <option value="slow">Slow</option>
</Select>
```

---

## Styling & Customization

### CSS Variables (Tailwind oklch)

Components use CSS variables for theming:

```css
:root {
  --color-primary: ...
  --color-secondary: ...
  --color-destructive: ...
  /* ... other colors ... */
}
```

### Component Customization

Pass custom classes using `className`:

```typescript
<Button className="rounded-full shadow-lg">
  Custom Button
</Button>

<Card className="border-4 border-red-500">
  Custom Card
</Card>
```

### Tailwind Integration

All components work with Tailwind utilities:

```typescript
<Button className="w-full py-4 text-xl">
  Full Width Button
</Button>
```

---

## Common Patterns

### Form with Input & Button

```typescript
import { Input, Button, Alert } from '@treefrog/ui'
import { useState } from 'react'

export function ProjectForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await createProject(name)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <Alert variant="error" message={error} onClose={() => setError('')} />
      )}
      <Input
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
      />
      <Button loading={loading} onClick={handleSubmit}>
        Create Project
      </Button>
    </>
  )
}
```

### Settings Dialog

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@treefrog/ui'

export function SettingsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Settings controls */}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button>Save</Button>
      </div>
    </Dialog>
  )
}
```

### Loading Notifications

```typescript
import { Toast, LoadingSpinner } from '@treefrog/ui'

export function CompileStatus() {
  return (
    <Toast
      variant="info"
      message={
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Compiling...</span>
        </div>
      }
    />
  )
}
```

---

## Performance Tips

1. **Memoize Contexts:** Wrap expensive components with `React.memo`
2. **Lazy Load Dialogs:** Only render dialog content when open
3. **Disable Animations on Low-End Devices:** Check `prefers-reduced-motion`
4. **Use Production Builds:** Motion library is optimized for production
5. **Bundle Analysis:** Monitor component library size in your build

---

## Troubleshooting

### Components not animating

**Check:**
1. Is `AnimationProvider` wrapping your app?
2. Are animations enabled? `useAnimation().animationsEnabled`
3. Is `prefers-reduced-motion` enabled in system settings?

**Solution:**
```typescript
<AnimationProvider initialAnimationsEnabled={true}>
  {/* Wrap entire app */}
</AnimationProvider>
```

### Styling issues

**Check:**
1. Is Tailwind CSS configured?
2. Are `@radix-ui` dependencies installed?
3. Do CSS variables exist?

**Solution:**
```bash
npm install tailwindcss @radix-ui/react-* lucide-react motion
```

### Type errors

**Check:**
1. TypeScript version compatible?
2. Are types properly exported from @treefrog/ui?

**Solution:**
```bash
npm install @treefrog/types
npx tsc --version  # Should be 5.0+
```

---

## Migration from Desktop Code

If adapting code from desktop app:

1. **Imports:** Change `@/components/common/*` to `@treefrog/ui`
2. **Animation Context:** Wrap root with `AnimationProvider`
3. **Styling:** Ensure Tailwind & CSS variables configured
4. **Types:** Use `@treefrog/types` for shared types
5. **Hooks:** Use `@treefrog/hooks` for custom hooks

---

## API Reference Summary

| Component | Import | Key Props | Animated |
|-----------|--------|-----------|----------|
| Button | `@treefrog/ui` | `variant`, `size`, `loading` | ✅ |
| Card | `@treefrog/ui` | `glow`, `lift`, `staggerChildren` | ✅ |
| Dialog | `@treefrog/ui` | `open`, `onOpenChange` | ✅ |
| Input | `@treefrog/ui` | `label`, `error`, `icon` | ✅ |
| Select | `@treefrog/ui` | `label`, `options` | ✅ |
| Alert/Toast | `@treefrog/ui` | `variant`, `title`, `message` | ✅ |
| Badge | `@treefrog/ui` | `variant`, `pulse` | ✅ |
| Toggle | `@treefrog/ui` | `label`, `size`, `color` | ✅ |
| LoadingSpinner | `@treefrog/ui` | `size`, `variant`, `label` | ✅ |
| ContextMenu | `@treefrog/ui` | `children` | ✅ |
| DropdownMenu | `@treefrog/ui` | `children` | ✅ |

---

## Links & Resources

- **Component Library:** `packages/ui/`
- **Animation System:** `packages/ui/src/animations.ts`
- **Desktop Example:** `desktop/frontend/src/components/`
- **Shared Types:** `packages/types/`
- **Shared Services:** `packages/services/`
- **Shared Hooks:** `packages/hooks/`

---

## Getting Help

**Issues with components?**
- Check desktop implementation in `desktop/frontend/src/components/`
- Review Radix UI documentation for base primitives
- Check Motion library docs for animation details

**Contributing changes?**
- Update components in `packages/ui/`
- Both desktop and web automatically get changes
- Add tests before committing

---

## Document History

| Date | Author | Status | Notes |
|------|--------|--------|-------|
| 2026-02-12 | OpenCode | Draft | Initial web setup guide |
