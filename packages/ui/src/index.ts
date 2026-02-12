// ============================================================================
// ANIMATION SYSTEM
// ============================================================================

export { 
  AnimationProvider, 
  useAnimation, 
  useReducedMotion, 
  useAnimationVariant, 
  useNestedAnimation, 
  useAnimationDuration 
} from './animation-context';

export type { 
  AnimationContextType, 
  AnimationProviderProps 
} from './animation-context';

export { 
  ANIMATION_DURATIONS, 
  ANIMATION_DELAYS, 
  fadeInUp, 
  fadeInDown, 
  fadeInLeft, 
  fadeInRight, 
  fadeIn, 
  scaleFade, 
  scaleIn, 
  slideInRight, 
  cardHover, 
  cardHoverGlow, 
  buttonPress, 
  buttonHover, 
  disabledState, 
  errorShake, 
  successPulse, 
  focusRing, 
  staggerContainer, 
  staggerItem, 
  tightStaggerContainer, 
  tightStaggerItem, 
  pageTransition, 
  backdropFade, 
  modalSlideUp, 
  spinner, 
  pulse, 
  subtlePulse, 
  shimmer, 
  glowPulse, 
  createSafeVariant, 
  calculateStaggerDelay, 
  mergeAnimationVariants,
  easeOutQuint,
  easeBounce,
  easeInOutQuad,
  easeOutCubic
} from './animations';

export { 
  calculateStaggerDelay as calculateStaggerDelayUtil, 
  createStaggerConfig, 
  getChildStaggerDelay, 
  createInstantVariant, 
  createVariantWithDuration, 
  createVariantWithDelay, 
  getAnimationState, 
  createLoadingAnimation, 
  getGPUAccelerationStyles, 
  isSafeToAnimate, 
  getOptimalDuration, 
  createAnimationProps, 
  createConfiguredVariant 
} from './animation-utils';

export type { 
  AnimationConfig 
} from './animation-utils';

// ============================================================================
// UI COMPONENTS
// ============================================================================

// Base components (from radix primitives)
export { Label } from './label';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Switch } from './switch';
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup } from './dropdown-menu';
export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup } from './context-menu';

// Enhanced components (desktop) - these override base versions where applicable
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, GlowCard } from './card';
export { Input } from './input';
export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog';
export { Select } from './select';
export { Skeleton } from './skeleton';
export { Alert } from './Alert';
export { Badge } from './Badge';
export { LoadingSpinner } from './LoadingSpinner';
export { Toggle } from './Toggle';

// ============================================================================
// MENU COMPONENTS
// ============================================================================

export { 
  DropdownMenuWrapper, 
  DropdownMenuContentWrapper, 
  MenuItem, 
  MenuCheckboxItem, 
  MenuRadioItem,
  useDropdownMenuWrapper
} from './menu/DropdownMenuWrapper';
export { ContextMenuWrapper } from './menu/ContextMenuWrapper';
export { MenuIcon } from './menu/MenuIcons';
export { MenuShortcut } from './menu/MenuShortcut';