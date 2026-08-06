import React from 'react';
import { useToast } from '../../hooks/useToast';
import { AlertTriangle, Info, Check, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const bgVariant =
          t.variant === 'bad'
            ? 'bg-red-600 text-white'
            : t.variant === 'warn'
            ? 'bg-amber-600 text-white'
            : t.variant === 'ok'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-900 text-white';

        const ToastIcon =
          t.variant === 'bad'
            ? AlertTriangle
            : t.variant === 'warn'
            ? Info
            : Check;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${bgVariant} fade-in`}
          >
            <div className="flex items-center gap-2">
              <ToastIcon className="w-4 h-4 text-white" />
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/70 hover:text-white p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
