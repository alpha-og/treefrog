import * as React from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInUp } from "@/lib/animations";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  info: "bg-primary/10 border-primary/30 text-primary",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-600",
  error: "bg-destructive/10 border-destructive/30 text-destructive",
};

const variantIcons: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = "info", title, message, onClose, className }, ref) => {
    const Icon = variantIcons[variant];
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 rounded-xl border p-4",
          variantStyles[variant],
          className
        )}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        layout
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
          )}
          <p className="text-sm opacity-90">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    );
  }
);
Alert.displayName = "Alert";

// Toast notification component
interface ToastProps extends AlertProps {
  id: string;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, variant = "info", title, message, onClose, className }, ref) => {
    const Icon = variantIcons[variant];
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 rounded-xl border p-4 shadow-lg min-w-[320px] max-w-[420px]",
          variant === "info" && "bg-card border-primary/20",
          variant === "success" && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
          variant === "warning" && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
          variant === "error" && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
          className
        )}
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        layout
      >
        <div className={cn(
          "shrink-0 p-1.5 rounded-full",
          variant === "info" && "bg-primary/10 text-primary",
          variant === "success" && "bg-emerald-500/10 text-emerald-600",
          variant === "warning" && "bg-amber-500/10 text-amber-600",
          variant === "error" && "bg-destructive/10 text-destructive",
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn(
              "font-semibold text-sm mb-1",
              variant === "info" && "text-foreground",
              variant === "success" && "text-emerald-800 dark:text-emerald-200",
              variant === "warning" && "text-amber-800 dark:text-amber-200",
              variant === "error" && "text-red-800 dark:text-red-200",
            )}>
              {title}
            </h4>
          )}
          <p className={cn(
            "text-sm",
            variant === "info" && "text-muted-foreground",
            variant === "success" && "text-emerald-700 dark:text-emerald-300",
            variant === "warning" && "text-amber-700 dark:text-amber-300",
            variant === "error" && "text-red-700 dark:text-red-300",
          )}>
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    );
  }
);
Toast.displayName = "Toast";

export { Alert, Toast, type AlertVariant };
