'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = TOAST_CONFIG[toast.type];

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl shadow-lg p-4 animate-slide-up`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${config.iconBg}`}>
          <config.icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.titleColor}`}>{toast.title}</p>
          {toast.message && (
            <p className={`text-xs mt-1 ${config.messageColor}`}>{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className={`p-1 ${config.closeColor} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-signal-down-bg',
    border: 'border-signal-down/20',
    iconBg: 'bg-signal-down/20',
    iconColor: 'text-signal-down',
    titleColor: 'text-signal-down',
    messageColor: 'text-signal-down/80',
    closeColor: 'text-signal-down',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-signal-up-bg',
    border: 'border-signal-up/20',
    iconBg: 'bg-signal-up/20',
    iconColor: 'text-signal-up',
    titleColor: 'text-signal-up',
    messageColor: 'text-signal-up/80',
    closeColor: 'text-signal-up',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
    messageColor: 'text-amber-400/80',
    closeColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-brand/10',
    border: 'border-brand/20',
    iconBg: 'bg-brand/20',
    iconColor: 'text-brand-light',
    titleColor: 'text-brand-light',
    messageColor: 'text-brand-light/80',
    closeColor: 'text-brand-light',
  },
};
