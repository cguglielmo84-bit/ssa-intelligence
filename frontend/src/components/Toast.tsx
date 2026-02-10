import React, { useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />,
  success: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
  info: <Info size={16} className="text-brand-500 flex-shrink-0" />,
};

const BG: Record<ToastType, string> = {
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-brand-50 border-brand-200 text-brand-800',
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'error', duration = 4000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    if (toasts.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right duration-300 ${BG[toast.type]}`}
          >
            {ICONS[toast.type]}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  }, [toasts, dismiss]);

  return { showToast, ToastContainer };
};
