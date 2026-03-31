// Toast notification system for Broadway Tycoon
// Displays a stack of auto-dismissing messages at bottom-right.

import { useState, useEffect, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'money' | 'rival' | 'trend' | 'danger' | 'achievement';
}

const TOAST_DURATION = 3000; // ms
const MAX_TOASTS = 5;

// Global toast state — subscribers pattern so any code can push toasts
type ToastListener = (toasts: Toast[]) => void;

let globalToasts: Toast[] = [];
const listeners: Set<ToastListener> = new Set();

function notifyListeners() {
  for (const listener of listeners) {
    listener([...globalToasts]);
  }
}

/**
 * Push a toast notification from anywhere in the app.
 */
export function pushToast(message: string, type: Toast['type'] = 'info'): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    message,
    type,
  };

  globalToasts = [...globalToasts, toast].slice(-MAX_TOASTS);
  notifyListeners();

  // Auto-dismiss
  setTimeout(() => {
    globalToasts = globalToasts.filter((t) => t.id !== toast.id);
    notifyListeners();
  }, TOAST_DURATION);
}

/**
 * Toast container component — renders the stack.
 */
export function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    globalToasts = globalToasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
          info: { bg: 'bg-blue-900/80', border: 'border-blue-700/40', text: 'text-blue-200' },
          money: { bg: 'bg-amber-900/80', border: 'border-amber-600/40', text: 'text-amber-200' },
          rival: { bg: 'bg-purple-900/80', border: 'border-purple-600/40', text: 'text-purple-200' },
          trend: { bg: 'bg-orange-900/80', border: 'border-orange-600/40', text: 'text-orange-200' },
          danger: { bg: 'bg-red-900/80', border: 'border-red-600/40', text: 'text-red-200' },
          achievement: { bg: 'bg-yellow-900/80', border: 'border-yellow-500/40', text: 'text-yellow-200' },
          warning: { bg: 'bg-amber-900/80', border: 'border-amber-600/40', text: 'text-amber-200' },
          success: { bg: 'bg-emerald-900/80', border: 'border-emerald-600/40', text: 'text-emerald-200' },
          error: { bg: 'bg-red-900/80', border: 'border-red-600/40', text: 'text-red-200' },
        };

        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border backdrop-blur-sm shadow-xl
              text-sm font-medium animate-[slideIn_0.2s_ease-out]
              ${style.bg} ${style.border} ${style.text}
            `}
            onClick={() => dismiss(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
