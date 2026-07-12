import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

/**
 * MEP-light™ — Toast Notification System
 * 
 * Lightweight, zero-dependency toast notifications.
 * Variants: success, warning, error, info
 * Auto-dismiss with configurable duration.
 */

type ToastVariant = "success" | "warning" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if outside provider — log to console
    return {
      toast: (m) => console.log(`[Toast] ${m}`),
      success: (m) => console.log(`[Toast:success] ${m}`),
      warning: (m) => console.warn(`[Toast:warning] ${m}`),
      error: (m) => console.error(`[Toast:error] ${m}`),
      info: (m) => console.log(`[Toast:info] ${m}`),
    };
  }
  return ctx;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: "bg-emerald-950/80",
    border: "border-emerald-700/40",
    text: "text-emerald-300",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: "bg-amber-950/80",
    border: "border-amber-700/40",
    text: "text-amber-300",
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    bg: "bg-red-950/80",
    border: "border-red-700/40",
    text: "text-red-300",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    bg: "bg-blue-950/80",
    border: "border-blue-700/40",
    text: "text-blue-300",
  },
};

interface ToastItemViewProps {
  key?: React.Key;
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastItemView({
  item,
  onDismiss,
}: ToastItemViewProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = VARIANT_CONFIG[item.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(item.id), 300);
    }, item.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-lg max-w-sm transition-all duration-300 ${config.bg} ${config.border} ${
        isExiting
          ? "opacity-0 translate-x-8 scale-95"
          : "opacity-100 translate-x-0 scale-100"
      }`}
      style={{
        animation: isExiting ? "none" : "toastSlideIn 0.3s ease-out",
      }}
    >
      <span className={config.text}>{config.icon}</span>
      <p className={`text-sm font-medium flex-1 ${config.text}`}>
        {item.message}
      </p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(item.id), 300);
        }}
        className="text-slate-500 hover:text-slate-300 transition p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration: number = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration, createdAt: Date.now() }]);
    },
    []
  );

  const contextValue: ToastContextValue = {
    toast: addToast,
    success: useCallback((m: string) => addToast(m, "success", 3000), [addToast]),
    warning: useCallback((m: string) => addToast(m, "warning", 5000), [addToast]),
    error: useCallback((m: string) => addToast(m, "error", 6000), [addToast]),
    info: useCallback((m: string) => addToast(m, "info", 4000), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
