import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-2.5 transition-all text-xs font-medium animate-fadeIn ${
            t.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : t.type === 'error'
              ? 'bg-red-950/95 border-red-500/40 text-red-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

          <div className="flex-1 leading-snug">{t.message}</div>

          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
