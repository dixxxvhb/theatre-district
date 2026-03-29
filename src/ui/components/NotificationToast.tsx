// Toast notification system for Broadway Tycoon
// Displays a stack of auto-dismissing messages at bottom-right.

import { useState, useEffect, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'money';
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
        const colorClasses = {
          info: 'bg-gray-900/95 border-gray-700/50 text-gray-200',
          success: 'bg-emerald-950/95 border-emerald-800/50 text-emerald-200',
          warning: 'bg-amber-950/95 border-amber-800/50 text-amber-200',
          error: 'bg-red-950/95 border-red-800/50 text-red-200',
          money: 'bg-emerald-950/95 border-emerald-700/50 text-emerald-300',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border backdrop-blur-sm shadow-xl
              text-sm font-medium animate-[slideIn_0.2s_ease-out]
              ${colorClasses[toast.type]}
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
