import { type Variants, type Transition } from "motion/react";

// Standard easing curves
export const easeOutQuint: Transition["ease"] = [0.23, 1, 0.32, 1];
export const easeBounce: Transition["ease"] = [0.34, 1.56, 0.64, 1];

// Fade in from bottom
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  }
};

// Fade in only
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  }
};

// Scale fade for modals/dialogs
export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { 
      duration: 0.15, 
      ease: easeOutQuint 
    }
  }
};

// Slide in from right (for toasts/sidebars)
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  }
};

// Card hover effect
export const cardHover: Variants = {
  rest: { 
    y: 0, 
    boxShadow: "0 4px 20px -8px oklch(0 0 0 / 0.15)" 
  },
  hover: { 
    y: -4, 
    boxShadow: "0 12px 32px -10px oklch(0 0 0 / 0.2)",
    transition: { 
      duration: 0.3, 
      ease: "easeOut" 
    }
  }
};

// Button press effect
export const buttonPress: Variants = {
  rest: { scale: 1 },
  press: { 
    scale: 0.98,
    transition: { 
      duration: 0.1, 
      ease: easeOutQuint 
    }
  }
};

// Stagger container for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Stagger item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  }
};

// Page transition
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  }
};

// Modal backdrop
export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: 0.2 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.15 
    }
  }
};

// Modal content slide up
export const modalSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { 
      duration: 0.2, 
      ease: easeOutQuint 
    }
  }
};

// Loading spinner
export const spinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Pulse animation for loading states
export const pulse: Variants = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Glow pulse for cards
export const glowPulse: Variants = {
  rest: {
    boxShadow: "0 0 0 0 oklch(0 0 0 / 0)"
  },
  hover: {
    boxShadow: [
      "0 0 0 0 oklch(0.65 0.15 30 / 0.1)",
      "0 0 20px 2px oklch(0.65 0.15 30 / 0.15)",
      "0 0 0 0 oklch(0.65 0.15 30 / 0.1)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
