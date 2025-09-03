import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn";

export interface ToastProps {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  duration?: number;
  onClose: (id: string) => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  title,
  duration = 5000,
  onClose,
  className,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      classes:
        "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
      iconClasses: "text-green-400 dark:text-green-300",
    },
    error: {
      icon: AlertCircle,
      classes:
        "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
      iconClasses: "text-red-400 dark:text-red-300",
    },
    warning: {
      icon: AlertTriangle,
      classes:
        "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
      iconClasses: "text-yellow-400 dark:text-yellow-300",
    },
    info: {
      icon: Info,
      classes:
        "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
      iconClasses: "text-blue-400 dark:text-blue-300",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start p-4 border rounded-lg shadow-lg transition-all duration-300 ease-in-out",
        config.classes,
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <Icon
        className={cn("h-5 w-5 mr-3 mt-0.5 flex-shrink-0", config.iconClasses)}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm font-medium">{message}</p>
      </div>

      <button
        onClick={() => onClose(id)}
        className={cn(
          "ml-4 -mr-2 p-1 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10",
          config.iconClasses
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
